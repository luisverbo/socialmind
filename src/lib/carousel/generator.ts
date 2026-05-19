import { anthropic } from '@/lib/anthropic'
import type { CarouselContent, CompanyContext, MediaItem, SlideContent } from './types'

const TONE_MAP = {
  educational:  'educativo e informativo',
  motivational: 'motivacional e inspirador',
  promotional:  'promocional e persuasivo',
}

const ANGLE_BANK = {
  educational: [
    { format: 'liste os erros mais comuns que as pessoas cometem', tone: 'revelador' },
    { format: 'tutorial passo a passo ultra prático', tone: 'didático' },
    { format: 'desmistifique uma crença popular do nicho', tone: 'analítico' },
    { format: 'comparação antes/depois com dados concretos', tone: 'informativo' },
    { format: 'checklist definitivo para o tema', tone: 'direto' },
  ],
  motivational: [
    { format: 'conte uma história de virada real (situação → ação → resultado)', tone: 'inspirador' },
    { format: 'momento de decisão — o que separa quem avança de quem fica parado', tone: 'provocativo' },
    { format: 'mindset: a crença limitante que bloqueia o resultado', tone: 'emocional' },
    { format: 'resultado possível — mostre o destino antes do caminho', tone: 'aspiracional' },
    { format: 'lição contraintuitiva aprendida na prática', tone: 'surpreendente' },
  ],
  promotional: [
    { format: 'problema específico → solução clara → resultado esperado', tone: 'persuasivo' },
    { format: 'antes/depois com prova social e número real', tone: 'convincente' },
    { format: 'pergunta provocativa que expõe a dor do público', tone: 'urgente' },
    { format: 'segredo do mercado que a concorrência não conta', tone: 'exclusivo' },
    { format: 'benefício único e específico com dados surpreendentes', tone: 'focado' },
  ],
}

function pickAngle(tone: 'educational' | 'motivational' | 'promotional') {
  const angles = ANGLE_BANK[tone]
  return angles[Math.floor(Math.random() * angles.length)]
}

