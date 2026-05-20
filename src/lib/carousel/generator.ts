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

ANO ATUAL: 2026. Use APENAS estratégias, dados e referências atuais. Nunca mencione táticas obsoletas.

MISSÃO: Criar carrosséis que o dono da empresa NÃO ficaria com vergonha de postar. Conteúdo que parece ter sido escrito por um especialista real no assunto, não por uma IA genérica.

SOBRE O NEGÓCIO:
- Nicho: ${ctx.niche}
- Cidade: ${ctx.city ?? 'não informada'}
- O que vende: ${ctx.what_sells ?? 'não informado'}
- Público-alvo: ${ctx.target_audience ?? 'não informado'}
- Diferenciais: ${ctx.differentials ?? 'não informado'}
- Tom de voz: ${ctx.tone_of_voice ?? 'Profissional e acessível'}
${ctx.forbidden_words ? `\nPALAVRAS PROIBIDAS (nunca usar): ${ctx.forbidden_words}` : ''}
${ctx.post_examples ? `\nEXEMPLOS DE POSTS ANTERIORES (referência de tom):\n${ctx.post_examples}` : ''}
${mediaSection}

════════════════════════════════════════
REGRA Nº 1 — AVATAR ÚNICO
════════════════════════════════════════

Escolha UMA pessoa específica e escreva TODO o carrossel para ela.
Não "empreendedores em geral" — mas "dona de ateliê que vende pelo WhatsApp e quer parar de depender de indicação".
Se você não consegue visualizar quem é essa pessoa, o avatar está genérico demais.

════════════════════════════════════════
REGRA Nº 2 — TESTE DE ESPECIFICIDADE DOS BULLETS
════════════════════════════════════════

Antes de escrever qualquer bullet, aplique este teste:
"Este bullet poderia aparecer em um post sobre OUTRO assunto qualquer?"

Se SIM → o bullet é genérico. DESCARTE e reescreva.
Se NÃO → o bullet é específico. APROVADO.

CONTEÚDO AUTOMATICAMENTE REPROVADO (qualquer variação dessas frases é proibida):
✗ "Seja consistente nas redes sociais"
✗ "Conheça bem o seu público-alvo"
✗ "Invista em marketing digital"
✗ "Tenha uma presença online forte"
✗ "Engaje com seus seguidores"
✗ "Use as redes sociais a seu favor"
✗ "Crie conteúdo de valor"
✗ "Seja autêntico"
✗ "Construa sua autoridade"
→ Escrever qualquer coisa parecida = falha total na missão.

BULLETS QUE PASSAM NO TESTE (exemplos do nível exigido):
✓ "Reels com áudio original têm alcance 2,3x maior que os com música — use sua própria voz"
✓ "O algoritmo do Instagram em 2026 prioriza tempo de tela: faça o primeiro slide durar 3+ segundos"
✓ "Salvar um post vale mais que 10 curtidas para o algoritmo — finalize sempre pedindo para salvar"
✓ "Perfis com bio com palavra-chave no nome aparecem nas buscas — coloque seu serviço no nome"

════════════════════════════════════════
REGRA Nº 3 — TÍTULOS QUE PARAM O SCROLL
════════════════════════════════════════

O título do slide 1 decide se o post vira viral ou some.

TÍTULOS REPROVADOS (genéricos, não geram clique):
✗ "Dicas de [tema]"
✗ "Saiba mais sobre [tema]"
✗ "Como melhorar [coisa vaga]"
✗ "Tudo sobre [tema]"
✗ "[Tema]: o guia completo"

TÍTULOS APROVADOS (criam urgência ou curiosidade irresistível):
✓ "O erro que 9/10 [profissão] cometem e não percebem"
✓ "Por que você não vende mesmo tendo [X] seguidores"
✓ "Pare de fazer isso se quiser [resultado específico]"
✓ "O que os [concorrentes de sucesso] fazem que você não faz"
✓ "Como [resultado concreto] em [prazo real] sem [obstáculo comum]"

════════════════════════════════════════
REGRA Nº 4 — LEGENDA
════════════════════════════════════════

