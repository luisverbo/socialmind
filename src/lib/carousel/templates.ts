import type { SlideContent, BrandColors, Template, RenderProfile } from './types'

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
  const hasImage = !!slide.imageUrl
  const isUnsplash = hasImage && slide.imageUrl!.includes('unsplash')

  const bodyBackground = hasImage
    ? `background-image: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${slide.imageUrl}'); background-size: cover; background-position: center;`
    : `background: ${gradient};`

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body { ${bodyBackground} }
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
    .photo-credit { position: absolute; bottom: 12px; left: 80px; font-size: 11px; color: rgba(255,255,255,0.4); }
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
    ${isUnsplash ? `<p class="photo-credit">Photo: Unsplash</p>` : ''}
  </div>
  </body></html>`
}

function contentTemplate(slide: SlideContent, colors: BrandColors, slideNum: number, total: number, logoUrl?: string): string {
  const bullets   = slide.bullets ?? []
  const titleLen  = slide.title?.length ?? 0
  const bodyLen   = slide.body?.length ?? 0
  const bulletCount = bullets.length

  // Avg chars per bullet (long bullets need smaller font)
  const avgBulletLen = bullets.length > 0
    ? bullets.reduce((s, b) => s + b.length, 0) / bullets.length
    : 0

  // Title font: large by default, scale down only for very long titles
  const titleFontSize = titleLen > 55 ? 54 : titleLen > 38 ? 60 : 66

  // Bullets font: reduce only when bullets are long or there are 4+
  const bulletsFontSize = bulletCount >= 4
    ? (avgBulletLen > 50 ? 26 : 28)
    : avgBulletLen > 60 ? 28 : avgBulletLen > 40 ? 30 : 33

  const bulletsGap      = bulletCount >= 4 ? 16 : bulletCount === 3 && avgBulletLen > 50 ? 20 : 24
  const h2MarginBottom  = bodyLen > 0 ? 24 : bulletCount >= 4 ? 28 : 32
  const bodyFontSize    = bodyLen > 100 ? 28 : 30
  const bodyMarginBottom = 22

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body { background: #FFFFFF; }
    .top-bar { height: 8px; background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary}); }
    .slide { padding: 72px 80px 64px; justify-content: space-between; }
    .counter { font-size: 26px; color: #9CA3AF; font-weight: 500; margin-bottom: 22px; }
    .counter span { color: ${colors.primary}; font-weight: 700; }
    h2 { font-size: ${titleFontSize}px; font-weight: 800; color: #1A1A2E; line-height: 1.15; letter-spacing: -1px; margin-bottom: ${h2MarginBottom}px; }
    .body-text { font-size: ${bodyFontSize}px; color: #374151; line-height: 1.55; margin-bottom: ${bodyMarginBottom}px; }
    .content-area { flex: 1; min-height: 0; overflow: hidden; }
    .bullets { list-style: none; display: flex; flex-direction: column; gap: ${bulletsGap}px; }
    .bullet {
      display: flex; align-items: flex-start; gap: 22px;
      font-size: ${bulletsFontSize}px; color: #374151; line-height: 1.45;
    }
    .bullet-dot {
      flex-shrink: 0; width: 13px; height: 13px; border-radius: 50%;
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
      margin-top: 11px;
    }
    .footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; flex-shrink: 0; }
    .footer-text { font-size: 23px; color: #9CA3AF; }
    .progress { display: flex; gap: 8px; }
    .progress-dot { width: 10px; height: 10px; border-radius: 50%; background: #E5E7EB; }
    .progress-dot.active { background: ${colors.primary}; }
  </style></head><body>
  <div class="top-bar"></div>
  <div class="slide">
    ${logoHtml(logoUrl, false)}
    <div class="content-area">
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
  const hasImage = !!slide.imageUrl
  const isUnsplash = hasImage && slide.imageUrl!.includes('unsplash')

  if (hasImage) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    ${baseStyles(colors)}
    body {
      background-image: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${slide.imageUrl}');
      background-size: cover; background-position: center;
    }
    .slide { justify-content: center; align-items: center; padding: 80px; text-align: center; }
    .icon-wrap {
      width: 120px; height: 120px; border-radius: 32px;
      background: ${gradient}; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 56px; box-shadow: 0 20px 60px rgba(108,63,232,.35);
    }
    h2 { font-size: 76px; font-weight: 800; color: #fff; line-height: 1.1; letter-spacing: -2px; margin-bottom: 36px; }
    .body { font-size: 40px; color: rgba(255,255,255,0.85); line-height: 1.5; max-width: 820px; margin-bottom: 72px; }
    .cta-btn {
      display: inline-block; padding: 32px 80px; border-radius: 20px;
      background: #fff; color: ${colors.primary};
      font-size: 40px; font-weight: 700; letter-spacing: -.5px;
      box-shadow: 0 16px 48px rgba(0,0,0,.30);
    }
    .sub { margin-top: 40px; font-size: 28px; color: rgba(255,255,255,0.7); }
    .photo-credit { position: absolute; bottom: 12px; left: 80px; font-size: 11px; color: rgba(255,255,255,0.4); }
  </style></head><body>
  <div class="slide">
    ${logoHtml(logoUrl, true)}
    <div class="icon-wrap">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </div>
    <h2>${escapeHtml(slide.title)}</h2>
    ${slide.body ? `<p class="body">${escapeHtml(slide.body)}</p>` : ''}
    ${slide.cta ? `<div class="cta-btn">${escapeHtml(slide.cta)}</div>` : ''}
    ${slide.subtitle ? `<p class="sub">${escapeHtml(slide.subtitle)}</p>` : ''}
    ${isUnsplash ? `<p class="photo-credit">Photo: Unsplash</p>` : ''}
  </div>
  </body></html>`
  }

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

