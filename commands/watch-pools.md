---
description: "Stand up the cross-DEX new-pool + launchpad-migration watcher with verified decoders"
---

Stand up a watcher that emits a normalized event for every new pool and migration across venues. This
is the flagship end-to-end use case. Read [pool-creation-events.md](../skill/pool-creation-events.md),
[launchpad-migrations.md](../skill/launchpad-migrations.md), and [agent-emit.md](../skill/agent-emit.md).

## Step 1 — Scope
Confirm which venues to watch (default: all verified — Raydium AMM v4/CLMM/CPMM, Orca Whirlpools,
Meteora DLMM/DAMM v2 for pools; Pump.fun, LaunchLab/LetsBonk, Meteora DBC, Moonshot for migrations)
and language (Rust/Carbon or TS). Start from `examples/rust-carbon` or `examples/ts-yellowstone`.

## Step 2 — Filter
One `transactions` subscription with `accountInclude` = every target program ID, `vote:false`,
`failed:false` ([subscriptions-and-filters.md](../skill/subscriptions-and-filters.md)). Optionally add
an `accounts` subscription on Pump.fun `BondingCurve` for the early `migration_pending` signal.

## Step 3 — Match & decode
For each transaction, match **program ID AND** the pool-init / migration discriminator from
[resources.md](../skill/resources.md) (remember the collisions: `initialize_pool`, `create_pool`,
`initialize` are shared across programs). Decode with the venue's Carbon decoder or raw borsh.

## Step 4 — Normalize & emit
Map venue fields to the `solana-stream/v1` schema (`pool_created` / `migration_pending` / `migrated`)
and emit via the chosen sink ([agent-emit.md](../skill/agent-emit.md)). Run `/emit-events` to wire
JSONL/webhook/callback.

## Step 5 — Reliability + proof
Enable reconnect/gap-detection/backfill/dedup, reconcile `confirmed → finalized`
([reliability.md](../skill/reliability.md)). Verify against fixtures offline before going live.
