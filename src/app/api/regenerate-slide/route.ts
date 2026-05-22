import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCarouselContent } from '@/lib/carousel/generator'
import { renderSlide } from '@/lib/carousel/renderer'
import type { BrandColors, CompanyContext, MediaItem, RenderProfile, Template } from '@/lib/carousel/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { post_id, slide_index } = await req.json()

    if (!post_id || slide_index == null) {
      return NextResponse.json({ error: 'post_id e slide_index são obrigatórios' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch post
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const MAX_REGENS = 3
    if ((post.regen_count ?? 0) >= MAX_REGENS) {
      return NextResponse.json(
        { error: `Limite de ${MAX_REGENS} regenerações por post atingido.` },
        { status: 402 }
      )
    }

    const companyId: string = post.company_id

    // ── Fetch original job params to preserve tone/theme/template ─────────────
    const { data: job } = await supabase
      .from('generation_jobs')
      .select('params')
      .eq('post_id', post_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const jobParams = job?.params as {
      theme?: string
      tone?: string
      slidesCount?: number
      template?: Template
    } | null

    // Use original job params; fall back to post.template or defaults
    const theme    = jobParams?.theme      ?? 'conteúdo geral'
    const tone     = (jobParams?.tone      ?? 'educational') as 'educational' | 'motivational' | 'promotional' | 'journalistic' | 'engagement'
    const slidesCount = jobParams?.slidesCount ?? (Array.isArray(post.content) ? post.content.length : 7)
    const template: Template = (jobParams?.template ?? post.template ?? 'classic') as Template

    // ── Fetch context, media, company, instagram token ────────────────────────
    const [{ data: ctx }, { data: media }, { data: company }, { data: igToken }] = await Promise.all([
      supabase.from('company_context').select('*').eq('company_id', companyId).single(),
      supabase.from('media_library').select('id, url, category, description').eq('company_id', companyId).limit(20),
      supabase.from('companies').select('name').eq('id', companyId).single(),
      supabase.from('instagram_tokens').select('instagram_username, profile_picture_url').eq('company_id', companyId).maybeSingle(),
    ])

    if (!ctx) return NextResponse.json({ error: 'Contexto não encontrado' }, { status: 404 })

    const brandColors: BrandColors = (ctx as CompanyContext).brand_colors ?? {
      primary: '#6C3FE8',
      secondary: '#E84393',
      accent: '#A855F7',
    }

    const logoUrl: string | undefined = (ctx as CompanyContext).logo_url ?? undefined

    // Build profile for editorial/news template header
    const profile: RenderProfile = {
      companyName:     company?.name ?? (ctx as CompanyContext).business_name ?? 'SocialMind',
      instagramHandle: igToken?.instagram_username ?? undefined,
      profilePicUrl:   igToken?.profile_picture_url ?? undefined,
    }

    // ── Regenerate the slide content using Claude ─────────────────────────────
    const carousel = await generateCarouselContent(
      ctx as CompanyContext,
      (media ?? []) as MediaItem[],
      theme,
      tone,
      slidesCount
    )

    const slideData = carousel.slides[slide_index] ?? carousel.slides[0]
    const totalSlides: number = (post.content as unknown[])?.length ?? carousel.slides.length

    // ── Convert logo URL to data URI if needed ────────────────────────────────
    let logoDataUri: string | undefined
    if (logoUrl) {
      try {
        const res = await fetch(logoUrl)
        const buf = await res.arrayBuffer()
        const mime = res.headers.get('content-type') ?? 'image/png'
        logoDataUri = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
      } catch { /* skip logo on fetch failure */ }
    }

    // ── Render slide preserving original template + profile ───────────────────
    const buffer = await renderSlide(slideData, brandColors, slide_index + 1, totalSlides, logoDataUri, template, profile)

    // ── Upload new PNG ────────────────────────────────────────────────────────
    const path = `slides/${companyId}/${post_id}/slide-${slide_index + 1}.png`
    const { error: upErr } = await supabase.storage
      .from('slides')
      .upload(path, buffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(upErr.message)

    const { data: urlData } = supabase.storage.from('slides').getPublicUrl(path)
    const newUrl = urlData.publicUrl + `?t=${Date.now()}`

    // ── Update post in DB ─────────────────────────────────────────────────────
    const currentImages: string[] = Array.isArray(post.slides_images) ? post.slides_images : []
    currentImages[slide_index] = newUrl

    await supabase.from('posts').update({
      slides_images: currentImages,
      content:       carousel.slides,
      regen_count:   (post.regen_count ?? 0) + 1,
    }).eq('id', post_id)

    return NextResponse.json({
      success:     true,
      url:         newUrl,
      slide:       slideData,
      regens_used: (post.regen_count ?? 0) + 1,
      regens_left: MAX_REGENS - ((post.regen_count ?? 0) + 1),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
