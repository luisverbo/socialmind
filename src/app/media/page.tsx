import AppShell from '@/components/layout/AppShell'
import MediaPage from '@/components/media/MediaPage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Mídia — SocialMind' }

export default function Page() {
  return (
    <AppShell>
      <MediaPage />
    </AppShell>
  )
}
