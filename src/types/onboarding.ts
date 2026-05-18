export interface BrandColors {
  primary: string
  secondary: string
  accent: string
}

export interface ContentTheme {
  themeName: string
  tone: 'educational' | 'motivational' | 'promotional'
  slidesCount: 5 | 7 | 10
}

export interface OnboardingState {
  currentStep: number
  companyId: string | null
  contextId: string | null
  // Step 1 — Sobre o negócio
  name: string
  email: string
  phone: string
  plan: 'starter' | 'pro' | 'agency'
  businessName: string
  niche: string
  city: string
  whatSells: string
  targetAudience: string
  differentials: string
  // Step 2 — Tom de voz
  toneOfVoice: string
  forbiddenWords: string
  postExamples: string
  // Step 3 — Identidade visual
  brandColors: BrandColors
  logoUrl: string
  slideStyle: string
  // Step 5 — Temas
  themes: ContentTheme[]
}

export type StepProps = {
  state: OnboardingState
  updateState: (updates: Partial<OnboardingState>) => void
  onNext: () => Promise<void>
  onBack?: () => void
  loading: boolean
}
