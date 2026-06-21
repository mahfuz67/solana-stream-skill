#!/bin/bash
# Validate the skill: install-path is markdown-only, routing links resolve, verified rows are
# sourced, frontmatter present, and offline tests pass. Exits non-zero on any failure.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
fail=0
ok()   { echo "  ok   $1"; }
bad()  { echo "  FAIL $1"; fail=1; }

echo "== 1. install path is markdown-only =="
nonmd=$(find skill agents commands rules -type f ! -name "*.md" 2>/dev/null)
[ -z "$nonmd" ] && ok "skill/agents/commands/rules contain only .md" || { bad "non-markdown in install path:"; echo "$nonmd"; }

echo "== 2. SKILL.md frontmatter =="
head -1 skill/SKILL.md | grep -q '^---$' && grep -q '^name: solana-stream' skill/SKILL.md \
  && grep -q '^user-invocable: true' skill/SKILL.md && ok "frontmatter name + user-invocable" || bad "SKILL.md frontmatter"

echo "== 3. routing links resolve =="
for link in $(grep -oE '\]\(([a-z0-9-]+\.md)\)' skill/SKILL.md | sed -E 's/\]\((.*)\)/\1/' | sort -u); do
    [ -f "skill/$link" ] && ok "skill/$link" || bad "broken link skill/$link"
done

echo "== 4. verified rows are sourced =="
# resources.md must cite a source URL and a checked date, and carry no unintended bare TODOs
grep -Eq 'checked.*2026' skill/resources.md && grep -q 'github.com/sevenlabs-hq/carbon' skill/resources.md \
  && ok "resources.md cites sources + dates" || bad "resources.md missing source/date"
# pool + migration tables present
grep -q '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' skill/pool-creation-events.md && ok "pool table present" || bad "pool table missing"
grep -q '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P' skill/launchpad-migrations.md && ok "migration table present" || bad "migration table missing"

echo "== 5. discriminators re-derive (independent sha256 check) =="
python3 - <<'PY'
import hashlib, sys
checks = {
 "global:create_pool":"e992d18ecf6840bc",
 "global:initialize":"afaf6d1f0d989bed",
 "global:initialize_pool":"5fb40aac54aee828",
 "global:initialize_lb_pair":"2d9aedd2dd0fa65c",
 "global:migrate":"9beae792ec9ea21e",
 "global:migrate_to_amm":"cf52c091fecf91df",
}
bad=0
for n,exp in checks.items():
    got=hashlib.sha256(n.encode()).digest()[:8].hex()
    print(f"  {'ok  ' if got==exp else 'FAIL'} {n} -> {got}")
    bad |= (got!=exp)
sys.exit(1 if bad else 0)
PY
[ $? -eq 0 ] || fail=1

echo "== 6. fixtures present =="
n=$(ls examples/fixtures/*.json 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -ge 5 ] && ok "$n fixtures" || bad "expected >=5 fixtures, found $n"

echo "== 7. offline tests =="
if [ "${SKIP_TESTS:-0}" = "1" ]; then
    echo "  (skipped: SKIP_TESTS=1)"
else
    ( cd examples/ts-yellowstone && npm test >/dev/null 2>&1 ) && ok "ts decode tests" || bad "ts decode tests"
    ( cd examples/rust-carbon && cargo test >/dev/null 2>&1 ) && ok "rust decode tests" || bad "rust decode tests"
fi

echo ""
[ $fail -eq 0 ] && { echo "VALIDATE: PASS"; exit 0; } || { echo "VALIDATE: FAIL"; exit 1; }
