import AppShell from '@/components/layout/AppShell'
import SettingsPage from '@/components/settings/SettingsPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Configurações — SocialMind',
}

export default function Page() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  )
}
