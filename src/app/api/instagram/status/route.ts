import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/instagram/tokens'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) {
    return NextResponse.json({ error: 'company_id é obrigatório' }, { status: 400 })
  }

  const token = await getToken(companyId)
  if (!token) {
    return NextResponse.json({ connected: false })
  }

  const expiresAt = new Date(token.token_expires_at)
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return NextResponse.json({
    connected:            true,
    username:             token.instagram_username,
    profile_picture_url:  token.profile_picture_url,
    followers_count:      token.followers_count,
    media_count:          token.media_count,
    token_expires_at:     token.token_expires_at,
    days_until_expiry:    daysUntilExpiry,
    expiring_soon:        daysUntilExpiry <= 10,
  })
}
