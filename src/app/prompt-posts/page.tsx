import AppShell from '@/components/layout/AppShell'
import PromptPostGenerator from '@/components/prompt-posts/PromptPostGenerator'

export const metadata = { title: 'Prompt Posts | SocialMind' }

export default function PromptPostsPage() {
  return (
    <AppShell>
      <PromptPostGenerator />
    </AppShell>
  )
}
