// Client-safe — no Node.js imports. Shared between client components and server renderer.

export interface HeadlineStyle {
  id:        string
  label:     string
  textColor: string
  bgColor:   string
  gradient?: string
}

export const HEADLINE_STYLES: HeadlineStyle[] = [
  { id: 'purple-white',   label: 'Roxo + Branco',      textColor: '#FFFFFF', bgColor: '#6C3FE8' },
  { id: 'gradient-white', label: 'Gradiente + Branco',  textColor: '#FFFFFF', bgColor: '',       gradient: 'linear-gradient(135deg,#6C3FE8,#E84393)' },
  { id: 'black-yellow',   label: 'Preto + Amarelo',     textColor: '#FFD700', bgColor: '#000000' },
  { id: 'white-purple',   label: 'Branco + Roxo',       textColor: '#6C3FE8', bgColor: '#FFFFFF' },
  { id: 'red-white',      label: 'Vermelho + Branco',   textColor: '#FFFFFF', bgColor: '#E84343' },
  { id: 'transparent',    label: 'Sem fundo + Branco',  textColor: '#FFFFFF', bgColor: 'transparent' },
]
