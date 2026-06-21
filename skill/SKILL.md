---
name: solana-stream
description: >
  Real-time Solana on-chain event detection and DECODING. Use when the user wants to detect or
  decode on-chain events as they happen — new liquidity pools across DEXs (Raydium AMM v4 / CLMM /
  CPMM, Orca Whirlpools, Meteora DLMM / DAMM v2), launchpad token migrations (Pump.fun →
  PumpSwap graduation, Raydium LaunchLab / LetsBonk, Moonshot, Believe), or any program's
  instructions/accounts; stream via Yellowstone gRPC ("Dragon's Mouth"), Helius LaserStream,
  QuickNode, or Jito ShredStream; build an indexer, mempool/firehose, pool watcher, migration
  sniffer, liquidation or alerting bot; subscribe with SubscribeRequest filters (accountInclude /
  accountRequired / owner / commitment); decode Anchor vs native instructions with Carbon,
  carbon-cli, Yellowstone-Vixen, or raw borsh; and emit normalized JSON events an autonomous agent
  can react to. Triggers: "watch new pools", "detect token migration", "stream Solana events",
  "Geyser gRPC", "yellowstone-grpc", "decode instruction discriminator", "build a Solana indexer",
  "real-time on-chain data".
user-invocable: true
---

# Solana Stream Skill — real-time on-chain event detection & decoding

> **Extends**: [solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill) — core
> Solana development (programs, frontend, testing, security). This is an **addon**: it adds the
> real-time streaming + decoding layer and the *verified map of what to watch*. It delegates
> toolchain/Anchor setup, LiteSVM/Surfpool testing, IDL codegen, and security review to the core
> skill — see [Delegate to core skill](#delegate-to-core-skill).

Stream Solana, decode the events that matter (new pools, migrations, any instruction), and emit
them as normalized JSON an agent can act on. Frameworks (Carbon, Vixen) tell you *how* to decode;
this skill supplies the **verified program IDs + discriminators** — the part everyone hand-rolls —
each confirmed against a live source. See [resources.md](resources.md) for the master table.

## Decision tree: which transport?

```
Need on-chain events in real time
│
├─ Do you need the absolute earliest signal (pre-confirmation, MEV/sniping)?
│   └─ YES → Jito ShredStream (shred-level, UNCONFIRMED — you must handle forks/false starts)
│            → shredstream-and-latency.md
│
├─ Do you need decoded accounts/transactions at scale with low latency (indexers, watchers, bots)?
│   └─ YES → Yellowstone gRPC ("Dragon's Mouth") — DEFAULT. ~sub-100ms, server-side filters,
│            backpressure. Providers: Triton, Helius LaserStream (≈24h replay + multi-region
│            failover), QuickNode.  → grpc-setup.md  → subscriptions-and-filters.md
│
└─ Just prototyping, low volume, or no gRPC endpoint available?
    └─ YES → WebSocket (logsSubscribe / accountSubscribe / programSubscribe). ~200–400ms, lossy,
             connection limits. Fine to start; migrate to gRPC for production. → websockets-fallback.md
```

**Commitment:** use `processed` for earliest (may be dropped on fork), `confirmed` for the common
real-time choice, `finalized` when you cannot tolerate reorgs. Pool-creation and migration watchers
typically run at `confirmed` and reconcile to `finalized`. See
[reliability.md](reliability.md) for reorg handling.

**Provider pick:** need replay/backfill after a gap → Helius LaserStream; already on QuickNode/Triton
→ their Yellowstone endpoint. All speak the Yellowstone protocol, so client code is portable.

## Decode path: Anchor vs native

Every program is either **Anchor** (8-byte instruction discriminator =
`sha256("global:<ix>")[..8]`; 8-byte account discriminator = `sha256("account:<Name>")[..8]`) or
**native** (a `u8`/enum instruction tag — e.g. **Raydium AMM v4**). You MUST decode each accordingly;
guessing a discriminator is the one failure this skill exists to prevent. Verify every ID per the
procedure in [decoding.md](decoding.md) and record it in [resources.md](resources.md).

## Routing table

| When the user wants to… | Read |
|---|---|
| Connect a stream (TS/Rust client, SubscribeRequest, auth, keepalive) | [grpc-setup.md](grpc-setup.md) |
| Design filters (account/tx/slot/block; accountInclude vs accountRequired; cut bandwidth) | [subscriptions-and-filters.md](subscriptions-and-filters.md) |
| Decode instructions/accounts (Carbon pipeline, carbon-cli, Vixen, raw borsh; Anchor vs native) | [decoding.md](decoding.md) |
| ★ Detect **new liquidity pools** across DEXs (verified IDs + discriminators + fields) | [pool-creation-events.md](pool-creation-events.md) |
| ★ Detect **launchpad migrations** (Pump.fun→PumpSwap, LaunchLab/LetsBonk, Moonshot, Believe) | [launchpad-migrations.md](launchpad-migrations.md) |
| Make it production-grade (reconnect/backoff, gap detection, backfill, dedup, reorgs, ordering) | [reliability.md](reliability.md) |
| Decide if ShredStream's pre-confirmation latency is worth it | [shredstream-and-latency.md](shredstream-and-latency.md) |
| Use WebSockets instead of gRPC (limits, when it's enough) | [websockets-fallback.md](websockets-fallback.md) |
| Emit decoded events to an agent (stable JSON schema; stdout/JSONL, webhook, callback) | [agent-emit.md](agent-emit.md) |
| Look up the master verified program-ID reference + provider/SDK links | [resources.md](resources.md) |

## Default Stack (June 2026)

| Layer | Choice |
|---|---|
| Transport (default) | Yellowstone gRPC — Triton / Helius LaserStream / QuickNode |
| Earliest / MEV | Jito ShredStream (unconfirmed) |
| Fallback / prototype | WebSocket: `logsSubscribe` / `accountSubscribe` / `programSubscribe` |
| TS client | `@triton-one/yellowstone-grpc` |
| Rust client | `yellowstone-grpc-client` + `yellowstone-grpc-proto` |
| Decode framework | Carbon (`sevenlabs-hq/carbon`, v0.9.x) + `carbon-cli`; Yellowstone-Vixen as alt; raw borsh no-framework path |
| Decoder generation | `carbon-cli parse` (from IDL or program address) |
| Backfill / replay | Helius LaserStream (~24h replay) or RPC gap-fill |
| Commitment | `confirmed` default; `finalized` to settle; `processed` for earliest |
| Emit | normalized JSON → stdout/JSONL, webhook, callback ([agent-emit.md](agent-emit.md)) |

## Delegate to core skill

Do **not** duplicate these — route to [solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill):

| For… | Go to |
|---|---|
| Toolchain / version / Anchor setup errors | core skill `references/common-errors.md`, `compatibility-matrix.md` |
| Anchor / Pinocchio program internals | core `references/programs/anchor.md`, `programs/pinocchio.md` |
| IDL fetch & client codegen (Codama/Shank) | core `references/idl-codegen.md` |
| Testing (LiteSVM, Mollusk, Surfpool) | core `references/testing.md` |
| Security review | core `references/security.md` |

## Pairs with

`solana-execution-skill` — this skill **detects and decodes**; pair it with an execution skill to
**act** on the events (swap, snipe, liquidate). The [agent-emit.md](agent-emit.md) adapter is the
clean hand-off boundary.
