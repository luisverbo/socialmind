import { createClient } from '@supabase/supabase-js'
import {
  createImageContainer,
  createCarouselContainer,
  publishContainer,
} from './client'
import { getToken } from './tokens'

const TIMEOUT_MS  = 30_000
const MAX_RETRIES = 2

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout de ${ms / 1000}s excedido`)), ms)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return result
  } catch (e) {
    clearTimeout(timer!)
    throw e
  }
}

async function runPublish(postId: string): Promise<string> {
  const supabase = adminClient()

  // 1. Fetch post
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postErr || !post) throw new Error(`Post ${postId} não encontrado`)

  const images: string[] = Array.isArray(post.slides_images) ? post.slides_images : []
  if (images.length === 0) throw new Error('Post não tem imagens para publicar')

  // 2. Fetch token
  const token = await getToken(post.company_id)
  if (!token) throw new Error(`Empresa ${post.company_id} não tem Instagram conectado`)
  if (new Date(token.token_expires_at) <= new Date()) {
    throw new Error('Token do Instagram expirado. Reconecte a conta.')
  }

  const { access_token_raw: accessToken, instagram_account_id: igUserId } = token

  // 3. Create individual image containers
  const childIds: string[] = []
  for (const url of images) {
    const id = await createImageContainer(igUserId, url, accessToken)
    childIds.push(id)
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  // 4. Create carousel container
  const caption    = post.caption ?? ''
  const carouselId = await createCarouselContainer(igUserId, childIds, caption, accessToken)

  // 5. Publish
  const igPostId = await publishContainer(igUserId, carouselId, accessToken)

  // 6. Update post record
  await supabase
    .from('posts')
    .update({
      status:           'published',
      instagram_post_id: igPostId,
      published_at:     new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .eq('id', postId)

  // 7. Increment usage counter
  await supabase.rpc('increment_posts_used', { p_company_id: post.company_id })

  // 8. Success notification
  await supabase.from('notifications').insert({
    company_id: post.company_id,
    type:       'post_published',
    message:    `Carrossel publicado no Instagram com sucesso! ID: ${igPostId}`,
    read:       false,
  })

  return igPostId
}

export async function publishToInstagram(postId: string): Promise<string> {
  const supabase = adminClient()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      return await withTimeout(runPublish(postId), TIMEOUT_MS)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, attempt * 2000))
      }
    }
  }

  // Mark as failed
  await supabase
    .from('posts')
    .update({
      status:     'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)

  // Fetch company_id for notification
  const { data: post } = await supabase
    .from('posts')
    .select('company_id')
    .eq('id', postId)
    .single()

  if (post) {
    await supabase.from('notifications').insert({
      company_id: post.company_id,
      type:       'post_failed',
      message:    `Falha ao publicar no Instagram: ${lastError?.message}`,
      read:       false,
    })
  }

  throw lastError ?? new Error('Publicação falhou após múltiplas tentativas')
}