function buildSystemPrompt(ctx: CompanyContext, mediaItems: MediaItem[]): string {
  const mediaSection = mediaItems.length > 0
    ? `\n\nIMAGENS DISPONÍVEIS NA BIBLIOTECA:\n${mediaItems.slice(0, 10).map(m => `- [${m.category}] ${m.url}${m.description ? ' — ' + m.description : ''}`).join('\n')}`
    : ''

  if (ctx.system_prompt) {
    return ctx.system_prompt + mediaSection
  }

  return `Você é um estrategista de conteúdo sênior especializado em Instagram, criando carrosséis virais para a empresa "${ctx.business_name}".

MISSÃO: Cada carrossel gerado deve ser ÚNICO e DIFERENTE dos anteriores — mesma empresa, ângulos completamente distintos.

REGRAS ANTI-REPETIÇÃO (invioláveis):
- Nunca repita a mesma ideia, ângulo ou estrutura de título
- Nunca comece dois posts com a mesma estrutura de frase
- Varie o tom: às vezes provocativo, às vezes inspirador, às vezes educativo, às vezes urgente
- Cada post deve surpreender — se parece óbvio, reescreva

SOBRE O NEGÓCIO:
- Nicho: ${ctx.niche}
- Cidade: ${ctx.city ?? 'não informada'}
- O que vende: ${ctx.what_sells ?? 'não informado'}
- Público-alvo: ${ctx.target_audience ?? 'não informado'}
- Diferenciais: ${ctx.differentials ?? 'não informado'}
- Tom de voz: ${ctx.tone_of_voice ?? 'Profissional e acessível'}
${ctx.forbidden_words ? `\nPALAVRAS PROIBIDAS (nunca usar): ${ctx.forbidden_words}` : ''}
${ctx.post_examples ? `\nEXEMPLOS DE POSTS ANTERIORES (use como referência de tom e estilo):\n${ctx.post_examples}` : ''}
${mediaSection}

════════════════════════════════════════
LEI Nº 1 — AVATAR ÚNICO (a mais importante)
════════════════════════════════════════

Cada carrossel fala com UMA única pessoa, em UMA situação específica.

❌ ERRADO — falar com todo mundo ao mesmo tempo:
"Este post é para empreendedores, criadores de conteúdo, profissionais de marketing e quem quer crescer online."
→ Resultado: ninguém se identifica, ninguém salva, ninguém comenta.

✅ CERTO — escolher UM avatar e escrever TUDO para ele:
Avatar: "Dono de salão de beleza que tem 300 seguidores e não entende por que ninguém aparece pelo Instagram"
→ Cada slide, cada bullet, cada palavra fala diretamente com essa pessoa.
→ Resultado: ela sente que o post foi escrito especialmente pra ela.

COMO ESCOLHER O AVATAR:
Olhe o público-alvo da empresa e escolha o perfil MAIS ESPECÍFICO E URGENTE:
- Qual é a dor que dói mais agora?
- Quem está mais próximo de comprar/agir?
- Quem vai salvar esse post e mostrar pra um amigo?

TESTE DO AVATAR: leia o slide 1 em voz alta e pergunte "para QUEM exatamente estou falando?" Se a resposta for vaga ("empreendedores em geral"), reescreva até ser específico ("dona de ateliê que vende pelo WhatsApp mas quer parar de depender de indicação").

════════════════════════════════════════
REGRAS ABSOLUTAS DE QUALIDADE
════════════════════════════════════════

BULLETS DE CONTEÚDO — a diferença entre fraco e forte:

❌ FRACO (genérico, óbvio, sem valor):
• "Seja consistente nas redes sociais"
• "Conheça bem o seu público"
• "Invista em marketing digital"
• "Tenha uma boa estratégia"

✅ FORTE (específico, acionável, surpreendente):
• "Poste nos horários 11h–12h e 19h–21h — seu público está online nesses picos"
• "Responda comentários nas primeiras 1h após postar — o algoritmo interpreta como engajamento orgânico"
• "Use exatamente 3–5 hashtags de nicho, não 30 genéricas — alcance maior com menos"
• "Uma sequência de 3 stories por semana converte 40% mais do que posts isolados"

REGRA DE OURO DOS BULLETS:
Cada bullet deve passar no teste: "Eu poderia aplicar isso AMANHÃ?"
Se a resposta for não → reescreva até ser sim.

TÍTULOS DE SLIDES DE CONTEÚDO:
- Devem criar curiosidade ou prometer uma revelação
- Máx 6 palavras
- Nunca repita o tema genérico — aprofunde o ângulo
- Bom: "O erro que 9/10 donos cometem" | Ruim: "Dicas importantes"

LEGENDA (caption):
- Linha 1: pergunta ou afirmação que para o scroll (antes do "ver mais")
- Depois: 2–3 parágrafos curtos que expandem o tema com valor real
- Penúltima linha: CTA claro ("Salva esse post 🔖", "Marca alguém que precisa ver")
- Última linha: 5 hashtags de nicho relevantes (sem hashtags genéricas como #sucesso #vida)

EXEMPLO DE CARROSSEL COMPLETO DE ALTA QUALIDADE:
Tema: "Como usar o Instagram para atrair clientes locais"

Slide 1 (cover):
  title: "Seu negócio invisível para quem está a 2km"
  subtitle: "PRESENÇA LOCAL"
  body: "O erro que faz você perder clientes que já estavam prontos para comprar"

Slide 2 (content):
  title: "Geolocalização ignorada"
  bullets:
    - "Ative a localização em TODOS os posts — aparece nas buscas por bairro"
    - "Use a hashtag da sua cidade + bairro (ex: #padariavila_madalena)"
    - "Stories com figurinha de localização têm 3x mais alcance local"

Slide 3 (content):
  title: "Google Meu Negócio desatualizado"
  bullets:
    - "Foto de perfil diferente do Instagram = desconfiança — use a mesma"
    - "Responda avaliações em até 24h — o algoritmo do Google prioriza isso"
    - "Poste 1 foto nova por semana no GMB: sobe seu ranking local"

Slide 4 (cta):
  title: "Seus clientes estão te procurando agora"
  body: "Aplique esses ajustes hoje e veja novos contatos chegando essa semana"
  cta: "Salva esse post e começa hoje!"
  subtitle: "Mais dicas práticas nos stories"

════════════════════════════════════════
FORMATO DE SAÍDA
════════════════════════════════════════
Retorne SOMENTE JSON válido, sem markdown, sem explicações.`
}

const HOOK_FORMULAS = `FÓRMULAS DE GANCHO PARA O SLIDE 1 (escolha UMA e adapte ao tema):
1. NÚMERO + PROMESSA   → "7 erros que fazem você perder clientes sem perceber"
2. O QUE NINGUÉM CONTA → "O que ninguém te conta sobre [tema]"
3. INVERSÃO            → "Parar de [hábito] foi o que mais aumentou meu [resultado]"
4. PERGUNTA            → "Você sabia que 90% das pessoas [problema comum]?"
5. REVELAÇÃO           → "Descobri [coisa] e mudou tudo — mas poucos sabem disso"
6. AVISO               → "Se você faz [coisa comum], pare agora e leia isso"
7. RESULTADO           → "Como consegui [resultado concreto] em [prazo curto]"
8. CONTRA-INTUITIVO    → "A estratégia que parece errada mas triplica [resultado]"

REGRAS: máx 8 palavras, gera curiosidade SEM entregar a resposta, NUNCA use títulos genéricos.`

