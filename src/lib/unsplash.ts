// Unsplash photo search + download tracking
// UNSPLASH_ACCESS_KEY env var required

export interface UnsplashPhoto {
  url: string                // regular size URL
  photographer: string
  photographerUrl: string
  photoPageUrl: string
  photoId: string
}

export async function searchUnsplashPhoto(
  query: string,
  orientation: 'squarish' | 'landscape' | 'portrait' = 'squarish'
): Promise<UnsplashPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    console.warn('[unsplash] UNSPLASH_ACCESS_KEY is not set — skipping photo search')
    return null
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=8&client_id=${key}`
    const res = await fetch(url)
    const result = await res.json()

    if (!result.results || result.results.length === 0) return null

    const photo = result.results[Math.floor(Math.random() * result.results.length)]

    // Fire-and-forget download tracking (Unsplash attribution requirement)
    fetch(`${photo.links.download_location}&client_id=${key}`).catch(() => {})

    console.log(`[unsplash] photo found for "${query}": ${photo.id}`)

    return {
      url: photo.urls.regular,
      photographer: photo.user.name,
      photographerUrl: 'https://unsplash.com/@' + photo.user.username,
      photoPageUrl: photo.links.html,
      photoId: photo.id,
    }
  } catch {
    return null
  }
}
