import type { SlideContent, BrandColors } from './types'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function logoHtml(logoUrl: string | undefined, dark = false): string {
  if (!logoUrl) return ''
  const bg = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)'
  return `<div style="position:absolute;bottom:36px;right:40px;width:72px;height:72px;border-radius:14px;background:${bg};padding:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <img src="${escapeHtml(logoUrl)}" style="max-width:100%;max-height:100%;object-fit:contain;" />
  </div>`
}

function baseStyles(colors: BrandColors): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px; height: 1080px; overflow: hidden;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .slide {
      width: 1080px; height: 1080px; position: relative;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .primary   { color: ${colors.primary}; }
    .secondary { color: ${colors.secondary}; }
    .accent    { color: ${colors.accent}; }
    .bg-primary   { background: ${colors.primary}; }
    .bg-secondary { background: ${colors.secondary}; }
    .bg-accent    { background: ${colors.accent}; }
  `
}

function coverTemplate(slide: SlideContent, colors: BrandColors, logoUrl?: string): string {
  const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body { background: ${gradient}; }
    .slide { justify-content: center; align-items: center; padding: 80px; text-align: center; }
    .badge {
      display: inline-block; background: rgba(255,255,255,.2);
      color: #fff; font-size: 28px; font-weight: 600; letter-spacing: 2px;
      text-transform: uppercase; padding: 14px 40px; border-radius: 50px;
      margin-bottom: 60px; border: 1.5px solid rgba(255,255,255,.35);
    }
    h1 {
      font-size: 96px; font-weight: 800; color: #fff; line-height: 1.05;
      letter-spacing: -2px; margin-bottom: 40px;
    }
    .subtitle { font-size: 40px; color: rgba(255,255,255,.85); font-weight: 400; line-height: 1.4; max-width: 800px; }
    .swipe { position: absolute; bottom: 60px; left: 80px; display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,.7); font-size: 24px; }
    .swipe svg { opacity: .7; }
    .decorator {
      position: absolute; width: 350px; height: 350px; border-radius: 50%;
      background: rgba(255,255,255,.07); top: -100px; left: -80px;
    }
    .decorator2 {
      position: absolute; width: 500px; height: 500px; border-radius: 50%;
      background: rgba(255,255,255,.05); bottom: -150px; right: -100px;
    }
  </style></head><body>
  <div class="slide">
    <div class="decorator"></div>
    <div class="decorator2"></div>
    ${logoHtml(logoUrl, true)}
    ${slide.subtitle ? `<div class="badge">${escapeHtml(slide.subtitle)}</div>` : ''}
    <h1>${escapeHtml(slide.title)}</h1>
    ${slide.body ? `<p class="subtitle">${escapeHtml(slide.body)}</p>` : ''}
    <div class="swipe">
      Deslize
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </div>
  </body></html>`
}