function buildUserPrompt(
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional',
  slidesCount: number,
  mediaItems: MediaItem[],
  recentTopics: string[] = []
): string {
  const imageUrls = mediaItems.filter(m => m.url).slice(0, 5).map(m => m.url)
  const hasImages = imageUrls.length > 0
  const seed = `${new Date().toISOString().slice(0, 16)}-${Math.random().toString(36).slice(2, 7)}`
  const angle = pickAngle(tone)

  const recentSection = recentTopics.length > 0
    ? `\nPOSTS ANTERIORES DESTA EMPRESA — evite qualquer semelhança de ideia, título ou ângulo:\n${recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : ''

  return `[ID: ${seed}]

Crie um carrossel com ${slidesCount} slides sobre: "${theme}"
Tom: ${TONE_MAP[tone]}
Avatar: escolha UM perfil específico do público-alvo e escreva TODO o carrossel exclusivamente para essa pessoa — nunca misture perfis diferentes no mesmo carrossel.
${recentSection}
ÂNGULO OBRIGATÓRIO PARA ESTE POST: ${angle.format} — tom ${angle.tone}
Use este ângulo como fio condutor de todos os slides. Não desvie dele.

${HOOK_FORMULAS}

ESTRUTURA OBRIGATÓRIA:

SLIDE 1 — CAPA (type: "cover")
Use UMA das fórmulas de gancho acima.
- title: gancho (máx 8 palavras, sem ponto final)
- subtitle: 2-3 palavras de categoria (ex: "MARKETING DIGITAL")
- body: 1 frase que intensifica a curiosidade (máx 12 palavras)

SLIDES 2 a ${slidesCount - 1} — CONTEÚDO (type: "content")
Cada slide = 1 tópico específico e acionável.
- title: máx 6 palavras, aprofunda o ângulo — NÃO repita o tema genérico
- bullets: 3 pontos FORTES (específicos, com dados ou dicas concretas que o leitor aplica amanhã)
- body: contexto de 1 frase apenas se agregar valor

SLIDE ${slidesCount} — CTA (type: "cta")
- title: frase de fechamento impactante
- body: benefício imediato de agir agora
- cta: texto do botão ("Salva esse post!", "Compartilha com alguém!")
- subtitle: instrução secundária ("Mais dicas nos stories")

ÂNGULO ÚNICO: escolha um ângulo SURPREENDENTE — nunca o óbvio do tema.
${hasImages ? `\nImagens disponíveis (use quando fizer sentido com type "image"):\n${imageUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n` : ''}
Retorne SOMENTE este JSON:
{
  "slides": [
    {"slide":1,"type":"cover","title":"...","subtitle":"...","body":"..."},
    {"slide":2,"type":"content","title":"...","bullets":["...","...","..."],"body":"..."},
    {"slide":${slidesCount},"type":"cta","title":"...","body":"...","cta":"...","subtitle":"..."}
  ],
  "caption": "Legenda: linha 1 para parar o scroll, 2-3 parágrafos com valor, CTA e 5 hashtags de nicho"
}`
}

export async function generateCarouselContent(
  ctx: CompanyContext,
  mediaItems: MediaItem[],
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional',
  slidesCount: number,
  recentTopics: string[] = []
): Promise<CarouselContent> {
  const systemPrompt = buildSystemPrompt(ctx, mediaItems)
  const userPrompt   = buildUserPrompt(theme, tone, slidesCount, mediaItems, recentTopics)

  const response = await anthropic.messages.create({
    model:       'claude-haiku-4-5-20251001',
    max_tokens:  2500,
    temperature: 1,
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

  // Extract JSON robustly — find first { and last } regardless of markdown wrapping
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error(`Modelo não retornou JSON: ${text.slice(0, 200)}`)
  }
  const json = text.slice(start, end + 1)

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
    slide:    i + 1,
    type:     s.type ?? 'content',
    title:    s.title ?? '',
    subtitle: s.subtitle,
    body:     s.body,
    bullets:  s.bullets,
    cta:      s.cta,
    imageUrl: s.imageUrl,
    footer:   s.footer,
  }))

  return { slides, caption: parsed.caption ?? '' }
}
