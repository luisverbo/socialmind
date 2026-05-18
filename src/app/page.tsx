import { redirect } from 'next/navigation'

export default function Home() {
  // Client-side redirect handled by middleware or layout
  // Default: go to scheduling (AppShell redirects to onboarding if no company_id)
  redirect('/scheduling')
}
