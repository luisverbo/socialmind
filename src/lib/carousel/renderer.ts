import { buildSlideHtml } from './templates'
import type { SlideContent, BrandColors } from './types'

const RENDERER_URL = process.env.RENDERER_URL
const RENDERER_API_KEY = process.env.RENDERER_API_KEY
const RENDERER_TIMEOUT = 30_000

// ── VPS renderer ─────────────────────────────────────────────────────────────

async function renderViaVPS(html: string): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RENDERER_TIMEOUT)

  try {
    const res = await fetch(`${RENDERER_URL}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': RENDERER_API_KEY!,
      },
      body: JSON.stringify({ html, width: 1080, height: 1080, scale: 2 }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`VPS renderer ${res.status}: ${body}`)
    }

    const { image } = (await res.json()) as { image: string }
    return Buffer.from(image, 'base64')
  } finally {
    clearTimeout(timer)
  }
}

async function renderViaVPSWithRetry(html: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await renderViaVPS(html)
    } catch (err) {
      if (attempt === 3) throw err
      await new Promise((r) => setTimeout(r, attempt * 500))
    }
  }
  throw new Error('unreachable')
}

// ── Local Puppeteer fallback ──────────────────────────────────────────────────

async function renderLocally(html: string): Promise<Buffer> {
  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteer = (await import('puppeteer-core')).default

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ?? (await chromium.executablePath())

  const browser = await puppeteer.launch({
    args:
      process.env.NODE_ENV === 'development'
        ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        : chromium.args,
    executablePath,
    headless: true,
    defaultViewport: { width: 1080, height: 1080, deviceScaleFactor: 2 },
  })

  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 })
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    })
    return Buffer.from(screenshot)
  } finally {
    await page.close()
    await browser.close()
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function renderSlide(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number
): Promise<Buffer> {
  const html = buildSlideHtml(slide, colors, slideIndex, total)

  if (RENDERER_URL && RENDERER_API_KEY) {
    try {
      return await renderViaVPSWithRetry(html)
    } catch (err) {
      console.warn('[renderer] VPS failed, falling back to local:', (err as Error).message)
    }
  }

  return renderLocally(html)
}

export async function renderAllSlides(
  slides: SlideContent[],
  colors: BrandColors
): Promise<Buffer[]> {
  return Promise.all(
    slides.map((slide, i) => renderSlide(slide, colors, i + 1, slides.length))
  )
}

// kept for backwards-compat — no-op when using VPS
export async function closeBrowser(): Promise<void> {}
