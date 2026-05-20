import { createClient } from '@supabase/supabase-js'
import { generateCarouselContent } from './generator'
import { renderAllSlides } from './renderer'
import { withSemaphore } from './queue'
import type { GenerateCarouselInput, CompanyContext, MediaItem, BrandColors } from './types'

const TIMEOUT_MS = 60_000
const MAX_RETRIES = 3

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout após ${ms / 1000}s`)), ms)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return result
  } catch (err) {
    clearTimeout(timer!)
    throw err
  }
}

async function fetchContext(supabase: ReturnType<typeof getSupabaseAdmin>, companyId: string): Promise<CompanyContext> {
  const { data, error } = await supabase
    .from('company_context')
    .select('*')
    .eq('company_id', companyId)
    .single()
  if (error || !data) throw new Error(`Contexto da empresa não encontrado: ${error?.message}`)
  return data as CompanyContext
}

async function fetchMediaItems(supabase: ReturnType<typeof getSupabaseAdmin>, companyId: string): Promise<MediaItem[]> {
  const { data } = await supabase
    .from('media_library')
    .select('id, url, category, description')
    .eq('company_id', companyId)
    .limit(20)
  return (data ?? []) as MediaItem[]
}

async function uploadSlide(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  buffer: Buffer,
  companyId: string,
  postId: string,
  index: number
): Promise<string> {
  const path = `slides/${companyId}/${postId}/slide-${index + 1}.png`
  const { error } = await supabase.storage
    .from('slides')
    .upload(path, buffer, { contentType: 'image/png', upsert: true })
  if (error) throw new Error(`Upload do slide ${index + 1} falhou: ${error.message}`)
  const { data: urlData } = supabase.storage.from('slides').getPublicUrl(path)
  return urlData.publicUrl
}

async function runGeneration(input: GenerateCarouselInput): Promise<string> {
  const supabase = getSupabaseAdmin()

  const [ctx, mediaItems] = await Promise.all([
    fetchContext(supabase, input.companyId),
    fetchMediaItems(supabase, input.companyId),
  ])

  const brandColors: BrandColors = ctx.brand_colors ?? {
    primary: '#6C3FE8',
    secondary: '#E84393',
    accent: '#A855F7',
  }

  // Credits check
  const { data: company } = await supabase
    .from('companies')
    .select('credits_balance')
    .eq('id', input.companyId)
    .single()

  if (company && company.credits_balance < input.slidesCount) {
    throw new Error(`Créditos insuficientes (${company.credits_balance} disponíveis, ${input.slidesCount} necessários). Aguarde a renovação ou faça upgrade.`)
  }

  const logoUrl: string | undefined = (ctx as unknown as { logo_url?: string }).logo_url ?? undefined

  // Generate content with Claude
  const carousel = await generateCarouselContent(
    ctx, mediaItems, input.theme, input.tone, input.slidesCount
  )

  // Render slides to PNG
  const buffers = await renderAllSlides(carousel.slides, brandColors, logoUrl)

  // Create post record first to get an ID
  const status = input.publishMode === 'review' ? 'waiting' : 'approved'
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .insert({
      company_id:    input.companyId,
      schedule_id:   input.scheduleId,
      content:       carousel.slides,
      slides_html:   carousel.slides.map(() => null),
      slides_images: [],
      caption:       carousel.caption,
      status,
      ...(input.scheduledFor ? { scheduled_for: input.scheduledFor } : {}),
    })
    .select('id')
    .single()

  if (postErr || !post) throw new Error(`Erro ao criar post: ${postErr?.message}`)

  // Upload PNGs
  const imageUrls = await Promise.all(
    buffers.map((buf, i) => uploadSlide(supabase, buf, input.companyId, post.id, i))
  )

  // Update post with image URLs and slide HTML strings
  await supabase
    .from('posts')
    .update({
      slides_html: carousel.slides.map((_, i) => ({ slideIndex: i })),
      slides_images: imageUrls,
    })
    .eq('id', post.id)

  // Deduct credits
  try {
    await supabase.rpc('deduct_credits', { p_company_id: input.companyId, p_amount: carousel.slides.length })
  } catch (e) {
    console.error('[carousel/index] deduct_credits falhou (não fatal):', e)
  }

  // Create notification
  await supabase.from('notifications').insert({
    company_id: input.companyId,
    type: 'post_ready',
    message: `Carrossel "${input.theme}" gerado com ${carousel.slides.length} slides.`,
    read: false,
  })

  return post.id
}

export async function generateCarousel(input: GenerateCarouselInput): Promise<string> {
  return withSemaphore(async () => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await withTimeout(runGeneration(input), TIMEOUT_MS)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000))
        }
      }
    }

    throw lastError ?? new Error('Geração falhou após múltiplas tentativas')
  })
}
