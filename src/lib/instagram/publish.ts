import { createClient } from '@supabase/supabase-js'
import {
  createImageContainer,
  createCarouselContainer,
  publishContainer,
} from './client'
import { getToken } from './tokens'

// No per-attempt timeout — Vercel's maxDuration (55s) handles the overall limit.
// Zero retries: a single clean attempt fits within the 55s window.
const MAX_RETRIES = 0

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
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

  // 3. Create individual image containers (sequential, no delay needed)
  const childIds: string[] = []
  for (const url of images) {
    const id = await createImageContainer(igUserId, url, accessToken)
    childIds.push(id)
  }

  // 4. Create carousel container
  const caption    = post.caption ?? ''
  const carouselId = await createCarouselContainer(igUserId, childIds, caption, accessToken)

  // 5. Publish — once this succeeds the post IS live on Instagram
  const igPostId = await publishContainer(igUserId, carouselId, accessToken)

  // 6. Update post record — critical: must persist igPostId before anything else
  await supabase
    .from('posts')
    .update({
      status:            'published',
      instagram_post_id: igPostId,
      published_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    })
    .eq('id', postId)

  // 7-8. Best-effort housekeeping — errors here must NOT undo the publish
  try {
    await supabase.rpc('increment_posts_used', { p_company_id: post.company_id })
  } catch (e) {
    console.error('[publish] increment_posts_used failed (non-fatal):', e)
  }
  try {
    await supabase.from('notifications').insert({
      company_id: post.company_id,
      type:       'post_published',
      message:    `Carrossel publicado no Instagram com sucesso! ID: ${igPostId}`,
      read:       false,
    })
  } catch (e) {
    console.error('[publish] notification insert failed (non-fatal):', e)
  }

  return igPostId
}

export async function publishToInstagram(postId: string): Promise<string> {
  const supabase = adminClient()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      return await runPublish(postId)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, attempt * 2000))
      }
    }
  }

  // Only mark as failed if Instagram publish didn't actually succeed
  // (check instagram_post_id to avoid overwriting a real publish)
  const { data: currentPost } = await supabase
    .from('posts')
    .select('company_id, instagram_post_id')
    .eq('id', postId)
    .single()

  if (currentPost?.instagram_post_id) {
    // Instagram publish succeeded — don't overwrite with 'failed'
    console.error('[publish] Post published on Instagram but housekeeping failed:', lastError?.message)
    return currentPost.instagram_post_id
  }

  await supabase
    .from('posts')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', postId)

  if (currentPost) {
    await supabase.from('notifications').insert({
      company_id: currentPost.company_id,
      type:       'post_failed',
      message:    `Falha ao publicar no Instagram: ${lastError?.message}`,
      read:       false,
    })
  }

  throw lastError ?? new Error('Publicação falhou após múltiplas tentativas')
}
