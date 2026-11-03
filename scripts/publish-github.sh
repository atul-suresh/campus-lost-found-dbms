#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
source_dir="$PWD"
command -v git >/dev/null || { echo 'Install Git first, then run this publisher again.'; exit 1; }
if ! command -v gh >/dev/null; then
 if command -v brew >/dev/null; then brew install gh; else echo 'Install GitHub CLI (gh), then run this publisher again.'; exit 1; fi
fi
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
 gh auth login --hostname github.com --git-protocol https --web
fi
login="$(gh api user --jq .login)"
if [ "$login" != atul-suresh ]; then
 echo "The active GitHub account is $login. Switch gh to atul-suresh, then rerun this publisher."
 exit 1
fi
gh auth setup-git --hostname github.com
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/campus-publish.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT
git clone https://github.com/atul-suresh/campus-lost-found-dbms.git "$work_dir/repo"
python3 - "$source_dir" "$work_dir/repo" <<'PY'
import hashlib,json,shutil,sys,subprocess
from pathlib import Path
source,destination=map(Path,sys.argv[1:])
manifest=json.loads((source/'evidence/package_manifest.json').read_text())
base=manifest['base_commit']
if subprocess.run(['git','merge-base','--is-ancestor',base,'HEAD'],cwd=destination).returncode:
 raise SystemExit('The package base is not in the repository history. Review before publishing.')
paths=[entry['path'] for entry in manifest['files']]+['evidence/package_manifest.json']
hashes={entry['path']:entry['sha256'] for entry in manifest['files']}
def safe_path(name):
 relative=Path(name)
 if relative.is_absolute() or '..' in relative.parts or '.git' in relative.parts:
  raise SystemExit('Unsafe manifest path: '+name)
 return relative
def committed(revision,name):
 result=subprocess.run(['git','show',f'{revision}:{name}'],cwd=destination,capture_output=True)
 return result.stdout if result.returncode==0 else None
# Validate every source and conflict before changing the checkout. A second
# publication is a no-op; later unrelated commits do not block publication.
for name in paths:
 relative=safe_path(name);file=source/relative
 if not file.is_file():raise SystemExit('Missing package file: '+name)
 desired=file.read_bytes()
 if name in hashes and hashlib.sha256(desired).hexdigest()!=hashes[name]:
  raise SystemExit('Package checksum mismatch: '+name)
 current=committed('HEAD',name)
 if current!=committed(base,name) and current!=desired:
  raise SystemExit('Remote file changed since packaging; review before publishing: '+name)
for name in manifest.get('removed_files',[]):
 safe_path(name)
 current=committed('HEAD',name)
 if current is not None and current!=committed(base,name):
  raise SystemExit('Remote file changed before removal; review before publishing: '+name)
for name in paths:
 relative=safe_path(name)
 file=source/relative
 if not file.is_file():raise SystemExit('Missing package file: '+name)
 target=destination/relative;target.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(file,target)
for name in manifest.get('removed_files',[]):
 relative=Path(name)
 if relative.is_absolute() or '..' in relative.parts or '.git' in relative.parts:
  raise SystemExit('Unsafe removed path: '+name)
 target=destination/relative
 if target.is_file():target.unlink()
print('Copied only final manifest files. Local configuration and dependencies are excluded.')
PY
cd "$work_dir/repo"
if ! git config user.name >/dev/null; then git config user.name 'Atul Suresh'; fi
if ! git config user.email >/dev/null; then
 account_id="$(gh api user --jq .id)"
 git config user.email "${account_id}+atul-suresh@users.noreply.github.com"
fi
git add --all
if git diff --cached --quiet; then
 echo 'The repository already contains these final files.'
else
 git commit -m 'Finalize coding-assisted DBMS implementation, native/browser verification and submission materials'
 git push origin HEAD:main
fi
echo 'Published: https://github.com/atul-suresh/campus-lost-found-dbms'
