#!/bin/bash
# solana-stream-skill — custom installer.
# Choose personal (~/.claude) or project (./.claude) install. Copies MARKDOWN ONLY.
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PERSONAL="$HOME/.claude/skills"
PROJECT=".claude/skills"
INSTALL_BASE=""

case "$1" in
    --project) INSTALL_BASE="$PROJECT" ;;
    --path) INSTALL_BASE="$2" ;;
    --personal) INSTALL_BASE="$PERSONAL" ;;
esac

if [ -z "$INSTALL_BASE" ]; then
    echo ""
    echo -e "${CYAN}solana-stream-skill — custom install${NC}"
    echo -e "  ${BLUE}[1]${NC} Personal (${PERSONAL}) — all projects"
    echo -e "  ${BLUE}[2]${NC} Project  (${PROJECT}) — this project only"
    echo -e "  ${BLUE}[3]${NC} Cancel"
    read -p "Select [1-3]: " c
    case "$c" in
        1) INSTALL_BASE="$PERSONAL" ;;
        2) INSTALL_BASE="$PROJECT" ;;
        *) echo -e "${YELLOW}Cancelled${NC}"; exit 0 ;;
    esac
fi

STREAM_PATH="$INSTALL_BASE/solana-stream"
CORE_PATH="$INSTALL_BASE/solana-dev"

# core skill — install if not found in common locations
found_core=""
for loc in "$PERSONAL/solana-dev" "$PROJECT/solana-dev" "$CORE_PATH"; do
    [ -f "$loc/SKILL.md" ] && found_core="$loc" && break
done
if [ -n "$found_core" ]; then
    echo -e "${GREEN}✓${NC} core solana-dev-skill found at $found_core"
else
    echo -e "${YELLOW}→${NC} installing core solana-dev-skill..."
    mkdir -p "$CORE_PATH"
    tmp=$(mktemp -d)
    if git clone --depth 1 --quiet https://github.com/solana-foundation/solana-dev-skill.git "$tmp" 2>/dev/null; then
        cp -r "$tmp/skill/"* "$CORE_PATH/"
        echo -e "  ${GREEN}✓${NC} $CORE_PATH"
    else
        echo -e "  ${RED}✗${NC} clone failed — install manually: github.com/solana-foundation/solana-dev-skill"
    fi
    rm -rf "$tmp"
fi

# stream skill — markdown only
echo -e "${YELLOW}→${NC} installing solana-stream-skill..."
rm -rf "$STREAM_PATH"; mkdir -p "$STREAM_PATH"
cp -r "$SCRIPT_DIR/skill" "$STREAM_PATH/"
for d in agents commands rules; do
    [ -d "$SCRIPT_DIR/$d" ] && cp -r "$SCRIPT_DIR/$d" "$STREAM_PATH/"
done
echo -e "  ${GREEN}✓${NC} $STREAM_PATH"

# CLAUDE.md — optional placement
echo ""
echo -e "Install CLAUDE.md (shipped persona)?"
echo -e "  ${BLUE}[1]${NC} ~/.claude/CLAUDE.md   ${BLUE}[2]${NC} ./CLAUDE.md   ${BLUE}[3]${NC} skip"
read -p "Select [1-3]: " cc
case "$cc" in
    1) mkdir -p "$HOME/.claude"; cp "$SCRIPT_DIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"; echo -e "  ${GREEN}✓${NC} ~/.claude/CLAUDE.md" ;;
    2) cp "$SCRIPT_DIR/CLAUDE.md" "./CLAUDE.md"; echo -e "  ${GREEN}✓${NC} ./CLAUDE.md" ;;
    *) echo -e "  ${YELLOW}skipped${NC}" ;;
esac

echo ""
echo -e "${GREEN}Done.${NC} Runnable examples are NOT installed — see examples/ in this repo."
echo -e "To wire agents/commands: cp -r $SCRIPT_DIR/{agents,commands} <project>/.claude/"
echo ""
