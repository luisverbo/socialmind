import { HEADLINE_STYLES, type HeadlineStyle } from './styles'
export { HEADLINE_STYLES, type HeadlineStyle }

const RENDERER_URL = process.env.RENDERER_URL
const RENDERER_KEY = process.env.RENDERER_API_KEY
const VPS_TIMEOUT  = 30_000
const MAX_RETRIES  = 2
]

export interface PromptProfile {
  username:     string
  displayName:  string
  avatarDataUri?: string
}

export interface CoverSlideData {
  coverImageDataUri?: string
  headline:  string
  subtitle?: string
  style:     HeadlineStyle
  profile:   PromptProfile
}

export interface ContentSlideData {
  title:        string
  points:       string[]
  slideNumber:  number
  totalSlides:  number
  profile:      PromptProfile
}

export interface CtaSlideData {
  ctaWord:  string
  ctaText:  string
  profile:  PromptProfile
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function profileHtml(p: PromptProfile): string {
  const avatar = p.avatarDataUri
    ? `<img src="${escHtml(p.avatarDataUri)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2.5px solid rgba(255,255,255,0.35);" />`
    : `<div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#6C3FE8,#E84393);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:white;">${escHtml(p.displayName.charAt(0).toUpperCase())}</div>`

  return `
    <div style="display:flex;align-items:center;gap:16px;">
      ${avatar}
      <div>
        <div style="font-size:28px;font-weight:700;color:#FFFFFF;line-height:1.1;">${escHtml(p.displayName)}</div>
        <div style="font-size:22px;color:rgba(255,255,255,0.55);margin-top:3px;">@${escHtml(p.username)}</div>
      </div>
    </div>`
}

function buildCoverHtml(d: CoverSlideData): string {
  const s = d.style
  const headlineBg = s.gradient ? s.gradient : s.bgColor
  const hasBg      = s.bgColor !== 'transparent' && s.bgColor !== ''

  const bodyBg = d.coverImageDataUri
    ? `background:linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.68)),url('${d.coverImageDataUri}') center/cover no-repeat;`
    : `background:linear-gradient(160deg,#1a0533 0%,#0d0d0d 60%,#160826 100%);`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;${bodyBg}}
.slide{width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;padding:68px;}
</style></head><body><div class="slide">

  <div style="margin-bottom:auto;">${profileHtml(d.profile)}</div>

  <div style="margin-top:auto;margin-bottom:56px;">
    <div style="
      background:${headlineBg};
      padding:${hasBg ? '22px 36px' : '0'};
      border-radius:${hasBg ? '14px' : '0'};
      display:inline-block;
      margin-bottom:28px;
      ${!hasBg ? 'text-shadow:0 2px 24px rgba(0,0,0,0.9);' : ''}
    ">
      <span style="font-size:${d.headline.length > 60 ? '58' : '68'}px;font-weight:900;color:${s.textColor};line-height:1.05;letter-spacing:-0.5px;display:block;">
        ${escHtml(d.headline)}
      </span>
    </div>
    ${d.subtitle ? `<p style="font-size:36px;color:rgba(255,255,255,0.72);font-weight:400;line-height:1.45;max-width:900px;">${escHtml(d.subtitle)}</p>` : ''}
  </div>

  <div style="position:absolute;bottom:52px;right:68px;display:flex;align-items:center;gap:10px;color:rgba(255,255,255,0.45);font-size:24px;">
    <span>Deslize</span>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
  </div>

</div></body></html>`
}

function buildContentHtml(d: ContentSlideData): string {
  const dots = Array.from({ length: d.totalSlides }, (_, i) =>
    `<div style="width:${i+1===d.slideNumber?'28px':'9px'};height:9px;border-radius:5px;background:${i+1===d.slideNumber?'#FFFFFF':'rgba(255,255,255,0.2)'};"></div>`
  ).join('')

  const points = d.points.map(p => `
    <div style="display:flex;align-items:flex-start;gap:22px;margin-bottom:28px;">
      <div style="width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#6C3FE8,#E84393);margin-top:16px;flex-shrink:0;"></div>
      <span style="font-size:${d.points.length > 4 ? '34' : '38'}px;color:rgba(255,255,255,0.85);font-weight:400;line-height:1.35;">${escHtml(p)}</span>
    </div>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;background:#000000;}
.slide{width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;padding:68px;}
</style></head><body><div class="slide">

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:52px;">
    ${profileHtml(d.profile)}
    <div style="font-size:22px;color:rgba(255,255,255,0.3);font-weight:500;">${d.slideNumber}/${d.totalSlides}</div>
  </div>

