#!/bin/bash
set -e

SERVICE_DIR="/home/socialmind-renderer/renderer-service"

echo "=== socialmind-renderer install ==="

# ── 1. Chromium system dependencies ─────────────────────────────────────────
echo "[1/6] Installing Chromium dependencies..."
apt-get update -qq
apt-get install -y \
  libnss3 \
  libatk1.0-0t64 \
  libatk-bridge2.0-0t64 \
  libcups2t64 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2t64 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libgtk-3-0t64 \
  libx11-xcb1 \
  fonts-liberation \
  ca-certificates

# ── 2. Node dependencies ─────────────────────────────────────────────────────
echo "[2/6] Installing Node dependencies..."
cd "$SERVICE_DIR"
npm install

# ── 3. Build TypeScript ──────────────────────────────────────────────────────
echo "[3/6] Building TypeScript..."
npm run build

# ── 4. PM2 ───────────────────────────────────────────────────────────────────
echo "[4/6] Installing PM2..."
npm install -g pm2

# ── 5. Log directory ─────────────────────────────────────────────────────────
echo "[5/6] Creating log directory..."
mkdir -p /var/log/socialmind-renderer

# ── 6. Start service ─────────────────────────────────────────────────────────
echo "[6/6] Starting service with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash || true

echo ""
echo "=== Done! ==="
echo "Check status : pm2 status"
echo "Health check : curl http://localhost:3001/health"
