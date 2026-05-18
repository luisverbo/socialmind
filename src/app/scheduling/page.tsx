import AppShell from '@/components/layout/AppShell'
import SchedulingPage from '@/components/scheduling/SchedulingPage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <AppShell>
      <SchedulingPage />
    </AppShell>
  )
}
