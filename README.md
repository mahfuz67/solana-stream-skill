# solana-stream-skill

A Claude Code **skill** that teaches a coding agent to detect and **decode** Solana on-chain events
in real time — new liquidity pools across every major DEX and launchpad token migrations — the
moment they happen, and emit them as structured events an autonomous agent can react to.

> Addon for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit). Extends
> [solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill).

> **Status:** under construction. This README is a stub filled at the final checkpoint. See
> [`skill/SKILL.md`](skill/SKILL.md) for the live router and decision tree.

## What it does

- Streams Solana via **Yellowstone gRPC** (Triton / Helius LaserStream / QuickNode), with
  **Jito ShredStream** and **WebSocket** paths covered.
- **Decodes** Anchor and native programs (Carbon + `carbon-cli`, Yellowstone-Vixen, or raw borsh).
- Ships the **verified map of what to watch**: program IDs + discriminators for pool creation and
  launchpad migrations, each confirmed against a live source.
- Emits normalized JSON events (stdout/JSONL, webhook, callback) for agent consumption.

## The problem it solves

Indexers, analytics, alerting, liquidation bots, DEX dashboards, and real-time agent products all
need to know *the instant* a new pool is created or a token migrates — and they all hand-roll the
program IDs and discriminators today, often from stale recall. This skill hands the agent a
**verified, sourced** map and proves decoding against recorded fixtures.

## Install

```bash
./install.sh            # recommended defaults → ~/.claude/skills/
./install-custom.sh     # choose personal vs project install
```

Install scripts copy **markdown only**. Runnable code lives in [`examples/`](examples/) and is never
placed in the install path.

## Pairs with

`solana-execution-skill` — this skill **detects and decodes**; pair it to **act** on the events.
