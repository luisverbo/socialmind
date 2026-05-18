import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

// Impede pré-renderização estática: a página usa env vars e localStorage no cliente
export const dynamic = 'force-dynamic'

export default function OnboardingPage() {
  return <OnboardingWizard />
}
