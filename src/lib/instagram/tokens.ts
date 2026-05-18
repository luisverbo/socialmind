import { createClient } from '@supabase/supabase-js'
import { encryptToken, decryptToken } from './crypto'
import type { IGAccount, LongLivedToken } from './client'

export interface StoredToken {
  id: string
  company_id: string
  access_token_raw: string       // decrypted, never persisted
  token_expires_at: string
  instagram_account_id: string
  instagram_username: string
  profile_picture_url: string | null
  followers_count: number | null
  media_count: number | null
  created_at: string
  updated_at: string
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

/** Upsert token + account info for a company. */
export async function saveToken(
  companyId: string,
  tokenData: LongLivedToken,
  account: IGAccount
): Promise<void> {
  const supabase = adminClient()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
  const encrypted = encryptToken(tokenData.access_token)

  const { error } = await supabase.from('instagram_tokens').upsert(
    {
      company_id:           companyId,
      access_token:         encrypted,
      token_expires_at:     expiresAt,
      instagram_account_id: account.id,
      instagram_username:   account.username,
      profile_picture_url:  account.profile_picture_url ?? null,
      followers_count:      account.followers_count ?? null,
      media_count:          account.media_count ?? null,
      updated_at:           new Date().toISOString(),
    },
    { onConflict: 'company_id' }
  )
  if (error) throw new Error(`Erro ao salvar token: ${error.message}`)
}

/** Fetch and decrypt a company's token. Returns null if not connected. */
export async function getToken(companyId: string): Promise<StoredToken | null> {
  const supabase = adminClient()
  const { data, error } = await supabase
    .from('instagram_tokens')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error || !data) return null

  return {
    ...data,
    access_token_raw: decryptToken(data.access_token),
  } as StoredToken
}

/** Delete a company's token (disconnect). */
export async function deleteToken(companyId: string): Promise<void> {
  const supabase = adminClient()
  await supabase.from('instagram_tokens').delete().eq('company_id', companyId)
}

/** Return all tokens expiring within the next `withinDays` days. */
export async function getExpiringTokens(withinDays = 10): Promise<StoredToken[]> {
  const supabase = adminClient()
  const threshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('instagram_tokens')
    .select('*')
    .lte('token_expires_at', threshold)

  return (data ?? []).map(row => ({
    ...row,
    access_token_raw: decryptToken(row.access_token),
  })) as StoredToken[]
}

/** Update an existing token record after refresh. */
export async function updateToken(
  companyId: string,
  tokenData: LongLivedToken
): Promise<void> {
  const supabase = adminClient()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
  const encrypted = encryptToken(tokenData.access_token)

  const { error } = await supabase
    .from('instagram_tokens')
    .update({
      access_token:     encrypted,
      token_expires_at: expiresAt,
      updated_at:       new Date().toISOString(),
    })
    .eq('company_id', companyId)

  if (error) throw new Error(`Erro ao atualizar token: ${error.message}`)
}
