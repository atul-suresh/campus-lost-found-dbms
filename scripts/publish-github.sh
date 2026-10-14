#!/usr/bin/env bash
# Initial import only: preserves the existing Git history and refuses a populated repository.
set -euo pipefail
publish_repo='atul-suresh/campus-lost-found-dbms'
publish_source="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    brew install gh
  else
    echo 'Install GitHub CLI first: https://cli.github.com/'
    exit 1
  fi
fi
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web
fi
gh auth setup-git --hostname github.com
publish_login="$(gh api user --jq '.login')"
if [ "$publish_login" != 'atul-suresh' ]; then
  echo "Currently signed in as $publish_login. Sign in as atul-suresh before publishing this repository."
  exit 1
fi
publish_workdir="$(mktemp -d "${TMPDIR:-/tmp}/campus-lost-found-publish.XXXXXX")"
echo "Preparing the initial import in $publish_workdir/repository"
git clone "https://github.com/$publish_repo.git" "$publish_workdir/repository"
publish_existing="$(git -C "$publish_workdir/repository" ls-tree -r --name-only HEAD)"
if [ "$publish_existing" != 'README.md' ] && [ -n "$publish_existing" ]; then
  echo 'This repository already contains project files. Initial import stopped to preserve existing work.'
  echo 'Use your existing checkout to review, commit and push later modifications.'
  exit 1
fi
rsync -a \
  --include='.env.example' \
  --exclude='.env*' \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='__pycache__/' \
  --exclude='*.log' \
  --exclude='evidence/http_progress.txt' \
  "$publish_source/" "$publish_workdir/repository/"
git -C "$publish_workdir/repository" config user.name 'Atul Suresh'
git -C "$publish_workdir/repository" config user.email "$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"')"
git -C "$publish_workdir/repository" add .
git -C "$publish_workdir/repository" status --short
if git -C "$publish_workdir/repository" diff --cached --quiet; then
  echo 'No new files to publish.'
  exit 0
fi
git -C "$publish_workdir/repository" commit -m 'Import prepared Campus Lost and Found application, database and report'
git -C "$publish_workdir/repository" push origin HEAD:main
echo "Published: https://github.com/$publish_repo"
echo 'Keep the clone path above for future team modifications.'
