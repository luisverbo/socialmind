import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishToInstagram } from '@/lib/instagram/publish'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  let post_id: string | undefined
  try {
    const body = await req.json()
    post_id = body?.post_id

    if (!post_id) {
      return NextResponse.json({ error: 'post_id é obrigatório' }, { status: 400 })
    }

    const supabase = adminClient()

    // Fetch post to get company_id
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('id, company_id, status, slides_images')
      .eq('id', post_id)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    if (!Array.isArray(post.slides_images) || post.slides_images.length === 0) {
      return NextResponse.json({ error: 'Post não tem imagens geradas. Gere o carrossel primeiro.' }, { status: 400 })
    }

    // Check Instagram connection before attempting publish
    const { data: igToken } = await supabase
      .from('instagram_tokens')
      .select('id, token_expires_at')
      .eq('company_id', post.company_id)
      .single()

    if (!igToken) {
      return NextResponse.json({
        error: 'Instagram não conectado. Vá em Configurações para conectar.',
      }, { status: 400 })
    }

    if (new Date(igToken.token_expires_at) <= new Date()) {
      return NextResponse.json({
        error: 'Token do Instagram expirado. Vá em Configurações e reconecte.',
      }, { status: 400 })
    }

    console.log(`[publish-now] Starting publish for post ${post_id}, company ${post.company_id}`)
    const igPostId = await publishToInstagram(post_id)
    console.log(`[publish-now] Success — ig_post_id: ${igPostId}`)

    return NextResponse.json({ success: true, ig_post_id: igPostId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao publicar'
    console.error(`[publish-now] Error for post ${post_id}:`, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
