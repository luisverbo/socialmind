import { NextRequest, NextResponse } from 'next/server'
import { publishToInstagram } from '@/lib/instagram/publish'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { post_id } = await req.json()
    if (!post_id) {
      return NextResponse.json({ error: 'post_id é obrigatório' }, { status: 400 })
    }
    const igPostId = await publishToInstagram(post_id)
    return NextResponse.json({ success: true, ig_post_id: igPostId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao publicar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
