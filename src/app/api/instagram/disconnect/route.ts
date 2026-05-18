import { NextRequest, NextResponse } from 'next/server'
import { deleteToken } from '@/lib/instagram/tokens'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { company_id } = await req.json()
    if (!company_id) {
      return NextResponse.json({ error: 'company_id é obrigatório' }, { status: 400 })
    }
    await deleteToken(company_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
