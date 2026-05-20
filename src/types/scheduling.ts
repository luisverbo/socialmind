export interface Company {
  id: string
  name: string
  email: string
  plan: 'starter' | 'pro' | 'agency'
  posts_limit: number
  posts_used_this_month: number
  credits_balance: number
  credits_limit: number
  credits_used_this_month: number
  reset_date: string
  active: boolean
}

export interface ContentTheme {
  id: string
  theme_name: string
  tone: 'educational' | 'motivational' | 'promotional'
  slides_count: number
}

export interface PostSchedule {
  id: string
  company_id: string
  theme_id: string | null
  type: 'recurring' | 'one_time' | 'daily'
  day_of_week: string | null
  scheduled_date: string | null
  scheduled_time: string
  publish_mode: 'automatic' | 'review'
  status: 'active' | 'paused'
  repeat: boolean
  created_at: string
  content_themes?: ContentTheme | null
}

export interface SlideContent {
  slide: number
  title?: string
  text?: string
}

export interface Post {
  id: string
  company_id: string
  schedule_id: string | null
  content: SlideContent[]
  slides_html: unknown[]
  slides_images: string[]
  caption: string | null
  instagram_post_id: string | null
  status: 'draft' | 'waiting' | 'approved' | 'published' | 'failed' | 'rejected'
  approved_at: string | null
  published_at: string | null
  scheduled_for: string | null
  created_at: string
  post_schedules?: PostSchedule | null
}

export const STATUS_CONFIG: Record<Post['status'], { label: string; dot: string; badge: string }> = {
  draft:     { label: 'Agendado',   dot: 'bg-blue-400',   badge: 'bg-blue-50 border-blue-200 text-blue-600' },
  waiting:   { label: 'Aguardando', dot: 'bg-amber-400',  badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  approved:  { label: 'Aprovado',   dot: 'bg-purple-400', badge: 'bg-purple-50 border-purple-200 text-purple-600' },
  published: { label: 'Publicado',  dot: 'bg-green-500',  badge: 'bg-green-50 border-green-200 text-green-700' },
  failed:    { label: 'Falhou',     dot: 'bg-red-400',    badge: 'bg-red-50 border-red-200 text-red-600' },
  rejected:  { label: 'Rejeitado',  dot: 'bg-gray-300',   badge: 'bg-gray-100 border-gray-200 text-gray-500' },
}

export const DAY_OF_WEEK_OPTIONS = [
  { value: 'monday',    label: 'Segunda-feira' },
  { value: 'tuesday',   label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday',  label: 'Quinta-feira' },
  { value: 'friday',    label: 'Sexta-feira' },
  { value: 'saturday',  label: 'Sábado' },
  { value: 'sunday',    label: 'Domingo' },
]

export const DAY_SHORT: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
}

export const PLAN_LABELS: Record<Company['plan'], string> = {
  starter: 'Starter', pro: 'Pro', agency: 'Agency',
}
