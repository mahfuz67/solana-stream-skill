#!/bin/bash
# solana-stream-skill — standard installer (recommended defaults).
# Copies MARKDOWN ONLY into ~/.claude/. For custom options use ./install-custom.sh.
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
STREAM_SKILL_PATH="$SKILLS_DIR/solana-stream"
CORE_SKILL_PATH="$SKILLS_DIR/solana-dev"
CLAUDE_MD_PATH="$HOME/.claude/CLAUDE.md"

SKIP_CONFIRM=false
[ "$1" = "-y" ] || [ "$1" = "--yes" ] && SKIP_CONFIRM=true

echo ""
echo -e "${CYAN}solana-stream-skill${NC} — real-time on-chain event detection & decoding"
echo -e "Installs (markdown only):"
echo -e "  ${BLUE}•${NC} solana-stream  → ${CYAN}$STREAM_SKILL_PATH${NC}"
echo -e "  ${BLUE}•${NC} solana-dev     → ${CYAN}$CORE_SKILL_PATH${NC} (core skill it extends)"
echo -e "  ${BLUE}•${NC} CLAUDE.md      → ${CYAN}$CLAUDE_MD_PATH${NC}"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Proceed? [Y/n] " -n 1 -r; echo
    [[ $REPLY =~ ^[Nn]$ ]] && { echo -e "${YELLOW}Cancelled${NC}"; exit 0; }
fi

mkdir -p "$SKILLS_DIR" "$HOME/.claude"

# 1) core skill (solana-dev) — clone and copy its markdown only
echo -e "${CYAN}[1/3]${NC} Installing core solana-dev-skill..."
if [ -d "$CORE_SKILL_PATH" ]; then
    echo -e "  ${YELLOW}→${NC} already present, skipping"
else
    tmp=$(mktemp -d)
    if git clone --depth 1 --quiet https://github.com/solana-foundation/solana-dev-skill.git "$tmp" 2>/dev/null; then
        cp -r "$tmp/skill" "$CORE_SKILL_PATH"
        echo -e "  ${GREEN}✓${NC} $CORE_SKILL_PATH"
    else
        echo -e "  ${RED}✗${NC} clone failed — install manually: github.com/solana-foundation/solana-dev-skill"
    fi
    rm -rf "$tmp"
fi

# 2) stream skill — markdown only (skill/agents/commands/rules)
echo -e "${CYAN}[2/3]${NC} Installing solana-stream-skill..."
rm -rf "$STREAM_SKILL_PATH"
mkdir -p "$STREAM_SKILL_PATH"
cp -r "$SCRIPT_DIR/skill" "$STREAM_SKILL_PATH/"
for d in agents commands rules; do
    [ -d "$SCRIPT_DIR/$d" ] && cp -r "$SCRIPT_DIR/$d" "$STREAM_SKILL_PATH/"
done
echo -e "  ${GREEN}✓${NC} $STREAM_SKILL_PATH"

# 3) CLAUDE.md (the shipped end-user persona; back up any existing)
echo -e "${CYAN}[3/3]${NC} Installing CLAUDE.md..."
[ -f "$CLAUDE_MD_PATH" ] && cp "$CLAUDE_MD_PATH" "$CLAUDE_MD_PATH.backup"
cp "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_MD_PATH"
echo -e "  ${GREEN}✓${NC} $CLAUDE_MD_PATH"

echo ""
echo -e "${GREEN}Done.${NC} Try: \"Watch for new Raydium and Orca pools and print them as JSON.\""
echo -e "${YELLOW}Note:${NC} runnable examples are NOT installed — see examples/ in this repo."
echo -e "To wire agents/commands into a project: cp -r $SCRIPT_DIR/{agents,commands} <project>/.claude/"
echo ""