  <h2 style="font-size:52px;font-weight:800;color:#FFFFFF;line-height:1.15;margin-bottom:40px;letter-spacing:-0.5px;">${escHtml(d.title)}</h2>

  <div style="flex:1;">${points}</div>

  <div style="display:flex;align-items:center;justify-content:space-between;padding-top:28px;border-top:1px solid rgba(255,255,255,0.07);">
    <div style="display:flex;align-items:center;gap:8px;">${dots}</div>
    <div style="color:rgba(255,255,255,0.35);font-size:26px;letter-spacing:5px;">....→</div>
  </div>

</div></body></html>`
}

function buildCtaHtml(d: CtaSlideData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;background:#000000;}
.slide{width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;text-align:center;}
</style></head><body><div class="slide">

  <div style="position:absolute;top:68px;left:68px;right:68px;display:flex;justify-content:center;">
    ${profileHtml(d.profile)}
  </div>

  <p style="font-size:36px;color:rgba(255,255,255,0.55);margin-bottom:32px;font-weight:400;">${escHtml(d.ctaText)}</p>

  <div style="background:linear-gradient(135deg,#6C3FE8,#E84393);border-radius:24px;padding:40px 80px;margin-bottom:32px;display:inline-block;">
    <p style="font-size:32px;color:rgba(255,255,255,0.8);font-weight:500;margin-bottom:10px;">Comenta</p>
    <p style="font-size:100px;font-weight:900;color:#FFFFFF;letter-spacing:3px;line-height:1;">"${escHtml(d.ctaWord)}"</p>
  </div>

  <p style="font-size:32px;color:rgba(255,255,255,0.45);">Que eu te mando no direct 👇</p>

</div></body></html>`
}

// ─── VPS renderer ─────────────────────────────────────────────────────────────

async function renderHtml(html: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VPS_TIMEOUT)
    try {
      const res = await fetch(`${RENDERER_URL}/render`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RENDERER_KEY ?? '' },
        body:    JSON.stringify({ html, width: 1080, height: 1080, scale: 2 }),
        signal:  controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`VPS ${res.status}`)
      const { png } = await res.json() as { png: string }
      return Buffer.from(png, 'base64')
    } catch (err) {
      clearTimeout(timer)
      if (attempt === MAX_RETRIES) {
        // Fallback to local Puppeteer
        return renderLocally(html)
      }
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
  throw new Error('render failed')
}

async function renderLocally(html: string): Promise<Buffer> {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ])
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? await chromium.executablePath()
  const isDev = process.env.NODE_ENV === 'development'
  const browser = await puppeteer.launch({
    args: isDev ? ['--no-sandbox'] : chromium.args,
    executablePath,
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } })
    return Buffer.from(buf)
  } finally {
    await browser.close()
  }
}

export async function urlToDataUri(url: string): Promise<string> {
  try {
    const res  = await fetch(url)
    const buf  = await res.arrayBuffer()
    const mime = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return ''
  }
}

export async function renderCover(data: CoverSlideData):     Promise<Buffer> { return renderHtml(buildCoverHtml(data))   }
export async function renderContent(data: ContentSlideData): Promise<Buffer> { return renderHtml(buildContentHtml(data)) }
export async function renderCta(data: CtaSlideData):         Promise<Buffer> { return renderHtml(buildCtaHtml(data))     }
