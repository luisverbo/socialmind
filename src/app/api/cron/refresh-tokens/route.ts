import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshLongLivedToken } from '@/lib/instagram/client'
import { getExpiringTokens, updateToken } from '@/lib/instagram/tokens'

export const runtime = 'nodejs'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const expiringTokens = await getExpiringTokens(10)

  if (expiringTokens.length === 0) {
    return NextResponse.json({ refreshed: 0, message: 'Nenhum token próximo de expirar' })
  }

  const results: { company_id: string; status: 'ok' | 'error'; detail?: string }[] = []

  for (const stored of expiringTokens) {
    try {
      const refreshed = await refreshLongLivedToken(stored.access_token_raw)
      await updateToken(stored.company_id, refreshed)
      results.push({ company_id: stored.company_id, status: 'ok' })
      console.log(`[cron/refresh-tokens] ✓ ${stored.company_id} renovado`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ company_id: stored.company_id, status: 'error', detail: msg })
      console.error(`[cron/refresh-tokens] ✗ ${stored.company_id}: ${msg}`)

      // Notify company about failed renewal
      await supabase.from('notifications').insert({
        company_id: stored.company_id,
        type:       'post_failed',
        message:    `Falha ao renovar token do Instagram. Reconecte sua conta antes de ${new Date(stored.token_expires_at).toLocaleDateString('pt-BR')}.`,
        read:       false,
      })
    }
  }

  const refreshed = results.filter(r => r.status === 'ok').length
  const failed    = results.filter(r => r.status === 'error').length

  return NextResponse.json({ refreshed, failed, results })
}
