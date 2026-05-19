import { anthropic } from '@/lib/anthropic'
import type { CarouselContent, CompanyContext, MediaItem, SlideContent } from './types'

const TONE_MAP = {
  educational: 'educativo e informativo',
  motivational: 'motivacional e inspirador',
  promotional: 'promocional e persuasivo',
}

// Hook formulas proven to stop the scroll on Instagram
const HOOK_FORMULAS = `
FÓRMULAS DE GANCHO PARA O SLIDE 1 (escolha UMA e adapte ao tema):
1. NÚMERO + PROMESSA INESPERADA  → "7 erros que fazem você perder clientes sem perceber"
2. O QUE NINGUÉM TE CONTA       → "O que ninguém te conta sobre [tema]"
3. INVERSÃO DO SENSO COMUM      → "Parar de [hábito comum] foi o que mais aumentou meu [resultado]"
4. PERGUNTA QUE FAZ PENSAR      → "Você sabia que 90% das pessoas [problema comum]?"
5. REVELAÇÃO + URGÊNCIA         → "Descobri [coisa] e mudou tudo. Mas poucos sabem disso."
6. ANTES/DEPOIS                 → "Eu costumava [problema] até descobrir [solução]"
7. AVISO/ALERTA                 → "Se você faz [coisa comum], pare agora e leia isso"
8. SEGREDO/BASTIDORES           → "O segredo que [referência do setor] não quer que você saiba"
9. RESULTADO ESPECÍFICO         → "Como consegui [resultado concreto] em [prazo curto]"
10. CONTRA-INTUITIVO            → "A estratégia que parece errada mas triplica [resultado]"

REGRAS DO GANCHO PERFEITO:
- Máx 8 palavras no título principal (impacto imediato)
- Gera curiosidade sem entregar a resposta
- Faz o leitor pensar "preciso ver o resto"
- Usa números concretos quando possível
- NUNCA use títulos genéricos como "Dicas de marketing" ou "Como ter sucesso"`

function buildSystemPrompt(ctx: CompanyContext, mediaItems: MediaItem[]): string {
  const mediaSection = mediaItems.length > 0
    ? `\n\nIMAGENS DISPONÍVEIS NA BIBLIOTECA:\n${mediaItems.slice(0, 10).map(m => `- [${m.category}] ${m.url}${m.description ? ' — ' + m.description : ''}`).join('\n')}`
    : ''

  if (ctx.system_prompt) {
    return ctx.system_prompt + mediaSection
  }

  return `Você é um copywriter especializado em conteúdo viral para Instagram da empresa "${ctx.business_name}".

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

PRINCÍPIOS DE QUALIDADE:
- Conteúdo em português brasileiro, direto e sem jargões
- Cada slide tem UMA ideia clara — sem sobrecarregar
- Linguagem adequada ao público-alvo da empresa
- Textos concisos: títulos impactantes, bullets curtos e práticos`
}

function buildUserPrompt(
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional',
  slidesCount: number,
  mediaItems: MediaItem[]
): string {
  const imageUrls = mediaItems.filter(m => m.url).slice(0, 5).map(m => m.url)
  const hasImages = imageUrls.length > 0
  const seed = `${new Date().toISOString().slice(0, 16)}-${Math.random().toString(36).slice(2, 7)}`

  return `[ID único: ${seed}]

Crie um carrossel de Instagram com ${slidesCount} slides sobre: "${theme}"
Tom: ${TONE_MAP[tone]}

${HOOK_FORMULAS}

ESTRUTURA DOS ${slidesCount} SLIDES:

SLIDE 1 — CAPA (type: "cover")
Aplicar obrigatoriamente uma das fórmulas de gancho acima.
- title: gancho principal (máx 8 palavras, sem ponto final)
- subtitle: categoria/tema em 2-3 palavras (ex: "MARKETING DIGITAL")
- body: complemento que intensifica a curiosidade (1 frase, máx 12 palavras)

SLIDES 2 a ${slidesCount - 1} — CONTEÚDO (type: "content")
Cada slide = um tópico prático e acionável.
- title: nome do tópico (curto e direto)
- bullets: 2 a 4 pontos concisos, práticos, que entregam valor real
- body: contexto opcional, apenas se necessário (máx 1 frase)

SLIDE ${slidesCount} — CTA (type: "cta")
Fechar com uma chamada clara e motivadora.
- title: frase de fechamento impactante
- body: benefício direto de agir agora
- cta: texto do botão (ex: "Salva esse post!", "Compartilha com alguém!")
- subtitle: instrução secundária (ex: "Mais dicas nos stories")

VARIAÇÃO OBRIGATÓRIA: use um ângulo ÚNICO e SURPREENDENTE para este tema — nunca o óbvio.
${hasImages ? `\nUse imagens da biblioteca quando fizer sentido (type: "image"):\n${imageUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n` : ''}

Retorne SOMENTE JSON válido, sem markdown:
{
  "slides": [
    {"slide":1,"type":"cover","title":"...","subtitle":"...","body":"..."},
    {"slide":2,"type":"content","title":"...","bullets":["...","...","..."],"body":"..."},
    {"slide":${slidesCount},"type":"cta","title":"...","body":"...","cta":"...","subtitle":"..."}
  ],
  "caption": "Legenda com até 2200 caracteres, emojis naturais e 5 hashtags relevantes no final"
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
    model: 'claude-haiku-4-5-20251001', // ~75% cheaper than Sonnet, excellent for structured JSON
    max_tokens: 2500,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }, // caches system prompt per company context
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

  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed: CarouselContent
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error(`Modelo retornou JSON inválido: ${text.slice(0, 200)}`)
  }

  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Modelo não retornou slides válidos')
  }

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