// ─── Editorial template (Twitter/X card style) ────────────────────────────────

function editorialHeader(
  colors: BrandColors,
  logoUrl: string | undefined,
  slideNum: number,
  total: number,
  profile?: RenderProfile
): string {
  // Avatar: prefer Instagram profile pic, then logo, then gradient circle
  const profilePic = profile?.profilePicUrl ?? logoUrl
  const avatarContent = profilePic
    ? `<img src="${escapeHtml(profilePic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,${colors.primary},${colors.secondary});"></div>`

  const displayName = profile?.companyName ?? 'SocialMind'
  const handle      = profile?.instagramHandle ? `@${profile.instagramHandle}` : '@socialmind'

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:44px 64px 28px;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:18px;">
        <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2.5px solid ${colors.primary}33;">
          ${avatarContent}
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:28px;font-weight:800;color:#0F172A;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">${escapeHtml(displayName)}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="${colors.primary}"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
          </div>
          <span style="font-size:23px;color:#64748B;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">${escapeHtml(handle)}</span>
        </div>
      </div>
      <span style="font-size:22px;color:#94A3B8;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">${slideNum}/${total}</span>
    </div>`
}

function editorialFooter(colors: BrandColors): string {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 64px 40px;flex-shrink:0;border-top:1px solid #F1F5F9;">
      <div style="display:flex;align-items:center;gap:32px;">
        <div style="display:flex;align-items:center;gap:10px;color:#94A3B8;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span style="font-size:22px;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">Curtir</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;color:#94A3B8;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          <span style="font-size:22px;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">Compartilhar</span>
        </div>
      </div>
      <span style="font-size:22px;color:${colors.primary};font-weight:600;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">ver mais →</span>
    </div>`
}

