import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderSlide } from '@/lib/carousel/renderer'
import type { BrandColors, CompanyContext, SlideContent, Template } from '@/lib/carousel/types'

export const runtime    = 'nodejs'
export const maxDuration = 60

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// POST /api/swap-image
// body: { post_id, slide_index, image_url }
// → re-renders the slide with the new imageUrl, uploads new PNG, updates DB
export async function POST(req: NextRequest) {
  try {
    const { post_id, slide_index, image_url } = await req.json()

    if (!post_id || slide_index == null || !image_url) {
      return NextResponse.json(
        { error: 'post_id, slide_index e image_url são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('id, company_id, content, slides_images, unsplash_credits, template')
      .eq('id', post_id)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const companyId: string = post.company_id
    const slides: SlideContent[] = Array.isArray(post.content) ? post.content as SlideContent[] : []

    if (slide_index < 0 || slide_index >= slides.length) {
      return NextResponse.json({ error: 'slide_index fora do range' }, { status: 400 })
    }

    const { data: ctx } = await supabase
      .from('company_context')
      .select('*')
      .eq('company_id', companyId)
      .single()

    const brandColors: BrandColors = (ctx as CompanyContext | null)?.brand_colors ?? {
      primary: '#6C3FE8',
      secondary: '#E84393',
      accent: '#A855F7',
    }

    const logoUrl: string | undefined = (ctx as CompanyContext | null)?.logo_url ?? undefined

    // Update the slide with the new imageUrl
    const updatedSlide: SlideContent = { ...slides[slide_index], imageUrl: image_url }
    const updatedSlides = slides.map((s, i) => i === slide_index ? updatedSlide : s)

    const postTemplate: Template = (post.template as Template | null) ?? 'classic'

    // Re-render the slide
    const buffer = await renderSlide(updatedSlide, brandColors, slide_index + 1, slides.length, logoUrl, postTemplate)

    // Upload new PNG (overwrite existing)
    const path = `slides/${companyId}/${post_id}/slide-${slide_index + 1}.png`
    const { error: upErr } = await supabase.storage
      .from('slides')
      .upload(path, buffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(upErr.message)

    const { data: urlData } = supabase.storage.from('slides').getPublicUrl(path)
    const newUrl = urlData.publicUrl + `?t=${Date.now()}`

    // Update slides_images array and content in DB
    const currentImages: string[] = Array.isArray(post.slides_images) ? post.slides_images : []
    currentImages[slide_index] = newUrl

    await supabase.from('posts').update({
      slides_images: currentImages,
      content:       updatedSlides,
    }).eq('id', post_id)

    return NextResponse.json({ success: true, url: newUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[swap-image]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
