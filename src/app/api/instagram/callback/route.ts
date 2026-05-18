import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  exchangeCode,
  exchangeForLongLived,
  getAccountInfo,
} from '@/lib/instagram/client'
import { saveToken } from '@/lib/instagram/tokens'

export const runtime = 'nodejs'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

function errorRedirect(msg: string): NextResponse {
  const url = `/settings?error=${encodeURIComponent(msg)}`
  return NextResponse.redirect(new URL(url, process.env.INSTAGRAM_REDIRECT_URI ?? 'http://localhost:3000'))
}

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const metaError = req.nextUrl.searchParams.get('error')

  if (metaError) {
    return errorRedirect('Autorização negada pelo usuário.')
  }

  if (!code || !state) {
    return errorRedirect('Parâmetros inválidos no callback OAuth.')
  }

  const supabase = adminClient()

  // Validate CSRF state
  const { data: oauthState } = await supabase
    .from('oauth_states')
    .select('company_id, expires_at')
    .eq('state', state)
    .single()

  if (!oauthState) {
    return errorRedirect('State OAuth inválido ou expirado.')
  }
  if (new Date(oauthState.expires_at) <= new Date()) {
    return errorRedirect('State OAuth expirado. Tente novamente.')
  }

  const companyId: string = oauthState.company_id

  // Consume state (one-time use)
  await supabase.from('oauth_states').delete().eq('state', state)

  try {
    // Exchange code → short-lived token
    const shortLived = await exchangeCode(code)

    // Exchange → long-lived token
    const longLived = await exchangeForLongLived(shortLived.access_token)

    // Get account info
    const account = await getAccountInfo(longLived.access_token)

    // Persist encrypted token + profile
    await saveToken(companyId, longLived, account)

    const baseUrl = process.env.INSTAGRAM_REDIRECT_URI
      ?.replace('/api/instagram/callback', '') ?? 'http://localhost:3000'

    return NextResponse.redirect(`${baseUrl}/settings?connected=true`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao conectar Instagram'
    return errorRedirect(msg)
  }
}
