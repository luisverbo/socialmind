import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// GET /api/unsplash-search?q=business+team&page=1
// Proxies to Unsplash API (keeps access key server-side)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q    = searchParams.get('q') ?? ''
  const page = searchParams.get('page') ?? '1'

  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 })

  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return NextResponse.json({ results: [], total: 0, message: 'Unsplash not configured' })

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=squarish&per_page=12&page=${page}&client_id=${key}`
    const res = await fetch(url, { headers: { 'Accept-Version': 'v1' } })
    if (!res.ok) return NextResponse.json({ results: [], total: 0 })
    const data = await res.json()

    const results = (data.results ?? []).map((p: {
      id: string
      urls: { regular: string; thumb: string }
      user: { name: string; username: string }
      links: { html: string; download_location: string }
    }) => ({
      id: p.id,
      thumbUrl: p.urls.thumb,
      regularUrl: p.urls.regular,
      photographer: p.user.name,
      photographerUrl: `https://unsplash.com/@${p.user.username}`,
      pageUrl: p.links.html,
      downloadLocation: p.links.download_location,
    }))

    return NextResponse.json({ results, total: data.total ?? 0 })
  } catch {
    return NextResponse.json({ results: [], total: 0 })
  }
}

// POST /api/unsplash-search  — trigger download (Unsplash attribution requirement)
export async function POST(req: NextRequest) {
  const { downloadLocation } = await req.json()
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key || !downloadLocation) return NextResponse.json({ ok: true })
  try {
    await fetch(`${downloadLocation}&client_id=${key}`)
  } catch { /* best-effort */ }
  return NextResponse.json({ ok: true })
}
