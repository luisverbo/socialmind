import { buildSlideHtml } from './templates'
import type { SlideContent, BrandColors } from './types'

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

// ─── API pública ──────────────────────────────────────────────────────────────

export async function renderSlide(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number,
  logoUrl?: string
): Promise<Buffer> {
  const html = buildSlideHtml(slide, colors, slideIndex, total, logoUrl)

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

export async function renderAllSlides(
  slides: SlideContent[],
  colors: BrandColors,
  logoUrl?: string
): Promise<Buffer[]> {
  return Promise.all(
    slides.map((slide, i) => renderSlide(slide, colors, i + 1, slides.length, logoUrl))
  )
}
