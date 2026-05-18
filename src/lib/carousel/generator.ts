import { anthropic } from '@/lib/anthropic'
import type { CarouselContent, CompanyContext, MediaItem, SlideContent } from './types'

const TONE_MAP = {
  educational: 'educativo e informativo',
  motivational: 'motivacional e inspirador',
  promotional: 'promocional e persuasivo',
}

function buildSystemPrompt(ctx: CompanyContext, mediaItems: MediaItem[]): string {
  const mediaSection = mediaItems.length > 0
    ? `\n\nIMGENS DISPONÍVEIS NA BIBLIOTECA:\n${mediaItems.slice(0, 10).map(m => `- [${m.category}] ${m.url}${m.description ? ' — ' + m.description : ''}`).join('\n')}`
    : ''

  if (ctx.system_prompt) {
    return ctx.system_prompt + mediaSection
  }

  return `Você é um especialista em criação de conteúdo para Instagram para a empresa "${ctx.business_name}".

SOBRE O NEGÓCIO:
- Nicho: ${ctx.niche}
- Cidade: ${ctx.city ?? 'não informada'}
- O que vende: ${ctx.what_sells ?? 'não informado'}
- Público-alvo: ${ctx.target_audience ?? 'não informado'}
- Diferenciais: ${ctx.differentials ?? 'não informado'}

TOM DE VOZ:
${ctx.tone_of_voice ?? 'Profissional e acessível'}

${ctx.forbidden_words ? `PALAVRAS PROIBIDAS (nunca usar): ${ctx.forbidden_words}` : ''}
${ctx.post_examples ? `\nEXEMPLOS DE POSTS ANTERIORES:\n${ctx.post_examples}` : ''}
${mediaSection}

REGRAS GERAIS:
- Crie conteúdo em português brasileiro
- Seja direto e conciso em cada slide
- Use linguagem adequada ao público-alvo
- Não use jargões ou termos técnicos desnecessários
- Cada slide deve ter uma mensagem clara e única`
}

function buildUserPrompt(
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional',
  slidesCount: number,
  mediaItems: MediaItem[]
): string {
  const imageUrls = mediaItems.filter(m => m.url).slice(0, 5).map(m => m.url)
  const hasImages = imageUrls.length > 0

  return `Crie um carrossel de Instagram com ${slidesCount} slides sobre o tema: "${theme}".

Tom: ${TONE_MAP[tone]}

ESTRUTURA OBRIGATÓRIA:
- Slide 1: tipo "cover" — título impactante e subtítulo que gera curiosidade
- Slides 2 a ${slidesCount - 1}: tipo "content" — conteúdo principal dividido em tópicos claros
- Último slide: tipo "cta" — call-to-action poderoso e direto

${hasImages ? `IMPORTANTE: Use imagens da biblioteca quando fizer sentido (tipo "image"). URLs disponíveis:\n${imageUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n` : ''}

Retorne APENAS um JSON válido (sem markdown, sem explicações) com este formato exato:
{
  "slides": [
    {
      "slide": 1,
      "type": "cover",
      "title": "Título principal",
      "subtitle": "Categoria ou tema breve",
      "body": "Subtítulo ou frase de impacto"
    },
    {
      "slide": 2,
      "type": "content",
      "title": "Título do tópico",
      "body": "Explicação breve (opcional)",
      "bullets": ["Ponto 1", "Ponto 2", "Ponto 3"],
      "footer": "@perfil_da_empresa"
    },
    {
      "slide": ${slidesCount},
      "type": "cta",
      "title": "Chamada para ação",
      "body": "Descrição do benefício",
      "cta": "Texto do botão",
      "subtitle": "Instrução secundária (ex: Link na bio)"
    }
  ],
  "caption": "Legenda completa para o Instagram com até 2200 caracteres, incluindo emojis relevantes e 5 hashtags no final"
}`
}

export async function generateCarouselContent(
  ctx: CompanyContext,
  mediaItems: MediaItem[],
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional',
  slidesCount: number
): Promise<CarouselContent> {
  const systemPrompt = buildSystemPrompt(ctx, mediaItems)
  const userPrompt = buildUserPrompt(theme, tone, slidesCount, mediaItems)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: userPrompt },
    ],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  // Strip potential markdown code fences
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed: CarouselContent
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error(`Claude retornou JSON inválido: ${text.slice(0, 200)}`)
  }

  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Claude não retornou slides válidos')
  }

  // Normalize slide numbers
  const slides: SlideContent[] = parsed.slides.map((s, i) => ({
    slide: i + 1,
    type: s.type ?? 'content',
    title: s.title ?? '',
    subtitle: s.subtitle,
    body: s.body,
    bullets: s.bullets,
    cta: s.cta,
    imageUrl: s.imageUrl,
    footer: s.footer,
  }))

  return { slides, caption: parsed.caption ?? '' }
}
