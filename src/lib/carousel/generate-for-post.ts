import type { SupabaseClient } from '@supabase/supabase-js'
import { generateCarouselContent, type WeekPlanItem } from './generator'
import { renderAllSlides } from './renderer'
import type { BrandColors } from './types'

export async function generateForPost(
  supabase: SupabaseClient,
  postId: string,
  companyId: string,
  scheduleId: string | null,
  callerLabel = 'generate',
  batchAngle?: WeekPlanItem,
): Promise<void> {
  let theme = 'Conteúdo geral'
  let tone: 'educational' | 'motivational' | 'promotional' = 'educational'
  let slidesCount = 7
  let publishMode: 'automatic' | 'review' = 'review'

  if (scheduleId) {
    const { data: schedule } = await supabase
      .from('post_schedules')
      .select('publish_mode, slides_count, content_themes(theme_name, tone, slides_count)')
      .eq('id', scheduleId)
      .single()

    if (schedule) {
      publishMode = schedule.publish_mode ?? 'review'
      if (schedule.slides_count) slidesCount = schedule.slides_count
      const ct = schedule.content_themes as unknown as { theme_name: string; tone: string; slides_count: number } | null
      if (ct) {
        theme = ct.theme_name
        tone = ct.tone as typeof tone
        if (!schedule.slides_count) slidesCount = ct.slides_count ?? 7
      }
    }
  }

  const { data: ctx, error: ctxErr } = await supabase
    .from('company_context')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (ctxErr || !ctx) throw new Error(`Contexto da empresa não encontrado para ${companyId}`)

  const { data: media } = await supabase
    .from('media_library')
    .select('id, url, category, description')
    .eq('company_id', companyId)
    .limit(20)

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content')
    .eq('company_id', companyId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(5)

  const recentTopics = (recentPosts ?? [])
    .map(p => {
      const slides = Array.isArray(p.content) ? p.content : []
      return (slides[0] as { title?: string })?.title ?? ''
    })
    .filter(Boolean)

  const brandColors: BrandColors = ctx.brand_colors ?? {
    primary: '#6C3FE8',
    secondary: '#E84393',
    accent: '#A855F7',
  }

  const { data: company } = await supabase
    .from('companies')
    .select('credits_balance, credits_limit')
    .eq('id', companyId)
    .single()

  if (company && company.credits_balance < slidesCount) {
    throw new Error(`Créditos insuficientes (${company.credits_balance} disponíveis, ${slidesCount} necessários). Aguarde a renovação ou faça upgrade.`)
  }

  const logoUrl: string | undefined = ctx.logo_url ?? undefined

  const carousel = await generateCarouselContent(ctx, media ?? [], theme, tone, slidesCount, recentTopics, batchAngle)
  const buffers  = await renderAllSlides(carousel.slides, brandColors, logoUrl)
  const status   = publishMode === 'review' ? 'waiting' : 'approved'

  await supabase.from('posts').update({
    content:      carousel.slides,
    slides_html:  carousel.slides.map(() => null),
    slides_images: [],
    caption:      carousel.caption,
    status,
  }).eq('id', postId)

  const imageUrls = await Promise.all(
    buffers.map(async (buf, i) => {
      const path = `slides/${companyId}/${postId}/slide-${i + 1}.png`
      await supabase.storage.from('slides').upload(path, buf, { contentType: 'image/png', upsert: true })
      return supabase.storage.from('slides').getPublicUrl(path).data.publicUrl
    })
  )

  await supabase.from('posts').update({ slides_images: imageUrls }).eq('id', postId)

  try {
    await supabase.rpc('deduct_credits', { p_company_id: companyId, p_amount: carousel.slides.length })
  } catch (e) {
    console.error(`[${callerLabel}] deduct_credits falhou (não fatal):`, e)
  }

  await supabase.from('notifications').insert({
    company_id: companyId,
    type:       'post_ready',
    message:    `Carrossel "${batchAngle?.topic ?? theme}" gerado com ${carousel.slides.length} slides.`,
    read:       false,
  })
}
