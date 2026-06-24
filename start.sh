#!/bin/bash
# FlowChat — Quick Start

set -e

BASE="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔═══════════════════════════════════╗"
echo "║   FlowChat — Quick Start          ║"
echo "╚═══════════════════════════════════╝"
echo ""

# Install dependencies if needed
if [ ! -d "$BASE/backend/node_modules" ]; then
  echo "→ Installing backend dependencies..."
  cd "$BASE/backend" && npm install
fi

if [ ! -d "$BASE/frontend/node_modules" ]; then
  echo "→ Installing frontend dependencies..."
  cd "$BASE/frontend" && npm install
fi

# Copy .env if missing
if [ ! -f "$BASE/backend/.env" ]; then
  cp "$BASE/backend/.env.example" "$BASE/backend/.env"
  echo "→ Created backend/.env from .env.example"
  echo "  Edit it to enable Salesforce integration."
fi

echo ""
echo "Starting FlowChat..."
echo "  Backend : http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""

cd "$BASE" && npm install --silent 2>/dev/null || true
cd "$BASE" && npm run dev