function editorialCoverTemplate(slide: SlideContent, colors: BrandColors, slideNum: number, total: number, logoUrl?: string, profile?: RenderProfile): string {
  // Image height: 340px gives a good balance — not too small, not dominating
  const imgHeight = slide.imageUrl ? 340 : 220
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    html,body { width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased; }
    body { background:#FFFFFF; }
    .slide { width:1080px;height:1080px;display:flex;flex-direction:column;position:relative;overflow:hidden; }
    .content { flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:0 64px 24px; }
  </style></head><body>
  <div class="slide">
    ${editorialHeader(colors, logoUrl, slideNum, total, profile)}
    <div class="content">
      ${slide.subtitle ? `<div style="display:inline-flex;align-items:center;gap:10px;background:${colors.primary}12;border:1.5px solid ${colors.primary}30;padding:10px 24px;border-radius:50px;margin-bottom:32px;align-self:flex-start;">
        <div style="width:8px;height:8px;border-radius:50%;background:${colors.primary};"></div>
        <span style="font-size:24px;font-weight:600;color:${colors.primary};text-transform:uppercase;letter-spacing:1.5px;">${escapeHtml(slide.subtitle)}</span>
      </div>` : ''}
      <h1 style="font-size:${slide.imageUrl ? '74px' : '88px'};font-weight:900;color:#0F172A;line-height:1.05;letter-spacing:-2px;margin-bottom:${slide.body ? '24px' : '0'};">${escapeHtml(slide.title)}</h1>
      ${slide.body ? `<p style="font-size:32px;color:#475569;line-height:1.5;max-width:880px;">${escapeHtml(slide.body)}</p>` : ''}
    </div>
    ${slide.imageUrl
      ? `<div style="flex-shrink:0;height:${imgHeight}px;margin:0 64px;border-radius:24px;overflow:hidden;">
          <img src="${escapeHtml(slide.imageUrl)}" style="width:100%;height:100%;object-fit:cover;" />
        </div>`
      : `<div style="flex-shrink:0;height:${imgHeight}px;margin:0 64px;border-radius:24px;background:linear-gradient(135deg,${colors.primary}15,${colors.secondary}15);display:flex;align-items:center;justify-content:center;">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,${colors.primary},${colors.secondary});opacity:0.35;"></div>
        </div>`}
    ${editorialFooter(colors)}
  </div>
  </body></html>`
}

function editorialContentTemplate(slide: SlideContent, colors: BrandColors, slideNum: number, total: number, logoUrl?: string, profile?: RenderProfile): string {
  const bullets = slide.bullets ?? []
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    html,body { width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased; }
    body { background:#FFFFFF; }
    .slide { width:1080px;height:1080px;display:flex;flex-direction:column;position:relative;overflow:hidden; }
    .content { flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;padding:12px 64px 0; }
  </style></head><body>
  <div class="slide">
    ${editorialHeader(colors, logoUrl, slideNum, total, profile)}
    <div class="content">
      <h2 style="font-size:62px;font-weight:800;color:#0F172A;line-height:1.12;letter-spacing:-1px;margin-bottom:28px;">${escapeHtml(slide.title)}</h2>
      ${slide.body ? `<p style="font-size:30px;color:#475569;line-height:1.6;margin-bottom:30px;">${escapeHtml(slide.body)}</p>` : ''}
      ${bullets.length > 0 ? `<div style="display:flex;flex-direction:column;gap:20px;">
        ${bullets.map(b => `<div style="display:flex;align-items:flex-start;gap:20px;">
          <span style="font-size:30px;font-weight:700;color:${colors.primary};flex-shrink:0;line-height:1.5;">→</span>
          <span style="font-size:30px;color:#334155;line-height:1.5;">${escapeHtml(b)}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>
    ${editorialFooter(colors)}
  </div>
  </body></html>`
}

function editorialCtaTemplate(slide: SlideContent, colors: BrandColors, slideNum: number, total: number, logoUrl?: string, profile?: RenderProfile): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    html,body { width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased; }
    body { background:#FFFFFF; }
    .slide { width:1080px;height:1080px;display:flex;flex-direction:column;position:relative;overflow:hidden; }
    .content { flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:0 64px; }
  </style></head><body>
  <div class="slide">
    ${editorialHeader(colors, logoUrl, slideNum, total, profile)}
    <div class="content">
      <h2 style="font-size:74px;font-weight:900;color:#0F172A;line-height:1.08;letter-spacing:-1.5px;margin-bottom:32px;">${escapeHtml(slide.title)}</h2>
      ${slide.body ? `<p style="font-size:32px;color:#475569;line-height:1.6;margin-bottom:48px;max-width:880px;">${escapeHtml(slide.body)}</p>` : ''}
      ${slide.cta ? `<div style="display:inline-flex;align-items:center;gap:14px;padding:28px 60px;border-radius:16px;background:linear-gradient(135deg,${colors.primary},${colors.secondary});box-shadow:0 16px 48px ${colors.primary}40;">
        <span style="font-size:34px;font-weight:700;color:#fff;">${escapeHtml(slide.cta)}</span>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>` : ''}
    </div>
    ${editorialFooter(colors)}
  </div>
  </body></html>`
}

function editorialSlideHtml(slide: SlideContent, colors: BrandColors, slideIndex: number, total: number, logoUrl?: string, profile?: RenderProfile): string {
  switch (slide.type) {
    case 'cover': return editorialCoverTemplate(slide, colors, slideIndex, total, logoUrl, profile)
    case 'cta':   return editorialCtaTemplate(slide, colors, slideIndex, total, logoUrl, profile)
    default:      return editorialContentTemplate(slide, colors, slideIndex, total, logoUrl, profile)
  }
}

// ─── Dark template (dark mode, bold) ─────────────────────────────────────────

function darkLogoHtml(logoUrl: string | undefined): string {
  if (!logoUrl) return ''
  return `<div style="position:absolute;bottom:40px;right:44px;width:72px;height:72px;border-radius:14px;background:rgba(255,255,255,0.1);padding:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <img src="${escapeHtml(logoUrl)}" style="max-width:100%;max-height:100%;object-fit:contain;" />
  </div>`
}

function darkCoverTemplate(slide: SlideContent, colors: BrandColors, logoUrl?: string): string {
  const hasImage = !!slide.imageUrl
  const bodyBg = hasImage
    ? `background-image:linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)),url('${slide.imageUrl}');background-size:cover;background-position:center;`
    : `background:#0F172A;`

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    html,body { width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased; }
    body { ${bodyBg} }
    .slide { width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;overflow:hidden; }
    .top-bar { height:6px;background:linear-gradient(90deg,${colors.primary},${colors.secondary});flex-shrink:0; }
    .content { flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:0 88px;position:relative;z-index:1; }
  </style></head><body>
  <div class="slide">
    <div class="top-bar"></div>
    <div class="content">
      ${slide.subtitle ? `<div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:40px;align-self:flex-start;">
        <div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,${colors.primary},${colors.secondary});"></div>
        <span style="font-size:26px;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;">${escapeHtml(slide.subtitle)}</span>
      </div>` : ''}
      <h1 style="font-size:96px;font-weight:900;color:#FFFFFF;line-height:1.02;letter-spacing:-2.5px;margin-bottom:40px;">${escapeHtml(slide.title)}</h1>
      ${slide.body ? `<p style="font-size:38px;color:rgba(255,255,255,0.6);line-height:1.5;max-width:860px;">${escapeHtml(slide.body)}</p>` : ''}
      <div style="position:absolute;bottom:60px;left:0;display:flex;align-items:center;gap:12px;color:rgba(255,255,255,0.5);font-size:24px;">
        Deslize
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
    ${darkLogoHtml(logoUrl)}
  </div>
  </body></html>`
}

function darkContentTemplate(slide: SlideContent, colors: BrandColors, slideNum: number, total: number, logoUrl?: string): string {
  const bullets = slide.bullets ?? []
  const hasImage = !!slide.imageUrl
  const bodyBg = hasImage
    ? `background-image:linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)),url('${slide.imageUrl}');background-size:cover;background-position:center;`
    : `background:#0F172A;`

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    html,body { width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased; }
    body { ${bodyBg} }
    .slide { width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;overflow:hidden; }
    .top-bar { height:6px;background:linear-gradient(90deg,${colors.primary},${colors.secondary});flex-shrink:0; }
    .content { flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:56px 80px 64px; }
  </style></head><body>
  <div class="slide">
    <div class="top-bar"></div>
    <div class="content">
      <div>
        <p style="font-size:26px;color:rgba(255,255,255,0.4);font-weight:500;margin-bottom:22px;font-family:'Inter','Helvetica Neue',Arial,sans-serif;"><span style="color:${colors.primary};font-weight:700;">${slideNum}</span> / ${total}</p>
        <h2 style="font-size:66px;font-weight:800;color:#FFFFFF;line-height:1.12;letter-spacing:-1px;margin-bottom:28px;">${escapeHtml(slide.title)}</h2>
        ${slide.body ? `<p style="font-size:30px;color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:28px;">${escapeHtml(slide.body)}</p>` : ''}
        ${bullets.length > 0 ? `<div style="display:flex;flex-direction:column;gap:20px;">
          ${bullets.map(b => `<div style="display:flex;align-items:flex-start;gap:20px;">
            <div style="flex-shrink:0;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,${colors.primary},${colors.secondary});margin-top:12px;"></div>
            <span style="font-size:30px;color:rgba(255,255,255,0.7);line-height:1.5;">${escapeHtml(b)}</span>
          </div>`).join('')}
        </div>` : ''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        ${slide.footer ? `<span style="font-size:23px;color:rgba(255,255,255,0.35);">${escapeHtml(slide.footer)}</span>` : '<span></span>'}
        <div style="display:flex;gap:8px;">
          ${Array.from({ length: total }, (_, i) => `<div style="width:10px;height:10px;border-radius:50%;background:${i + 1 === slideNum ? colors.primary : 'rgba(255,255,255,0.2)'};"></div>`).join('')}
        </div>
      </div>
    </div>
    ${darkLogoHtml(logoUrl)}
  </div>
  </body></html>`
}

function darkCtaTemplate(slide: SlideContent, colors: BrandColors, logoUrl?: string): string {
  const hasImage = !!slide.imageUrl
  const bodyBg = hasImage
    ? `background-image:linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)),url('${slide.imageUrl}');background-size:cover;background-position:center;`
    : `background:#0F172A;`

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    html,body { width:1080px;height:1080px;overflow:hidden;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased; }
    body { ${bodyBg} }
    .slide { width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;overflow:hidden; }
    .top-bar { height:6px;background:linear-gradient(90deg,${colors.primary},${colors.secondary});flex-shrink:0; }
    .content { flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 88px;text-align:center; }
  </style></head><body>
  <div class="slide">
    <div class="top-bar"></div>
    <div class="content">
      <h2 style="font-size:80px;font-weight:900;color:#FFFFFF;line-height:1.07;letter-spacing:-2px;margin-bottom:36px;">${escapeHtml(slide.title)}</h2>
      ${slide.body ? `<p style="font-size:36px;color:rgba(255,255,255,0.8);line-height:1.55;max-width:860px;margin-bottom:64px;">${escapeHtml(slide.body)}</p>` : ''}
      ${slide.cta ? `<div style="display:inline-flex;align-items:center;gap:14px;padding:30px 72px;border-radius:20px;background:linear-gradient(135deg,${colors.primary},${colors.secondary});box-shadow:0 20px 60px ${colors.primary}50;">
        <span style="font-size:36px;font-weight:700;color:#fff;">${escapeHtml(slide.cta)}</span>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>` : ''}
    </div>
    ${darkLogoHtml(logoUrl)}
  </div>
  </body></html>`
}

function darkSlideHtml(slide: SlideContent, colors: BrandColors, slideIndex: number, total: number, logoUrl?: string): string {
  switch (slide.type) {
    case 'cover': return darkCoverTemplate(slide, colors, logoUrl)
    case 'cta':   return darkCtaTemplate(slide, colors, logoUrl)
    default:      return darkContentTemplate(slide, colors, slideIndex, total, logoUrl)
  }
}

export function buildSlideHtml(
  slide: SlideContent,
  colors: BrandColors,
  slideIndex: number,
  total: number,
  logoUrl?: string,
  template: Template = 'classic',
  profile?: RenderProfile
): string {
  if (template === 'editorial') {
    return editorialSlideHtml(slide, colors, slideIndex, total, logoUrl, profile)
  }
  if (template === 'dark') {
    return darkSlideHtml(slide, colors, slideIndex, total, logoUrl)
  }
  // classic (existing switch)
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
