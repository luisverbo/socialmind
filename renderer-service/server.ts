import express, { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import puppeteer, { Browser, Page } from 'puppeteer'
import * as os from 'os'

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT        = parseInt(process.env.PORT ?? '3001', 10)
const API_KEY     = process.env.RENDERER_API_KEY ?? ''
const MAX_PAGES   = 3        // páginas simultâneas
const RENDER_TIMEOUT = 30_000 // 30s por render
const MAX_HTML_SIZE  = 500 * 1024 // 500KB

if (!API_KEY) {
  console.error('[boot] RENDERER_API_KEY não definida — abortando')
  process.exit(1)
}

// ─── Semáforo ─────────────────────────────────────────────────────────────────

class Semaphore {
  private slots: number
  private queue: Array<() => void> = []

  constructor(max: number) { this.slots = max }

  acquire(): Promise<void> {
    if (this.slots > 0) { this.slots--; return Promise.resolve() }
    return new Promise(resolve => this.queue.push(resolve))
  }

  release(): void {
    const next = this.queue.shift()
    if (next) { next() } else { this.slots++ }
  }
}

const semaphore = new Semaphore(MAX_PAGES)

// ─── Browser singleton ────────────────────────────────────────────────────────

let browser: Browser | null = null
let browserStarting = false
const startedAt = Date.now()

async function getBrowser(): Promise<Browser> {
  if (browser?.connected) return browser
  if (browserStarting) {
    // espera até o browser estar pronto
    await new Promise(r => setTimeout(r, 500))
    return getBrowser()
  }

  browserStarting = true
  console.log('[browser] iniciando Chromium…')
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--single-process',
    ],
  })

  browser.on('disconnected', () => {
    console.warn('[browser] desconectado — será reiniciado no próximo request')
    browser = null
    browserStarting = false
  })

  browserStarting = false
  console.log('[browser] pronto')
  return browser
}

// Pré-aquece o browser na inicialização
getBrowser().catch(err => console.error('[browser] falha ao pré-aquecer:', err))

// ─── Render ───────────────────────────────────────────────────────────────────

async function renderHtml(
  html: string,
  width: number,
  height: number,
  scale: number
): Promise<Buffer> {
  await semaphore.acquire()
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

    return Buffer.from(screenshot)
  } finally {
    if (page && !page.isClosed()) await page.close().catch(() => {})
    semaphore.release()
  }
}

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express()
app.set('trust proxy', 1)

app.use(express.json({ limit: '600kb' }))

// Rate limit: 10 req/min por IP
app.use(rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições — tente em 1 minuto' },
}))

// Autenticação por API key
function authenticate(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    res.status(401).json({ error: 'API key inválida' })
    return
  }
  next()
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const mem   = process.memoryUsage()
  const total = os.totalmem()
  const free  = os.freemem()

  let chromiumVersion = 'desconhecido'
  try {
    if (browser?.connected) {
      chromiumVersion = await browser.version()
    }
  } catch {}

  res.json({
    status: 'ok',
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
    browser_connected: browser?.connected ?? false,
    chromium: chromiumVersion,
    memory: {
      heap_used_mb:  Math.round(mem.heapUsed  / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      rss_mb:        Math.round(mem.rss       / 1024 / 1024),
      system_free_mb: Math.round(free  / 1024 / 1024),
      system_total_mb: Math.round(total / 1024 / 1024),
    },
  })
})

app.post('/render', authenticate, async (req, res) => {
  const ts = new Date().toISOString()
  const ip = req.ip ?? 'desconhecido'

  const { html, width = 1080, height = 1080, scale = 2 } = req.body

  if (typeof html !== 'string' || !html) {
    console.log(`[${ts}] ${ip} — 400 html ausente`)
    res.status(400).json({ error: 'Campo html é obrigatório' })
    return
  }

  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_SIZE) {
    console.log(`[${ts}] ${ip} — 400 html muito grande`)
    res.status(400).json({ error: 'HTML excede limite de 500KB' })
    return
  }

  if (
    typeof width  !== 'number' || width  < 100 || width  > 4000 ||
    typeof height !== 'number' || height < 100 || height > 4000 ||
    typeof scale  !== 'number' || scale  < 1   || scale  > 4
  ) {
    res.status(400).json({ error: 'width/height (100–4000) e scale (1–4) inválidos' })
    return
  }

  console.log(`[${ts}] ${ip} — render ${width}×${height}@${scale}x`)

  const timer = setTimeout(() => {
    console.error(`[${ts}] ${ip} — timeout de ${RENDER_TIMEOUT / 1000}s`)
  }, RENDER_TIMEOUT)

  try {
    const png    = await renderHtml(html, width, height, scale)
    const base64 = png.toString('base64')
    clearTimeout(timer)
    console.log(`[${ts}] ${ip} — ok ${Math.round(png.length / 1024)}KB`)
    res.json({ png: base64 })
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${ts}] ${ip} — erro: ${msg}`)
    res.status(500).json({ error: msg })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[boot] socialmind-renderer na porta ${PORT}`)
})

// Graceful shutdown
async function shutdown() {
  console.log('[shutdown] encerrando…')
  if (browser) await browser.close().catch(() => {})
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)