- Linha 1: gancho que para o scroll ANTES do "ver mais" (máx 125 caracteres)
- 2-3 parágrafos curtos com valor real (não repetir o que está nos slides)
- Penúltima linha: CTA específico ("Salva esse post 🔖 e aplica ainda hoje")
- Última linha: 5 hashtags de nicho (sem #sucesso #vida #motivação)

════════════════════════════════════════
FORMATO DE SAÍDA
════════════════════════════════════════
Retorne SOMENTE JSON válido, sem markdown, sem explicações.`
}

const HOOK_FORMULAS = `FÓRMULAS DE GANCHO PARA O SLIDE 1 — escolha UMA, adapte ao tema e ao avatar:
1. ERRO NUMÉRICO    → "X erros que [avatar] comete e não percebe"
2. NEGAÇÃO          → "Por que você NÃO consegue [resultado] mesmo fazendo [esforço]"
3. SEGREDO          → "O que os [referências do nicho] fazem diferente e nunca contam"
4. AVISO URGENTE    → "Para tudo se você ainda [comportamento comum do avatar]"
5. DADO CHOCANTE    → "X% dos [avatar] [fato surpreendente] — você é um deles?"
6. CONTRA-INTUITIVO → "A estratégia que parece errada mas [resultado concreto]"
7. ANTES/DEPOIS     → "De [situação ruim] para [resultado desejado] em [prazo real]"
8. PROVOCAÇÃO       → "Você está [fazendo X] errado. E você nem sabe disso."

OBRIGATÓRIO: máx 9 palavras, sem ponto final, cria curiosidade SEM revelar a resposta.`

function buildUserPrompt(
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional',
  slidesCount: number,
  mediaItems: MediaItem[],
  recentTopics: string[] = []
): string {
  const imageUrls = mediaItems.filter(m => m.url).slice(0, 5).map(m => m.url)
  const hasImages = imageUrls.length > 0
  const seed      = `${new Date().toISOString().slice(0, 16)}-${Math.random().toString(36).slice(2, 7)}`
  const angle     = pickAngle(tone)

  // Specialist mode: theme longer than 25 chars or contains action verbs = specific topic chosen by user
  const isSpecificTopic = theme.length > 25 || /como|por que|erro|dica|estratégia|guia|passo|secret|reveal/i.test(theme)

  const specialistBlock = isSpecificTopic
    ? `\nMODO ESPECIALISTA ATIVADO:
Você é o maior especialista do Brasil no assunto: "${theme}"
Traga insights que 90% dos profissionais do nicho não conhecem.
Cada bullet deve conter algo que surpreenda — dados reais, números, mecanismos específicos.
NÃO é permitido nenhum conselho óbvio ou genérico neste post.\n`
    : ''

  const recentSection = recentTopics.length > 0
    ? `\nPOSTS ANTERIORES — evite qualquer semelhança de ideia, título ou ângulo:\n${recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : ''

  return `[ID: ${seed}]

Crie um carrossel com ${slidesCount} slides.
Assunto: "${theme}"
Tom: ${TONE_MAP[tone]}
${specialistBlock}${recentSection}
ÂNGULO OBRIGATÓRIO: ${angle.format} — tom ${angle.tone}
Use este ângulo do primeiro ao último slide. Não desvie.

${HOOK_FORMULAS}

ESTRUTURA:

SLIDE 1 — CAPA (type: "cover")
- title: gancho (máx 9 palavras, sem ponto final) — escolha UMA fórmula acima
- subtitle: 2-3 palavras da categoria em MAIÚSCULAS (ex: "INSTAGRAM 2025")
- body: 1 frase que amplifica a curiosidade do título (máx 12 palavras)

SLIDES 2 a ${slidesCount - 1} — CONTEÚDO (type: "content")
Cada slide = 1 subtópico específico do assunto.
- title: máx 6 palavras — aprofunda o ângulo, nunca repete o tema genérico
- bullets: exatamente 3 pontos — cada um DEVE passar no Teste de Especificidade
- body: 1 frase de contexto apenas se agregar algo novo (opcional)

SLIDE ${slidesCount} — CTA (type: "cta")
- title: frase de encerramento impactante (não use "conclusão" nem "resumo")
- body: benefício imediato e concreto de agir agora
- cta: chamada para ação ("Salva e aplica hoje!", "Manda pra quem precisa ver!")
- subtitle: instrução de engajamento ("Conta nos comentários: qual você vai testar?")
${hasImages ? `\nImagens disponíveis (inclua com type "image" quando fizer sentido):\n${imageUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n` : ''}
Retorne SOMENTE este JSON:
{
  "slides": [
    {"slide":1,"type":"cover","title":"...","subtitle":"...","body":"..."},
    {"slide":2,"type":"content","title":"...","bullets":["...","...","..."],"body":"..."},
    {"slide":${slidesCount},"type":"cta","title":"...","body":"...","cta":"...","subtitle":"..."}
  ],
  "caption": "..."
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
