import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { buildAuthUrl } from '@/lib/instagram/client'
import { isRateLimited } from '@/lib/instagram/rate-limit'

export const runtime = 'nodejs'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (await isRateLimited(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 minuto.' }, { status: 429 })
  }

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) {
    return NextResponse.json({ error: 'company_id é obrigatório' }, { status: 400 })
  }

  // Validate company exists
  const supabase = adminClient()
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  // Generate CSRF state and persist it
  const state = randomUUID()
  await supabase.from('oauth_states').insert({
    company_id: companyId,
    state,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  // Cleanup old states for this company
  await supabase
    .from('oauth_states')
    .delete()
    .eq('company_id', companyId)
    .neq('state', state)

  const authUrl = buildAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
