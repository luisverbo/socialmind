import express, { Request, Response, NextFunction } from 'express'
import puppeteer, { Browser, Page } from 'puppeteer'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const API_KEY = process.env.RENDERER_API_KEY

if (!API_KEY) {
  console.error('RENDERER_API_KEY is required')
  process.exit(1)
}

// ── Semaphore for max concurrent pages ──────────────────────────────────────
const MAX_CONCURRENT = 3
let activePages = 0
const waitQueue: Array<() => void> = []

function acquirePage(): Promise<void> {
  return new Promise((resolve) => {
    if (activePages < MAX_CONCURRENT) {
      activePages++
      resolve()
    } else {
      waitQueue.push(() => { activePages++; resolve() })
    }
  })
}

function releasePage(): void {
  const next = waitQueue.shift()
  if (next) {
    next()
  } else {
    activePages--
  }
}

// ── Browser singleton ────────────────────────────────────────────────────────
let browser: Browser | null = null
const RENDER_TIMEOUT = 30_000

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--single-process',
    ],
    defaultViewport: null,
  })

  browser.on('disconnected', () => {
    console.warn('[browser] disconnected — will relaunch on next request')
    browser = null
  })

  console.log('[browser] launched')
  return browser
}

// Pre-warm on startup
getBrowser().catch((err) => console.error('[browser] pre-warm failed:', err))

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '500kb' }))

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down.' },
  })
)

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const mem = process.memoryUsage()
  let chromiumVersion = 'unavailable'
  try {
    const b = await getBrowser()
    chromiumVersion = await b.version()
  } catch {}

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    chromium: chromiumVersion,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
    },
    activePages,
  })
})

interface RenderBody {
  html?: string
  width?: number
  height?: number
  scale?: number
}

app.post('/render', authenticate, async (req: Request, res: Response) => {
  const ts = new Date().toISOString()
  const ip = req.ip

  const { html, width = 1080, height = 1080, scale = 2 }: RenderBody = req.body

  if (!html || typeof html !== 'string') {
    console.log(`[${ts}] ${ip} — 400 missing html`)
    res.status(400).json({ error: 'html is required' })
    return
  }

  if (Buffer.byteLength(html, 'utf8') > 500 * 1024) {
    console.log(`[${ts}] ${ip} — 413 html too large`)
    res.status(413).json({ error: 'html exceeds 500 KB limit' })
    return
  }

  await acquirePage()
  let page: Page | null = null

  try {
    const b = await getBrowser()
    page = await b.newPage()

    await page.setViewport({ width, height, deviceScaleFactor: scale })
    await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT })

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    })

    const base64 = Buffer.from(screenshot).toString('base64')
    console.log(`[${ts}] ${ip} — 200 rendered ${width}x${height}@${scale}x`)
    res.json({ image: base64 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${ts}] ${ip} — 500 ${msg}`)
    res.status(500).json({ error: 'Render failed', detail: msg })
  } finally {
    if (page && !page.isClosed()) await page.close().catch(() => {})
    releasePage()
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] socialmind-renderer listening on port ${PORT}`)
})
