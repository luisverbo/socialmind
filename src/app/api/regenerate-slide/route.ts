import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCarouselContent } from '@/lib/carousel/generator'
import { renderSlide } from '@/lib/carousel/renderer'
import type { BrandColors, CompanyContext, MediaItem } from '@/lib/carousel/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { post_id, slide_index, theme, tone, slides_count } = await req.json()

    if (!post_id || slide_index == null) {
      return NextResponse.json({ error: 'post_id e slide_index são obrigatórios' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch post + company context
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*, companies(id)')
      .eq('id', post_id)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const companyId: string = post.company_id

    const [{ data: ctx }, { data: media }] = await Promise.all([
      supabase.from('company_context').select('*').eq('company_id', companyId).single(),
      supabase.from('media_library').select('id, url, category, description').eq('company_id', companyId).limit(20),
    ])

    if (!ctx) return NextResponse.json({ error: 'Contexto não encontrado' }, { status: 404 })

    const brandColors: BrandColors = (ctx as CompanyContext).brand_colors ?? {
      primary: '#6C3FE8',
      secondary: '#E84393',
      accent: '#A855F7',
    }

    // Regenerate only the specific slide using Claude
    const carousel = await generateCarouselContent(
      ctx as CompanyContext,
      (media ?? []) as MediaItem[],
      theme ?? 'conteúdo geral',
      tone ?? 'educational',
      slides_count ?? 7
    )

    const slideData = carousel.slides[slide_index] ?? carousel.slides[0]
    const totalSlides: number = (post.content as unknown[])?.length ?? carousel.slides.length

    const buffer = await renderSlide(slideData, brandColors, slide_index + 1, totalSlides)

    // Upload new PNG
    const path = `slides/${companyId}/${post_id}/slide-${slide_index + 1}.png`
    const { error: upErr } = await supabase.storage
      .from('slides')
      .upload(path, buffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(upErr.message)

    const { data: urlData } = supabase.storage.from('slides').getPublicUrl(path)
    const newUrl = urlData.publicUrl + `?t=${Date.now()}`

    // Update slides_images array in DB
    const currentImages: string[] = Array.isArray(post.slides_images) ? post.slides_images : []
    currentImages[slide_index] = newUrl

    await supabase.from('posts').update({
      slides_images: currentImages,
      content: carousel.slides,
    }).eq('id', post_id)

    return NextResponse.json({ success: true, url: newUrl, slide: slideData })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
