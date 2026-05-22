import { anthropic } from '@/lib/anthropic'
import type { CarouselContent, CompanyContext, MediaItem, SlideContent } from './types'

const TONE_MAP = {
  educational:  'educativo e informativo',
  motivational: 'motivacional e inspirador',
  promotional:  'promocional e persuasivo',
  journalistic: 'jornalístico investigativo',
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK PLAN — generates N distinct angles before any post is written
// ─────────────────────────────────────────────────────────────────────────────

export interface WeekPlanItem {
  topic:      string  // 3-5 word specific angle
  hook:       string  // 9-word max hook title
  format:     string  // content format
  keyInsight: string  // the ONE thing this post teaches
}

export async function generateWeekPlan(
  ctx: CompanyContext,
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional' | 'journalistic',
  count: number,
): Promise<WeekPlanItem[]> {
  const toneLabel = TONE_MAP[tone]

  const prompt = `Você é um estrategista de conteúdo sênior para Instagram.

Para o negócio "${ctx.business_name}" (nicho: ${ctx.niche}), crie ${count} conceitos de carrossel COMPLETAMENTE DIFERENTES sobre o tema: "${theme}".

Público-alvo: ${ctx.target_audience ?? 'não informado'}
Tom: ${toneLabel}

REGRAS ABSOLUTAS:
1. Cada conceito ataca um ÂNGULO ÚNICO — zero sobreposição de ideia com os outros
2. Máximo contraste entre os posts: erros × acertos, teórico × prático, básico × avançado, geral × específico
3. Conteúdo específico para o público informado — nada genérico
4. Distribua os formatos abaixo (não repita o mesmo formato)

FORMATOS disponíveis:
- mito-verdade: destruir crença comum com evidência específica do nicho
- passo-a-passo: como fazer com etapas numeradas e concretas
- checklist: lista de itens obrigatórios ou proibidos com o porquê
- estatística: dado surpreendente do nicho + implicações práticas
- história: caso real ou narrativa de transformação com números
- alerta: aviso urgente sobre erro que 90% comete
- antes-depois: contraste entre abordagem errada e a certa com resultados
- pergunta-resposta: a pergunta que todos têm mas ninguém responde

Retorne SOMENTE JSON válido, sem markdown, sem explicações:
{
  "plan": [
    {
      "topic": "ângulo específico em 3-5 palavras em português",
      "hook": "título gancho de até 9 palavras em português (sem ponto final)",
      "format": "mito-verdade|passo-a-passo|checklist|estatística|história|alerta|antes-depois|pergunta-resposta",
      "keyInsight": "a UMA coisa única que este post ensina (1 frase direta)"
    }
  ]
}`

  const response = await anthropic.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  1200,
    temperature: 1,
    messages:    [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('').trim()

  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    console.error('[generateWeekPlan] JSON não encontrado:', text.slice(0, 300))
    return []
  }

  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    return ((parsed.plan ?? []) as WeekPlanItem[]).slice(0, count)
  } catch {
    console.error('[generateWeekPlan] JSON inválido')
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME STRUCTURES — slide-by-slide blueprint per content format
// ─────────────────────────────────────────────────────────────────────────────

const THEME_STRUCTURES: Record<string, (n: number) => string> = {
  'myth': (n) => `
ESTRUTURA OBRIGATÓRIA — Mito e Verdade:
• Slide 1 (cover)  → Título com o MITO como afirmação chocante ou pergunta provocativa
• Slide 2          → O MITO: "Todo mundo acredita que..." — escreva com empatia, sem julgamento
• Slide 3          → POR QUE AS PESSOAS ACREDITAM: razão histórica/psicológica real e específica do nicho
• Slides 4–${Math.max(4, n - 2)} → A VERDADE: desmonte com dado real, mecanismo concreto, exemplo do nicho
• Slide ${n - 1}   → O QUE FAZER: substitua o comportamento errado pelo certo (passo a passo curto)
• Slide ${n} (cta) → "Você acreditava nesse mito? 👇 Marca quem precisa ver isso"
`,
  'howto': (n) => `
ESTRUTURA OBRIGATÓRIA — Passo a Passo:
• Slide 1 (cover)  → Promessa: resultado específico + prazo realista (ex: "Como X em Y dias")
• Slide 2          → O PROBLEMA: por que a maioria falha nesse processo — 1 razão específica com dado
• Slides 3–${Math.max(3, n - 2)} → PASSOS NUMERADOS: cada slide = 1 passo claro com exemplo real + dica concreta
• Slide ${n - 1}   → ERRO MAIS COMUM: o que estraga os resultados de 90% das pessoas
• Slide ${n} (cta) → Resultado esperado + "Salva e aplica ainda hoje ✅"
`,
  'checklist': (n) => `
ESTRUTURA OBRIGATÓRIA — Checklist:
• Slide 1 (cover)  → "X [itens/coisas] que [avatar] deve/não deve [fazer/ter/evitar]" — número real
• Slide 2          → CONTEXTO: por que essa lista importa — 1 dado ou fato surpreendente e específico
• Slides 3–${Math.max(3, n - 2)} → ITENS: máx 3 por slide, cada um com o "por quê" em 1 linha curta
• Slide ${n - 1}   → BÔNUS: o item que 90% ignora e que faz toda a diferença
• Slide ${n} (cta) → "Salva para não esquecer nenhum item 🔖"
`,
  'stats': (n) => `
ESTRUTURA OBRIGATÓRIA — Dado/Estatística:
• Slide 1 (cover)  → A estatística chocante em destaque: número + contexto (máx 9 palavras)
• Slide 2          → O QUE ESSE NÚMERO SIGNIFICA: impacto direto e concreto na vida do avatar
• Slides 3–${Math.max(3, n - 2)} → CAUSAS/CONSEQUÊNCIAS: cada slide = 1 fator com sub-dados reais
• Slide ${n - 1}   → O QUE FAZER: ação concreta e imediata baseada nos dados
• Slide ${n} (cta) → "Compartilha com quem precisa saber disso 📊"
`,
  'story': (n) => `
ESTRUTURA OBRIGATÓRIA — História/Caso:
• Slide 1 (cover)  → "De [situação ruim] para [resultado] em [prazo]" — concreto e específico
• Slide 2          → SITUAÇÃO INICIAL: o problema específico — escreva com empatia, com detalhes reais
• Slide 3          → A DECISÃO: o momento exato em que tudo mudou e por que foi difícil
• Slides 4–${Math.max(4, n - 2)} → O PROCESSO: o que foi feito, na ordem, com números e detalhes reais
• Slide ${n - 1}   → O RESULTADO: o que mudou, com números concretos + lição extraída
• Slide ${n} (cta) → "Qual é sua situação agora? Conta nos comentários 👇"
`,
  'warning': (n) => `
ESTRUTURA OBRIGATÓRIA — Alerta/Aviso:
• Slide 1 (cover)  → Aviso urgente: "Pare de fazer isso se você quer [resultado]" ou "X erros que custam [consequência]"
• Slide 2          → O ERRO PRINCIPAL: como ele acontece e por que é comum (sem julgamento)
• Slides 3–${Math.max(3, n - 2)} → OS ERROS ESPECÍFICOS: cada slide = 1 erro com a consequência real e a alternativa correta
• Slide ${n - 1}   → A RAIZ DO PROBLEMA: por que tantos cometem esses erros (crença limitante ou falta de informação)
• Slide ${n} (cta) → "Salva para não cometer esses erros 🔖 E manda pra quem precisa ver"
`,
  'before-after': (n) => `
ESTRUTURA OBRIGATÓRIA — Antes/Depois:
• Slide 1 (cover)  → "Antes vs Depois: a diferença que muda tudo em [tema]"
• Slide 2          → O "ANTES": como a maioria faz — específico, sem julgamento, reconhecível
• Slides 3–${Math.max(3, n - 2)} → AS MUDANÇAS: cada slide compara 1 comportamento (Antes: X | Depois: Y) com resultado concreto
• Slide ${n - 1}   → O RESULTADO DO "DEPOIS": números reais, diferença visível
• Slide ${n} (cta) → "Em qual estágio você está agora? Antes ou Depois? Conta nos comentários"
`,
  'qa': (n) => `
ESTRUTURA OBRIGATÓRIA — Pergunta e Resposta:
• Slide 1 (cover)  → A pergunta que todos têm mas ninguém responde claramente
• Slide 2          → POR QUE É CONFUSO: o que gera dúvida e por que as respostas comuns estão erradas
• Slides 3–${Math.max(3, n - 2)} → AS RESPOSTAS: cada slide responde 1 aspecto da pergunta com dados + exemplo
• Slide ${n - 1}   → A RESPOSTA DEFINITIVA: síntese clara + regra geral que nunca falha
• Slide ${n} (cta) → "Que outras dúvidas você tem sobre [tema]? Pergunta nos comentários 👇"
`,
}

function detectThemeStructure(theme: string, slidesCount: number): string {
  const t = theme.toLowerCase()
  // Match the format keywords from WeekPlanItem
  if (/mito.verdade|mito-verdade|mito e verdade|mitos e verdades|desmistif|falsa crença|mentira|mito/i.test(t))
    return THEME_STRUCTURES.myth(slidesCount)
  if (/passo.a.passo|como (fazer|criar|usar|montar|vender|começar|aplicar)|tutorial|guia prático/i.test(t))
    return THEME_STRUCTURES.howto(slidesCount)
  if (/checklist|lista de|itens (que|para)|coisas que|não (faça|deve|fazer)/i.test(t))
    return THEME_STRUCTURES.checklist(slidesCount)
  if (/estatística|em números|dado (sur|choc)|pesquisa (mostrou|revela)|taxa de|% dos/i.test(t))
    return THEME_STRUCTURES.stats(slidesCount)
  if (/história|caso real|case de|depoimento|transformação|jornada de|de .* para/i.test(t))
    return THEME_STRUCTURES.story(slidesCount)
  if (/alerta|erro.*(mais|comum)|pare de|cuidado com|riscos de|armadilha/i.test(t))
    return THEME_STRUCTURES.warning(slidesCount)
  if (/antes.?depois|antes vs|antes ×|abordagem (errada|certa)/i.test(t))
    return THEME_STRUCTURES['before-after'](slidesCount)
  if (/pergunta.?resposta|dúvida sobre|faq|o que é|por que (é|acontece)|como (saber|identificar)/i.test(t))
    return THEME_STRUCTURES.qa(slidesCount)
  return ''
}

// Detect format from WeekPlanItem.format string
function formatToStructure(format: string, slidesCount: number): string {
  const f = format.toLowerCase()
  if (f.includes('mito'))        return THEME_STRUCTURES.myth(slidesCount)
  if (f.includes('passo'))       return THEME_STRUCTURES.howto(slidesCount)
  if (f.includes('checklist'))   return THEME_STRUCTURES.checklist(slidesCount)
  if (f.includes('estatística') || f.includes('statistic')) return THEME_STRUCTURES.stats(slidesCount)
  if (f.includes('história') || f.includes('histor'))       return THEME_STRUCTURES.story(slidesCount)
  if (f.includes('alerta') || f.includes('warning'))        return THEME_STRUCTURES.warning(slidesCount)
  if (f.includes('antes'))       return THEME_STRUCTURES['before-after'](slidesCount)
  if (f.includes('pergunta') || f.includes('resposta') || f.includes('q-and-a')) return THEME_STRUCTURES.qa(slidesCount)
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK FORMULAS — slide 1 blueprints
// ─────────────────────────────────────────────────────────────────────────────

const HOOK_FORMULAS = `FÓRMULAS DE GANCHO PARA O SLIDE 1 — use a que melhor serve ao ângulo:
1. ERRO NUMÉRICO    → "X erros que [avatar] comete e não percebe"
2. NEGAÇÃO          → "Por que você NÃO consegue [resultado] mesmo fazendo [esforço]"
3. SEGREDO          → "O que os [referências do nicho] fazem diferente e nunca contam"
4. AVISO URGENTE    → "Para tudo se você ainda [comportamento comum do avatar]"
5. DADO CHOCANTE    → "X% dos [avatar] [fato surpreendente] — você é um deles?"
6. CONTRA-INTUITIVO → "A estratégia que parece errada mas [resultado concreto]"
7. ANTES/DEPOIS     → "De [situação ruim] para [resultado desejado] em [prazo real]"
8. PROVOCAÇÃO       → "Você está [fazendo X] errado. E você nem sabe disso."

OBRIGATÓRIO: máx 9 palavras, sem ponto final, cria curiosidade SEM revelar a resposta.`

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: CompanyContext, mediaItems: MediaItem[], tone?: string): string {
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
REGRA Nº 2 — TESTE DE ESPECIFICIDADE
════════════════════════════════════════

Antes de qualquer bullet ou frase, pergunte:
"Isso poderia aparecer em um post sobre OUTRO assunto qualquer?"

Se SIM → é genérico. DESCARTE e reescreva com dado, número ou mecanismo específico.
Se NÃO → está aprovado.

FRASES AUTOMATICAMENTE REPROVADAS:
✗ "Seja consistente nas redes sociais"
✗ "Conheça bem o seu público-alvo"
✗ "Invista em marketing digital"
✗ "Tenha uma presença online forte"
✗ "Engaje com seus seguidores"
✗ "Crie conteúdo de valor"
✗ "Seja autêntico"
✗ "Construa sua autoridade"
→ Qualquer variação = falha total.

BULLETS QUE PASSAM NO TESTE (nível exigido):
✓ "Reels com áudio original têm alcance 2,3x maior — use sua própria voz"
✓ "O algoritmo em 2026 prioriza tempo de tela: faça o slide 1 durar 3+ segundos"
✓ "Salvar vale mais que 10 curtidas pro algoritmo — finalize pedindo para salvar"
✓ "Bio com palavra-chave no nome aparece nas buscas — coloque seu serviço no nome"

════════════════════════════════════════
REGRA Nº 3 — TÍTULOS QUE PARAM O SCROLL
════════════════════════════════════════

REPROVADOS:
✗ "Dicas de [tema]" / "Saiba mais sobre [tema]" / "Como melhorar [coisa vaga]"

APROVADOS:
✓ "O erro que 9/10 [profissão] cometem e não percebem"
✓ "Por que você não vende mesmo tendo [X] seguidores"
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
${tone === 'journalistic' ? `
════════════════════════════════════════
REGRAS JORNALÍSTICAS — Tom Investigativo
(Inspirado em Breakthrough Advertising de Eugene Schwartz)
════════════════════════════════════════

TÍTULOS — estilo manchete de impacto:
✓ Use dados e números específicos
✓ Cause choque ou curiosidade imediata
✓ NUNCA revele a solução na capa
Exemplos aprovados:
  "Estudo revela por que 9 em cada 10 negócios fecham no 1º ano"
  "O método que dobrou vendas em 30 dias e ninguém estava falando"
  "Especialistas alertam: quem não fizer isso agora vai ficar para trás"

CORPO DO TEXTO — técnica open loop:
✓ Cada frase cria curiosidade para a próxima
✓ NUNCA feche a ideia completamente num slide — o leitor PRECISA ir ao próximo
✓ Estrutura de cada slide:
  - Linha 1: dado surpreendente ou afirmação forte
  - Linha 2: aprofunda e gera dúvida
  - Linha 3: gancho direto para o próximo slide

VOCABULÁRIO OBRIGATÓRIO nesse tom:
"revelado", "comprovado", "confirmado", "segundo especialistas",
"dados mostram", "o que ninguém estava esperando", números e percentuais reais

VOCABULÁRIO PROIBIDO nesse tom:
"dicas", "truques", "segredos simples", qualquer clichê genérico de IA

ÚLTIMO SLIDE — fechamento estilo fim de reportagem:
O último slide é o VEREDITO da investigação, não uma virada comercial.
Deve responder: "O que eu faço agora com o que aprendi aqui?"
Mantenha o assunto do carrossel — não invente novos tópicos.
Exemplos aprovados:
  "Você agora sabe o que 90% dos perfis ignoram. Use isso antes que os outros descubram."
  "A pergunta não é se isso vale para você. É quanto tempo você ainda vai ignorar."
  "Agora que você sabe como o algoritmo funciona — a próxima jogada é sua."
` : ''}
Retorne SOMENTE JSON válido, sem markdown, sem explicações.`
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROMPT
// ─────────────────────────────────────────────────────────────────────────────

function buildUserPrompt(
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional' | 'journalistic',
  slidesCount: number,
  mediaItems: MediaItem[],
  recentTopics: string[] = [],
  batchAngle?: WeekPlanItem,
): string {
  const imageUrls = mediaItems.filter(m => m.url).slice(0, 5).map(m => m.url)
  const hasImages = imageUrls.length > 0
  const seed      = `${new Date().toISOString().slice(0, 16)}-${Math.random().toString(36).slice(2, 7)}`

  // ── Special case: single image post ──────────────────────────────────────
  if (slidesCount === 1) {
    return `[ID: ${seed}]

Crie UMA ÚNICA imagem (post único, não carrossel) sobre: "${theme}"
Tom: ${TONE_MAP[tone]}

Esta é uma imagem standalone — não uma série de slides. Deve ser COMPLETA e AUTOSSUFICIENTE.

ESTRUTURA DA ÚNICA IMAGEM (type: "cover"):
- title: frase de impacto que resume o tema em até 9 palavras (sem ponto final)
- subtitle: categoria ou rótulo em MAIÚSCULAS (2-3 palavras)
- body: 1-2 frases que complementam o título com o insight principal (máx 20 palavras)
- imageKeyword: 3-5 palavras em INGLÊS descrevendo a imagem ideal para o tema

Retorne SOMENTE este JSON válido, sem markdown:
{
  "slides": [
    {"slide":1,"type":"cover","title":"...","subtitle":"...","body":"...","imageKeyword":"..."}
  ],
  "caption": "legenda completa para o Instagram com gancho, valor real, CTA e hashtags"
}`
  }

  // Build a short media reference list for the image slide instruction
  const mediaRef = mediaItems.slice(0, 10).map(m =>
    `- URL: "${m.url}" | Categoria: ${m.category}${m.description ? ` | Descrição: ${m.description}` : ''}`
  ).join('\n')

  // ── Anti-repetition block ──
  const recentSection = recentTopics.length > 0
    ? `\nPOSTS ANTERIORES — evite qualquer semelhança de ideia, título ou ângulo:\n${recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : ''

  // ── Angle block — batch angle takes full priority ──
  let angleBlock: string
  let structureBlock: string

  if (batchAngle) {
    angleBlock = `
ÂNGULO EXCLUSIVO DESTE POST (obrigatório — não desvie em nenhum slide):
• Tópico: "${batchAngle.topic}"
• Título do slide 1: "${batchAngle.hook}" (use exatamente este como base, pode adaptar levemente)
• Formato: ${batchAngle.format}
• Insight central: "${batchAngle.keyInsight}"

Este post existe para ensinar APENAS o insight acima. Cada slide converge para essa ideia.
Não misture com outros ângulos do tema. Seja profundo neste ângulo específico.
`
    structureBlock = formatToStructure(batchAngle.format, slidesCount)
      || detectThemeStructure(batchAngle.topic, slidesCount)
      || detectThemeStructure(theme, slidesCount)
  } else {
    const specificTopic = theme.length > 20 || /como|por que|erro|dica|estratégia|guia|passo|secret/i.test(theme)
    angleBlock = specificTopic
      ? `\nMODO ESPECIALISTA ATIVADO:
Você é o maior especialista do Brasil no assunto: "${theme}"
Traga insights que 90% dos profissionais do nicho não conhecem.
Cada bullet deve conter algo que surpreenda — dados reais, números, mecanismos específicos.\n`
      : ''
    structureBlock = detectThemeStructure(theme, slidesCount)
  }

  const structureSection = structureBlock
    ? `\n${structureBlock}`
    : ''

  return `[ID: ${seed}]

Crie um carrossel com ${slidesCount} slides sobre: "${theme}"
Tom: ${TONE_MAP[tone]}
${angleBlock}${recentSection}${structureSection}
${!structureBlock ? HOOK_FORMULAS : ''}

════════════════════════════════════════
FIO CONDUTOR — REGRA MAIS IMPORTANTE
════════════════════════════════════════

Este carrossel conta UMA história com começo, meio e fim.
Cada slide é um CAPÍTULO da mesma história — não um post independente.

O TEMA É: "${theme}"
Todos os slides, do 1 ao ${slidesCount}, devem girar em torno deste tema.
Não é permitido desviar do tema para outro assunto em nenhum slide.

TESTE ANTES DE ESCREVER CADA SLIDE:
"Este slide ainda está falando sobre '${theme}'?"
Se NÃO → descarte e reescreva.

PROGRESSÃO OBRIGATÓRIA:
✓ Slide 1: GANCHO — levanta uma tensão ou provoca curiosidade sobre o tema
✓ Slide 2: PROBLEMA/CONTEXTO — por que o tema importa agora
✓ Slides 3 a ${slidesCount - 2}: DESENVOLVIMENTO — aprofunda em sequência lógica (causa → efeito, problema → solução)
✓ Slide ${slidesCount - 1}: VIRADA/CONCLUSÃO — o insight principal do carrossel
✓ Slide ${slidesCount}: FECHAMENTO — convida à ação com base no que foi revelado (NÃO muda o assunto)

PROIBIDO:
✗ Mudar de assunto entre slides
✗ Último slide virar pitch comercial sobre serviço não relacionado ao tema
✗ Repetir a mesma ideia com palavras diferentes
✗ Slide que poderia existir em OUTRA ordem sem perder sentido

════════════════════════════════════════
ESTRUTURA DOS SLIDES
════════════════════════════════════════

SLIDE 1 — CAPA (type: "cover")
- title: gancho que PARA o scroll (máx 9 palavras, sem ponto final)${batchAngle ? ` — use "${batchAngle.hook}" como base` : ''}
- subtitle: categoria em MAIÚSCULAS (2-3 palavras)
- body: 1 frase que aumenta a curiosidade sem revelar a resposta (máx 12 palavras)

SLIDES 2 a ${slidesCount - 1} — CONTEÚDO (type: "content")
${structureBlock
    ? `Siga a estrutura definida acima — cada slide é um passo da narrativa.`
    : `Cada slide avança o argumento — não começa um assunto novo, aprofunda o anterior.`}
- title: máx 6 palavras — específico, diz exatamente o que o slide ensina
- bullets: exatamente 3 pontos — máx 15 palavras cada — completos, com sentido próprio
- body: 1 frase de PONTE que conecta com o próximo slide (opcional, máx 15 palavras)

REGRA DOS BULLETS:
✓ Cada bullet é uma frase completa com sentido próprio
✓ Os 3 bullets juntos formam um argumento coeso, não 3 dicas aleatórias
✗ Nunca termine um bullet no meio do raciocínio
✗ Nunca use bullet que começa com verbo genérico sem contexto ("Faça X", "Use Y")

SLIDE ${slidesCount} — CTA (type: "cta")
- title: frase de impacto que FECHA o argumento iniciado no slide 1 — deve ter ligação direta com o tema
- body: consequência concreta de aplicar o que foi revelado neste carrossel (máx 2 frases)
- cta: chamada à ação diretamente ligada ao tema (ex: "salva", "compartilha", "testa agora")
- subtitle: pergunta que gera comentários — relacionada ao tema deste carrossel

⚠️ REGRA ABSOLUTA DO ÚLTIMO SLIDE:
O CTA é o "então, e agora?" da narrativa que você construiu.
NÃO introduza novos tópicos que não apareceram nos slides anteriores.
NÃO vire o último slide em proposta comercial se o tema não era o produto/serviço.
Se o carrossel foi sobre o algoritmo do Instagram → o CTA deve fechar com algo sobre o algoritmo.
Se foi sobre erros de nutrição → o CTA deve fechar com algo sobre nutrição.
O leitor deve sentir que chegou ao fim de UMA história — não que entrou em outra.

IMPORTANTE — TIPOS DE SLIDE:
Use SEMPRE "cover" para slide 1 e "cta" para o último slide.
Slides intermediários devem ser "content".

${hasImages ? `SLIDE DE FOTO (opcional — use apenas se fizer sentido para o tema):
Você PODE inserir exatamente 1 slide de foto como slide 2 (logo após a capa).
Use type "image" com imageUrl apontando para a URL mais relevante da biblioteca abaixo.
O slide de foto deve ter title (impacto emocional, máx 8 palavras) e body (contexto curto, máx 12 palavras).
Se usar slide de foto, o total de slides de conteúdo escrito diminui em 1.

IMAGENS DISPONÍVEIS NA BIBLIOTECA:
${mediaRef}

Escolha a imagem cujo categoria/descrição seja mais relevante para o tema "${theme}".
Se nenhuma imagem for claramente relevante, não use slide de foto.` : `NÃO use type "image" — não há fotos disponíveis na biblioteca.`}

IMAGEM POR SLIDE (opcional mas recomendado):
Para o slide 1 (cover) e o último slide (cta), adicione um campo "imageKeyword" com 3-5 palavras em INGLÊS que descrevam a imagem ideal para esse slide.
O sistema vai usar essa keyword para buscar uma foto relevante.
Exemplos:
- Cover sobre "Erros no Instagram": imageKeyword: "social media marketing mistakes"
- CTA de um post educativo: imageKeyword: "professional learning business success"

Retorne SOMENTE este JSON válido, sem markdown:
{
  "slides": [
    {"slide":1,"type":"cover","title":"...","subtitle":"...","body":"...","imageKeyword":"..."},
    {"slide":2,"type":"content","title":"...","bullets":["...","...","..."],"body":"..."},
    {"slide":${slidesCount},"type":"cta","title":"...","body":"...","cta":"...","subtitle":"...","imageKeyword":"..."}
  ],
  "caption": "..."
}`
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — generateCarouselContent
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCarouselContent(
  ctx: CompanyContext,
  mediaItems: MediaItem[],
  theme: string,
  tone: 'educational' | 'motivational' | 'promotional' | 'journalistic',
  slidesCount: number,
  recentTopics: string[] = [],
  batchAngle?: WeekPlanItem,
): Promise<CarouselContent> {
  const systemPrompt = buildSystemPrompt(ctx, mediaItems, tone)
  const userPrompt   = buildUserPrompt(theme, tone, slidesCount, mediaItems, recentTopics, batchAngle)

  const response = await anthropic.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  3000,
    temperature: 0.8,
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
