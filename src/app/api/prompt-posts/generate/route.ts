import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import {
  HEADLINE_STYLES,
  renderCover, renderContent, renderCta,
  urlToDataUri,
  type HeadlineStyle,
} from '@/lib/prompt-posts/renderer'

export const runtime     = 'nodejs'
export const maxDuration = 300

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface GeneratedContent {
  headline:    string
  subtitle:    string
  cta_word:    string
  prompt_text: string
  slides: { title: string; points: string[] }[]
}

async function generateContent(topic: string, slidesCount: number): Promise<GeneratedContent> {
  const contentSlides = slidesCount - 2 // minus cover and cta

  const msg = await anthropic.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Você é um especialista em conteúdo viral para Instagram, especializado em posts de prompts e IA no estilo @maestroprompts.

Crie um post carrossel sobre: "${topic}"

RETORNE APENAS JSON VÁLIDO (sem markdown, sem texto extra):
{
  "headline": "TÍTULO EM CAPS QUE PROMETE TRANSFORMAÇÃO (máx 80 chars, impactante)",
  "subtitle": "Complemento do título explicando o benefício (máx 70 chars)",
  "cta_word": "PALAVRA que o usuário vai comentar para receber (1 palavra, ex: PROMPT, IA, COPY)",
  "prompt_text": "O prompt/conteúdo completo e valioso que será entregue via direct para quem comentar (300-500 chars, seja específico e útil)",
  "slides": [
    {
      "title": "🚀 TÍTULO DA SEÇÃO COM EMOJI",
      "points": ["Ponto 1 claro e objetivo", "Ponto 2", "Ponto 3"]
    }
  ]
}

REGRAS:
- headline DEVE ser em CAPS e provocar curiosidade/urgência
- Gere EXATAMENTE ${contentSlides} slides de conteúdo (estruturados em etapas, regras, lógica)
- Cada slide: 3-5 bullets específicos e valiosos
- prompt_text deve ser o conteúdo REAL que o usuário vai receber no direct — não genérico
- cta_word deve ser uma única palavra impactante relacionada ao conteúdo`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const json = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(json) as GeneratedContent
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      companyId:      string
      topic:          string
      headlineStyleId: string
      coverImageUrl?: string
      slidesCount:    number
    }

    const { companyId, topic, headlineStyleId, coverImageUrl, slidesCount = 7 } = body

    if (!companyId || !topic) {
      return NextResponse.json({ error: 'companyId e topic são obrigatórios' }, { status: 400 })
    }

    const supabase = adminClient()

    // Fetch Instagram profile for avatar/username
    const { data: token } = await supabase
      .from('instagram_tokens')
      .select('instagram_username, profile_picture_url')
      .eq('company_id', companyId)
      .maybeSingle()

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const profile = {
      username:    token?.instagram_username ?? 'seuperfil',
      displayName: company?.name ?? 'Seu Perfil',
      avatarDataUri: token?.profile_picture_url
        ? await urlToDataUri(token.profile_picture_url)
        : undefined,
    }

    // Resolve headline style
    const style: HeadlineStyle = HEADLINE_STYLES.find(s => s.id === headlineStyleId) ?? HEADLINE_STYLES[0]

    // Fetch cover image data URI if provided
    const coverImageDataUri = coverImageUrl ? await urlToDataUri(coverImageUrl) : undefined

    // Generate content with AI
    const content = await generateContent(topic, slidesCount)

    // Create post record
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert({
        company_id: companyId,
        status:     'draft',
        template:   'prompt',
        caption:    `${content.headline}\n\nComenta "${content.cta_word}" que eu te mando no direct! 👇`,
        content:    [],
        slides_images: [],
      })
      .select('id')
      .single()

    if (postErr || !post) throw new Error('Erro ao criar post')

    const postId = post.id

    // Render all slides
    const totalSlides = 1 + content.slides.length + 1
    const buffers: Buffer[] = []

    // Cover
    buffers.push(await renderCover({
      coverImageDataUri,
      headline: content.headline,
      subtitle: content.subtitle,
      style,
      profile,
    }))

    // Content slides
    for (let i = 0; i < content.slides.length; i++) {
      const s = content.slides[i]
      buffers.push(await renderContent({
        title:       s.title,
        points:      s.points,
        slideNumber: i + 2,
        totalSlides,
        profile,
      }))
    }

    // CTA slide
    buffers.push(await renderCta({
      ctaWord:  content.cta_word,
      ctaText:  'Quer receber o prompt completo?',
      profile,
    }))

    // Upload slides to storage
    const slideUrls: string[] = []
    for (let i = 0; i < buffers.length; i++) {
      const path = `slides/${companyId}/${postId}/slide-${i + 1}.png`
      const { error: uploadErr } = await supabase.storage
        .from('slides')
        .upload(path, buffers[i], { contentType: 'image/png', upsert: true })

      if (uploadErr) throw new Error(`Upload slide ${i + 1}: ${uploadErr.message}`)

      const { data: { publicUrl } } = supabase.storage.from('slides').getPublicUrl(path)
      slideUrls.push(publicUrl)
    }

    // Update post with images
    await supabase
      .from('posts')
      .update({ slides_images: slideUrls, updated_at: new Date().toISOString() })
      .eq('id', postId)

    // Save generation metadata
    await supabase.from('generation_jobs').insert({
      post_id:    postId,
      company_id: companyId,
      status:     'completed',
      params: {
        topic,
        headlineStyleId,
        coverImageUrl: coverImageUrl ?? null,
        slidesCount,
        template: 'prompt',
        headlineStyle: style,
      },
    }).catch(() => {})

    return NextResponse.json({
      postId,
      slideUrls,
      promptText:  content.prompt_text,
      headline:    content.headline,
      ctaWord:     content.cta_word,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[prompt-posts/generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
