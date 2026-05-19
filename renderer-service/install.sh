#!/bin/bash
set -e

echo "════════════════════════════════════════════"
echo "  SocialMind Renderer — Instalação no VPS"
echo "════════════════════════════════════════════"

# ─── 1. Dependências do sistema para Chromium ────────────────────────────────

echo ""
echo "▶ Instalando dependências do Chromium…"
apt-get update -qq
apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  fonts-liberation \
  wget \
  ca-certificates

# ─── 2. Gera API key se não existir .env ─────────────────────────────────────

if [ ! -f .env ]; then
  echo ""
  echo "▶ Gerando .env com API key aleatória…"
  API_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  echo "PORT=3001" > .env
  echo "RENDERER_API_KEY=${API_KEY}" >> .env
  echo ""
  echo "✅ API key gerada: ${API_KEY}"
  echo "   Adicione essa chave nas variáveis de ambiente da Vercel:"
  echo "   RENDERER_API_KEY=${API_KEY}"
  echo "   RENDERER_URL=http://2.24.210.233:3001"
  echo ""
fi

# ─── 3. Instala dependências Node ────────────────────────────────────────────

echo "▶ Instalando dependências Node.js…"
npm install --production=false

# ─── 4. Build TypeScript ─────────────────────────────────────────────────────

echo "▶ Compilando TypeScript…"
npm run build

# ─── 5. PM2 ──────────────────────────────────────────────────────────────────

echo "▶ Instalando PM2 globalmente…"
npm install -g pm2 2>/dev/null || true

# ─── 6. Diretório de logs ────────────────────────────────────────────────────

mkdir -p /var/log/socialmind-renderer

# ─── 7. Exporta API key para PM2 e inicia ────────────────────────────────────

echo "▶ Iniciando serviço com PM2…"
export RENDERER_API_KEY=$(grep RENDERER_API_KEY .env | cut -d= -f2)
pm2 delete socialmind-renderer 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Configura PM2 para iniciar com o sistema
echo "▶ Configurando PM2 no startup…"
pm2 startup | tail -1 | bash || true
pm2 save

# ─── 8. Teste de saúde ───────────────────────────────────────────────────────

echo ""
echo "▶ Aguardando serviço iniciar…"
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "════════════════════════════════════════════"
  echo "  ✅ Instalação concluída com sucesso!"
  echo "════════════════════════════════════════════"
  echo ""
  curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || \
  curl -s http://localhost:3001/health
  echo ""
else
  echo "⚠️  Serviço não respondeu (HTTP $HTTP_STATUS) — verifique os logs:"
  echo "   pm2 logs socialmind-renderer"
fi
