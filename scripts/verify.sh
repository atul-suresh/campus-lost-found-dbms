#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -d node_modules/next ]; then npm ci; fi
docker compose up -d --wait
docker compose exec -T postgres psql -U campus -d postgres -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'CREATE DATABASE campus_lost_found_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='campus_lost_found_test')
\gexec
SELECT 'CREATE DATABASE campus_lost_found_browser_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='campus_lost_found_browser_test')
\gexec
SQL
node --env-file=.env scripts/prepare-test-env.mjs
node --env-file=.env scripts/prepare-test-env.mjs --browser
mkdir -p evidence
npm run test:unit 2>&1 | tee evidence/unit_results.tap
npm test 2>&1 | tee evidence/test_results.tap
npm run build 2>&1 | tee evidence/build.txt
npm run test:http
node --env-file=.env.test scripts/queries.mjs > evidence/query_results.jsonl
SQL_ENGINE=native-postgresql node --env-file=.env.test scripts/collect-evidence.mjs
npm audit --json > evidence/dependency_audit.json
echo 'Database, HTTP, unit, build and query verification completed.'
echo 'Browser evidence is separate: follow the README browser test instructions.'
