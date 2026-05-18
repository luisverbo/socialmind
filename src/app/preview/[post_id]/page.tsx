export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PostPreview from '@/components/preview/PostPreview'
import type { Post } from '@/types/scheduling'

interface Props {
  params: { post_id: string }
}

async function getPost(postId: string): Promise<Post | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase
    .from('posts')
    .select('*, post_schedules(*, content_themes(*))')
    .eq('id', postId)
    .single()

  if (error || !data) return null
  return data as Post
}

export default async function PreviewPage({ params }: Props) {
  const post = await getPost(params.post_id)
  if (!post) notFound()
  return <PostPreview post={post} />
}
