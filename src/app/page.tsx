import AppShell from '@/components/layout/AppShell'
import DashboardPage from '@/components/dashboard/DashboardPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard — SocialMind',
}

export default function Home() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  )
}
