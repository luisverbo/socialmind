const IG_API  = 'https://api.instagram.com'
const GRAPH   = 'https://graph.instagram.com'
const GRAPH_V = 'https://graph.instagram.com/v21.0'

function cfg() {
  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirect  = process.env.INSTAGRAM_REDIRECT_URI
  if (!appId || !appSecret || !redirect) {
    throw new Error('META_APP_ID, META_APP_SECRET e INSTAGRAM_REDIRECT_URI são obrigatórias')
  }
  return { appId, appSecret, redirect }
}

export interface ShortLivedToken { access_token: string; user_id: string }
export interface LongLivedToken  { access_token: string; token_type: string; expires_in: number }
export interface IGAccount {
  id: string
  username: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
}

/** Build the Meta OAuth authorization URL. */
export function buildAuthUrl(state: string): string {
  const { appId, redirect } = cfg()
  const params = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  redirect,
    scope:         'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments',
    response_type: 'code',
    state,
  })
  return `${IG_API}/oauth/authorize?${params}`
}

/** Exchange authorization code for a short-lived token. */
export async function exchangeCode(code: string): Promise<ShortLivedToken> {
  const { appId, appSecret, redirect } = cfg()
  const body = new URLSearchParams({
    client_id:     appId,
    client_secret: appSecret,
    grant_type:    'authorization_code',
    redirect_uri:  redirect,
    code,
  })
  const res = await fetch(`${IG_API}/oauth/access_token`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error_message ?? 'Erro ao trocar código por token')
  return data as ShortLivedToken
}

/** Exchange short-lived token for a long-lived token (~60 days). */
export async function exchangeForLongLived(shortToken: string): Promise<LongLivedToken> {
  const { appId, appSecret } = cfg()
  const params = new URLSearchParams({
    grant_type:    'ig_exchange_token',
    client_id:     appId,
    client_secret: appSecret,
    access_token:  shortToken,
  })
  const res = await fetch(`${GRAPH}/access_token?${params}`)
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error?.message ?? 'Erro ao obter long-lived token')
  return data as LongLivedToken
}

/** Refresh an existing long-lived token (valid for another 60 days). */
export async function refreshLongLivedToken(token: string): Promise<LongLivedToken> {
  const params = new URLSearchParams({
    grant_type:   'ig_refresh_token',
    access_token: token,
  })
  const res = await fetch(`${GRAPH}/refresh_access_token?${params}`)
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error?.message ?? 'Erro ao renovar token')
  return data as LongLivedToken
}

/** Get basic Instagram account info. */
export async function getAccountInfo(token: string): Promise<IGAccount> {
  const params = new URLSearchParams({
    fields:       'id,username,profile_picture_url,followers_count,media_count',
    access_token: token,
  })
  const res = await fetch(`${GRAPH}/me?${params}`)
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error?.message ?? 'Erro ao buscar dados da conta')
  return data as IGAccount
}

/** Create an individual image container for a carousel item. */
export async function createImageContainer(
  igUserId: string,
  imageUrl: string,
  token: string
): Promise<string> {
  const body = new URLSearchParams({
    image_url:         imageUrl,
    is_carousel_item:  'true',
    access_token:      token,
  })
  const res = await fetch(`${GRAPH_V}/${igUserId}/media`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error?.message ?? `Erro ao criar container de imagem: ${imageUrl}`)
  return data.id as string
}

/** Poll a media container until its status_code is FINISHED (or ERROR/timeout). */
export async function waitForContainer(
  containerId: string,
  token: string,
  maxWaitMs = 30_000
): Promise<void> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const params = new URLSearchParams({ fields: 'status_code', access_token: token })
    const res  = await fetch(`${GRAPH_V}/${containerId}?${params}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? `Erro ao verificar status do container ${containerId}`)
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error(`Container ${containerId} falhou no processamento`)
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error(`Container ${containerId} não ficou pronto em ${maxWaitMs / 1000}s`)
}

/** Create a single image container (for posts with only 1 image). */
export async function createSingleImageContainer(
  igUserId: string,
  imageUrl: string,
  caption: string,
  token: string
): Promise<string> {
  const body = new URLSearchParams({
    image_url:    imageUrl,
    caption:      caption,
    access_token: token,
  })
  const res = await fetch(`${GRAPH_V}/${igUserId}/media`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error?.message ?? `Erro ao criar container de imagem: ${imageUrl}`)
  return data.id as string
}

/** Create a carousel container from individual item IDs. */
export async function createCarouselContainer(
  igUserId: string,
  childIds: string[],
  caption: string,
  token: string
): Promise<string> {
  const body = new URLSearchParams({
    media_type:   'CAROUSEL',
    children:     childIds.join(','),
    caption:      caption,
    access_token: token,
  })
  const res = await fetch(`${GRAPH_V}/${igUserId}/media`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error?.message ?? 'Erro ao criar container do carrossel')
  return data.id as string
}

/** Publish a container (single or carousel). */
export async function publishContainer(
  igUserId: string,
  creationId: string,
  token: string
): Promise<string> {
  const body = new URLSearchParams({
    creation_id:  creationId,
    access_token: token,
  })
  const res = await fetch(`${GRAPH_V}/${igUserId}/media_publish`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error?.message ?? 'Erro ao publicar carrossel')
  return data.id as string
}