function contentTemplate(slide: SlideContent, colors: BrandColors, slideNum: number, total: number, logoUrl?: string): string {
  const bullets = slide.bullets ?? []
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body { background: #FFFFFF; }
    .top-bar { height: 8px; background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary}); }
    .slide { padding: 80px; justify-content: space-between; }
    .counter { font-size: 26px; color: #9CA3AF; font-weight: 500; margin-bottom: 32px; }
    .counter span { color: ${colors.primary}; font-weight: 700; }
    h2 { font-size: 68px; font-weight: 800; color: #1A1A2E; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 48px; }
    .body-text { font-size: 38px; color: #374151; line-height: 1.6; margin-bottom: 40px; }
    .bullets { list-style: none; display: flex; flex-direction: column; gap: 28px; }
    .bullet {
      display: flex; align-items: flex-start; gap: 24px;
      font-size: 36px; color: #374151; line-height: 1.5;
    }
    .bullet-dot {
      flex-shrink: 0; width: 14px; height: 14px; border-radius: 50%;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      margin-top: 14px;
    }
    .footer { display: flex; align-items: center; justify-content: space-between; }
    .footer-text { font-size: 24px; color: #9CA3AF; }
    .progress { display: flex; gap: 8px; }
    .progress-dot { width: 10px; height: 10px; border-radius: 50%; background: #E5E7EB; }
    .progress-dot.active { background: ${colors.primary}; }
  </style></head><body>
  <div class="top-bar"></div>
  <div class="slide">
    ${logoHtml(logoUrl, false)}
    <div>
      <p class="counter"><span>${slideNum}</span> / ${total}</p>
      <h2>${escapeHtml(slide.title)}</h2>
      ${slide.body ? `<p class="body-text">${escapeHtml(slide.body)}</p>` : ''}
      ${bullets.length > 0 ? `<ul class="bullets">${bullets.map(b => `<li class="bullet"><div class="bullet-dot"></div><span>${escapeHtml(b)}</span></li>`).join('')}</ul>` : ''}
    </div>
    <div class="footer">
      ${slide.footer ? `<span class="footer-text">${escapeHtml(slide.footer)}</span>` : '<span></span>'}
      <div class="progress">
        ${Array.from({ length: total }, (_, i) => `<div class="progress-dot${i + 1 === slideNum ? ' active' : ''}"></div>`).join('')}
      </div>
    </div>
  </div>
  </body></html>`
}

function ctaTemplate(slide: SlideContent, colors: BrandColors, logoUrl?: string): string {
  const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body { background: #F8F7FF; }
    .slide { justify-content: center; align-items: center; padding: 80px; text-align: center; }
    .icon-wrap {
      width: 120px; height: 120px; border-radius: 32px;
      background: ${gradient}; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 56px; box-shadow: 0 20px 60px rgba(108,63,232,.35);
    }
    h2 { font-size: 76px; font-weight: 800; color: #1A1A2E; line-height: 1.1; letter-spacing: -2px; margin-bottom: 36px; }
    .body { font-size: 40px; color: #6B7280; line-height: 1.5; max-width: 820px; margin-bottom: 72px; }
    .cta-btn {
      display: inline-block; padding: 32px 80px; border-radius: 20px;
      background: ${gradient}; color: #fff;
      font-size: 40px; font-weight: 700; letter-spacing: -.5px;
      box-shadow: 0 16px 48px rgba(108,63,232,.40);
    }
    .sub { margin-top: 40px; font-size: 28px; color: #9CA3AF; }
    .blob {
      position: absolute; width: 600px; height: 600px; border-radius: 50%;
      background: linear-gradient(135deg, ${colors.primary}18, ${colors.secondary}18);
      top: -200px; right: -200px; pointer-events: none;
    }
  </style></head><body>
  <div class="slide">
    <div class="blob"></div>
    ${logoHtml(logoUrl, false)}
    <div class="icon-wrap">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </div>
    <h2>${escapeHtml(slide.title)}</h2>
    ${slide.body ? `<p class="body">${escapeHtml(slide.body)}</p>` : ''}
    ${slide.cta ? `<div class="cta-btn">${escapeHtml(slide.cta)}</div>` : ''}
    ${slide.subtitle ? `<p class="sub">${escapeHtml(slide.subtitle)}</p>` : ''}
  </div>
  </body></html>`
}

function imageTemplate(slide: SlideContent, colors: BrandColors, logoUrl?: string): string {
  const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
  const overlay  = slide.imageUrl
    ? `linear-gradient(to bottom, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 100%)`
    : gradient
  const bg = slide.imageUrl ? `url('${slide.imageUrl}')` : gradient
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body { background: #000; }
    .slide {
      justify-content: flex-end; padding: 80px;
      background-image: ${slide.imageUrl ? `${overlay}, ${bg}` : bg};
      background-size: cover; background-position: center;
    }
    .content { position: relative; z-index: 1; }
    ${slide.subtitle ? `.tag {
      display: inline-block; background: rgba(255,255,255,.2); color: #fff; backdrop-filter: blur(8px);
      font-size: 26px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;
      padding: 10px 28px; border-radius: 50px; margin-bottom: 28px; border: 1px solid rgba(255,255,255,.3);
    }` : ''}
    h2 { font-size: 72px; font-weight: 800; color: #fff; line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 24px; }
    .body { font-size: 36px; color: rgba(255,255,255,.85); line-height: 1.5; max-width: 900px; }
  </style></head><body>
  <div class="slide">
    ${logoHtml(logoUrl, true)}
    <div class="content">
      ${slide.subtitle ? `<div class="tag">${escapeHtml(slide.subtitle)}</div>` : ''}
      <h2>${escapeHtml(slide.title)}</h2>
      ${slide.body ? `<p class="body">${escapeHtml(slide.body)}</p>` : ''}
    </div>
  </div>
  </body></html>`
}

export function buildSlideHtml(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number,
  logoUrl?: string
): string {
  switch (slide.type) {
    case 'cover':
      return coverTemplate(slide, colors, logoUrl)
    case 'cta':
      return ctaTemplate(slide, colors, logoUrl)
    case 'image':
      return imageTemplate(slide, colors, logoUrl)
    case 'content':
    default:
      return contentTemplate(slide, colors, slideIndex, total, logoUrl)
  }
}
