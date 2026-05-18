import AppShell from '@/components/layout/AppShell'
import PostsPage from '@/components/posts/PostsPage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Posts — SocialMind' }

export default function Page() {
  return (
    <AppShell>
      <PostsPage />
    </AppShell>
  )
}
