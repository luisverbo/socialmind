import { NextRequest, NextResponse } from 'next/server'
import { generateCarousel } from '@/lib/carousel'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_id, schedule_id, theme, tone, slides_count, publish_mode } = body

    if (!company_id || !theme || !tone || !slides_count) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: company_id, theme, tone, slides_count' },
        { status: 400 }
      )
    }

    const postId = await generateCarousel({
      companyId: company_id,
      scheduleId: schedule_id ?? null,
      theme,
      tone,
      slidesCount: Number(slides_count),
      publishMode: publish_mode ?? 'review',
    })

    return NextResponse.json({ success: true, post_id: postId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
