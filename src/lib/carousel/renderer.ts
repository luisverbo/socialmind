import puppeteer, { type Browser } from 'puppeteer'
import { buildSlideHtml } from './templates'
import type { SlideContent, BrandColors } from './types'

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })
  }
  return browserInstance
}

export async function renderSlide(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number
): Promise<Buffer> {
  const html = buildSlideHtml(slide, colors, slideIndex, total)
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 })
    const screenshot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } })
    return Buffer.from(screenshot)
  } finally {
    await page.close()
  }
}

export async function renderAllSlides(
  slides: SlideContent[],
  colors: BrandColors
): Promise<Buffer[]> {
  // Render slides concurrently within a single browser instance
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
