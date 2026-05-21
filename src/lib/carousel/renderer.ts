import { buildSlideHtml } from './templates'
import type { SlideContent, BrandColors, Template } from './types'

const RENDERER_URL = process.env.RENDERER_URL    // ex: http://2.24.210.233:3001
const RENDERER_KEY = process.env.RENDERER_API_KEY
const VPS_TIMEOUT  = 30_000
const MAX_RETRIES  = 2

// ─── VPS renderer ─────────────────────────────────────────────────────────────

async function renderViaVPS(html: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VPS_TIMEOUT)

    try {
      const res = await fetch(`${RENDERER_URL}/render`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':    RENDERER_KEY ?? '',
        },
        body:   JSON.stringify({ html, width: 1080, height: 1080, scale: 2 }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const { png } = await res.json() as { png: string }
      return Buffer.from(png, 'base64')
    } catch (err) {
      clearTimeout(timer)
      if (attempt === MAX_RETRIES) throw err
      console.warn(`[renderer] VPS tentativa ${attempt} falhou, tentando novamente…`)
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  throw new Error('VPS render falhou após todas as tentativas')
}

// ─── Fallback local (Puppeteer + @sparticuz/chromium) ─────────────────────────

async function renderLocally(html: string): Promise<Buffer> {
  // Importações dinâmicas para não quebrar o bundle quando VPS está ativo
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ])

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    ?? await chromium.executablePath()

  const isDev = process.env.NODE_ENV === 'development'
  const browser = await puppeteer.launch({
    args: isDev
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      : chromium.args,
    executablePath,
    headless: true,
    defaultViewport: { width: 1080, height: 1080, deviceScaleFactor: 2 },
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'load', timeout: 15_000 })
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    })
    await page.close()
    return Buffer.from(screenshot)
  } finally {
    await browser.close()
  }
}

// ─── Logo → base64 data URI (evita requisição externa no Puppeteer) ───────────

async function logoToDataUri(logoUrl: string | undefined): Promise<string | undefined> {
  if (!logoUrl) return undefined
  // Já é data URI — não precisa fazer nada
  if (logoUrl.startsWith('data:')) return logoUrl
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    const res = await fetch(logoUrl, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn(`[renderer] Logo fetch retornou ${res.status} — slide sem logo`)
      return undefined
    }
    const buf  = Buffer.from(await res.arrayBuffer())
    const mime = res.headers.get('content-type') ?? 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[renderer] Não foi possível carregar logo (${msg}) — slide sem logo`)
    return undefined
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function renderSlide(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number,
  logoDataUri?: string,       // já deve ser data URI, não URL externa
  template: Template = 'classic'
): Promise<Buffer> {
  const html = buildSlideHtml(slide, colors, slideIndex, total, logoDataUri, template)

  if (RENDERER_URL && RENDERER_KEY) {
    try {
      return await renderViaVPS(html)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[renderer] VPS falhou (${msg}) — usando fallback local`)
    }
  }

  return renderLocally(html)
}

// ─── Convert external image URLs in slides to base64 data URIs ───────────────

async function resolveSlideImages(slides: SlideContent[]): Promise<SlideContent[]> {
  return Promise.all(
    slides.map(async (slide) => {
      if (!slide.imageUrl || slide.imageUrl.startsWith('data:')) return slide
      const dataUri = await logoToDataUri(slide.imageUrl) // reuse same fetch + base64 logic
      if (!dataUri) {
        console.warn(`[renderer] Não foi possível carregar imageUrl do slide ${slide.slide} — slide sem foto`)
        return { ...slide, imageUrl: undefined }
      }
      return { ...slide, imageUrl: dataUri }
    })
  )
}

export async function renderAllSlides(
  slides: SlideContent[],
  colors: BrandColors,
  logoUrl?: string,
  template: Template = 'classic'
): Promise<Buffer[]> {
  // Converte URL externa → base64 UMA vez antes de renderizar todos os slides
  const logoDataUri = await logoToDataUri(logoUrl)
  if (logoUrl && logoDataUri) {
    console.log('[renderer] Logo convertido para base64 com sucesso')
  }

  // Converte imageUrl de slides de foto para base64 (evita CORS no Puppeteer)
  const resolvedSlides = await resolveSlideImages(slides)

  return Promise.all(
    resolvedSlides.map((slide, i) => renderSlide(slide, colors, i + 1, resolvedSlides.length, logoDataUri, template))
  )
}
