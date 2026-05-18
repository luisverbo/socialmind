export interface BrandColors {
  primary: string
  secondary: string
  accent: string
}

export interface SlideContent {
  slide: number
  type: 'cover' | 'content' | 'cta' | 'image'
  title: string
  subtitle?: string
  body?: string
  bullets?: string[]
  cta?: string
  imageUrl?: string
  footer?: string
}

export interface CarouselContent {
  slides: SlideContent[]
  caption: string
}

export interface GenerateCarouselInput {
  companyId: string
  scheduleId: string | null
  theme: string
  tone: 'educational' | 'motivational' | 'promotional'
  slidesCount: number
  publishMode: 'automatic' | 'review'
}

export interface CompanyContext {
  id: string
  company_id: string
  business_name: string
  niche: string
  city: string | null
  what_sells: string | null
  target_audience: string | null
  differentials: string | null
  tone_of_voice: string | null
  forbidden_words: string | null
  post_examples: string | null
  brand_colors: BrandColors | null
  logo_url: string | null
  slide_style: string | null
  system_prompt: string | null
}

export interface MediaItem {
  id: string
  url: string
  category: string
  description: string | null
}
