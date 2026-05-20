import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateWeekPlan } from '@/lib/carousel/generator'

export const runtime    = 'nodejs'
export const maxDuration = 30

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { company_id, theme, tone, count } = await req.json()

    if (!company_id || !theme) {
      return NextResponse.json({ error: 'company_id e theme são obrigatórios' }, { status: 400 })
    }

    const validTone = (['educational', 'motivational', 'promotional'] as const).includes(tone)
      ? tone as 'educational' | 'motivational' | 'promotional'
      : 'educational'

    const validCount = Math.min(Math.max(Number(count) || 7, 1), 14)

    const supabase = adminClient()

    const { data: ctx, error: ctxErr } = await supabase
      .from('company_context')
      .select('*')
      .eq('company_id', company_id)
      .single()

    if (ctxErr || !ctx) {
      return NextResponse.json({ error: 'Contexto da empresa não encontrado' }, { status: 404 })
    }

    const plan = await generateWeekPlan(ctx, theme, validTone, validCount)

    return NextResponse.json({ plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[generate-week-plan]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
