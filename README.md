# solana-stream-skill

A **skill** that teaches a coding agent to detect and **decode** Solana on-chain events
in real time — new liquidity pools across every major DEX and launchpad token migrations — the
moment they happen, and emit them as structured events an autonomous agent can react to.

> Addon for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit). Extends
> [solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill). MIT licensed.

## What it does

- **Streams** Solana via Yellowstone gRPC ("Dragon's Mouth"), with Helius LaserStream, QuickNode,
  Jito ShredStream, and WebSocket paths covered — in both TypeScript and Rust.
- **Decodes** Anchor *and* native programs (Carbon + `carbon-cli`, Yellowstone-Vixen, or raw borsh),
  handling the Anchor-vs-native discriminator distinction correctly.
- Ships the **verified map of what to watch** — program IDs + discriminators for pool creation and
  launchpad migrations — each confirmed against a live source and re-derived independently.
- **Emits** normalized `solana-stream/v1` JSON events (stdout/JSONL, webhook, callback) so an
  autonomous agent loop can react.

## The problem it solves

Indexers, analytics, alerting, liquidation bots, DEX dashboards, and real-time agent products all
need to know *the instant* a new pool is created or a token graduates — and they all hand-roll the
program IDs and discriminators today, often from stale recall. This skill hands the agent a
**verified, sourced** map and proves decoding against recorded fixtures in CI.

## The verified reference (the differentiator)

Every program ID and discriminator/tag is verified two independent ways — Carbon's maintained decoder
source **and** an independent `sha256("global:<ix>")[..8]` re-derivation — and sourced with a date
(see [`skill/resources.md`](skill/resources.md)). Covered:

- **Pools**: Raydium AMM v4 (native), Raydium CLMM, Raydium CPMM, Orca Whirlpools, Meteora DLMM,
  Meteora DAMM v2.
- **Migrations**: Pump.fun (create + graduation → PumpSwap), Raydium LaunchLab / LetsBonk,
  Meteora DBC / Believe, Moonshot.

It also documents the **discriminator collisions** (e.g. Orca and Meteora DAMM v2 both use
`initialize_pool` → identical 8 bytes) that recall-based code gets wrong — the rule is *always match
program ID AND discriminator*.

## Default stack (June 2026)

| Layer | Choice |
|---|---|
| Transport (default) | Yellowstone gRPC — Triton / Helius LaserStream / QuickNode |
| Earliest / MEV | Jito ShredStream (unconfirmed) |
| Fallback / prototype | WebSocket: `logs` / `account` / `programSubscribe` |
| TS client | `@triton-one/yellowstone-grpc` |
| Rust client | `yellowstone-grpc-client` + `yellowstone-grpc-proto` |
| Decode | Carbon (`sevenlabs-hq/carbon`, v1.0) + `carbon-cli`; Vixen alt; raw borsh |
| Backfill / replay | Helius LaserStream (~24h) or RPC gap-fill |
| Commitment | `confirmed` default; `finalized` to settle; `processed` for earliest |
| Emit | normalized `solana-stream/v1` JSON → stdout/JSONL, webhook, callback |

## Install

```bash
./install.sh            # recommended defaults → ~/.claude/skills/
./install-custom.sh     # choose personal (~/.claude) vs project (./.claude) install
```

Install scripts copy **markdown only** into `~/.claude/skills/solana-stream/` (or `./.claude/`), and
install the core `solana-dev-skill` it extends. Runnable code lives in [`examples/`](examples/) and is
**never** placed in the install path.

## Usage

Once installed, ask Claude things like:

- "Watch for new Raydium and Orca pools and print them as JSON."
- "Detect when a Pump.fun token is about to graduate, then when it migrates to PumpSwap."
- "Scaffold a Carbon indexer for Meteora DLMM pool creations."
- "Add a verified decoder for `<program address>` and wire it into the watcher."

Commands: `/scaffold-indexer`, `/add-decoder`, `/watch-pools`, `/emit-events`. Agent:
`stream-engineer` (opus).

## Examples & tests

Two runnable cross-DEX pool + migration watchers with offline decode tests that pass with **no API
key**:

```bash
make install   # npm + cargo deps
make test      # offline fixture decode tests (TS + Rust)
make validate  # tsc --noEmit + cargo compile-check + fixture count
make watch     # live watcher (needs GRPC_ENDPOINT — see .env.example)
make smoke     # live smoke test, auto-skipped when GRPC_ENDPOINT is unset
```

- [`examples/ts-yellowstone`](examples/ts-yellowstone) — TypeScript watcher + `node:test` suite.
- [`examples/rust-carbon`](examples/rust-carbon) — Rust decode lib + Carbon live watcher.
- [`examples/fixtures`](examples/fixtures) — recorded decode cases (key-free) asserting each fixture
  decodes to the expected pool/mint/migration fields.

## Pairs with

An **execution skill** (arb / trade / liquidation bot) — this skill **detects and decodes**; pair it
with one to **act** on the events. The [`agent-emit`](skill/agent-emit.md) adapter is the clean
hand-off boundary (normalized `solana-stream/v1` events in, your action out).

## Repo layout

`skill/` (router + focused docs) · `agents/` (stream-engineer) · `commands/` · `rules/` · `examples/`
· `CLAUDE.md` (shipped persona) · `BUILD.md` (contributor guide).

## License

MIT — see [LICENSE](LICENSE).
