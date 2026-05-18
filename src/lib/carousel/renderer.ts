import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'
import { buildSlideHtml } from './templates'
import type { SlideContent, BrandColors } from './types'

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance

  const isDev = process.env.NODE_ENV === 'development'

  // In development use a local Chrome if PUPPETEER_EXECUTABLE_PATH is set,
  // otherwise fall back to the @sparticuz/chromium binary (works on Linux CI too).
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    ?? await chromium.executablePath()

  browserInstance = await puppeteer.launch({
    args: isDev
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      : chromium.args,
    executablePath,
    headless: true,
    defaultViewport: { width: 1080, height: 1080, deviceScaleFactor: 2 },
  })

  return browserInstance
}

export async function renderSlide(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number
): Promise<Buffer> {
  const html    = buildSlideHtml(slide, colors, slideIndex, total)
  const browser = await getBrowser()
  const page    = await browser.newPage()

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
  }
}

export async function renderAllSlides(
  slides: SlideContent[],
  colors: BrandColors
): Promise<Buffer[]> {
  return Promise.all(
    slides.map((slide, i) => renderSlide(slide, colors, i + 1, slides.length))
  )
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

