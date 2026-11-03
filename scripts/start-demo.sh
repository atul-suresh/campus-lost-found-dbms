#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo 'Install Node.js 20.9 or newer first.'; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<20||(a===20&&b<9))throw Error("Node.js 20.9 or newer is required")'
command -v docker >/dev/null || { echo 'Install and start Docker Desktop first.'; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Start Docker Desktop, wait until its engine is running, then run this launcher again.'; exit 1; }
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -d node_modules/next ]; then npm ci; fi
docker compose up -d --wait
npm run db:setup
npm run demo:prepare
npm run build
echo
echo 'Open http://localhost:3000 in your browser.'
echo 'Student: atul@campus.test     Staff: staff@campus.test'
echo 'Default demonstration password: CampusDemo@2026 (or your DEMO_PASSWORD from .env).'
echo 'Keep this Terminal open. Press Ctrl+C to stop the web server.'
npm start
