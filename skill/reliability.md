# Reliability — make the stream production-grade

A naive stream loses events on every disconnect and double-counts on reconnect. Six concerns turn a
demo into an indexer you can trust: **reconnect/backoff, gap detection, backfill, dedup, reorgs, and
ordering**. Patterns below verified against `rpcpool/yellowstone-grpc` (checked 2026-06-21).

## 1. Reconnect / backoff

Both clients ship a native reconnect layer — prefer it over hand-rolling.

**TypeScript** — pass reconnect options as the 4th constructor arg (also enables backfill + dedup):

```ts
const client = new Client(endpoint, xToken, channelOptions, {
  backoff: { initialIntervalMs: 100, multiplier: 2, maxRetries: 10 },
  slotRetention: 250,
});
```

**Rust** — `set_reconnect_config` on the builder, then `subscribe_once`:

```rust
use yellowstone_grpc_client::{GeyserGrpcClient, ReconnectConfig};

let mut client = GeyserGrpcClient::build_from_shared(endpoint)?
    .x_token(x_token)?
    .set_reconnect_config(ReconnectConfig::default())
    .connect()
    .await?;

let mut stream = client.subscribe_once(request).await?;
```

If you must manage reconnect yourself, wrap connect+subscribe in a loop with exponential backoff and
a cap, persisting the last processed slot (see backfill). Always answer server `Ping`
([grpc-setup.md](grpc-setup.md)) so load balancers don't drop you.

## 2. Gap detection via slot continuity

Subscribe to `slots` and assert each slot follows the last. A jump means you missed data (disconnect,
backpressure drop, or provider hiccup) — trigger backfill for the gap.

```ts
request.slots.tip = { filterByCommitment: true, interslotUpdates: false };

let lastSlot: number | undefined;
stream.on("data", (u) => {
  if (u.slot) {
    const s = Number(u.slot.slot);
    if (lastSlot !== undefined && s > lastSlot + 1) {
      backfill(lastSlot + 1, s - 1); // see section 3
    }
    lastSlot = Math.max(lastSlot ?? 0, s);
  }
});
```

`filter_by_commitment: true` emits one slot update per slot at your commitment (less noise);
`interslot_updates` adds finer-grained progress if you need it. Don't assume strictly +1 across
commitment changes — track per commitment level.

## 3. Backfill

Fill a detected gap, by increasing cost/latency:

| Method | How | When |
|---|---|---|
| Native slot retention | TS `slotRetention` / Rust `ReconnectConfig` replays buffered slots on reconnect | short blips within the retention window |
| `from_slot` | set `SubscribeRequest.from_slot` to the first missed slot to resume the stream from there | provider supports replay; gap within its horizon |
| LaserStream replay | reconnect to Helius LaserStream requesting the missed range (~24h replay) | longer gaps, region failover |
| RPC gap-fill | `getBlocks(start,end)` then `getBlock`/`getTransaction`, or `getSignaturesForAddress` per program, decode offline | last resort / beyond replay horizon |

Persist the last processed slot durably so you can compute the gap after a crash, not just a
reconnect. Decode backfilled transactions through the **same** decoders as the live path so events
are identical.

## 4. Dedup

Reconnect + backfill *will* re-deliver messages. Make every consumer idempotent:

- Key on **transaction signature + instruction index** (or `signature` alone for tx-level events).
- For account updates, key on `(pubkey, write_version)` or `(pubkey, slot)` and keep the
  highest-seen.
- Keep a bounded LRU/`slotRetention`-sized set of recent keys; the native layer dedups within its
  window, but your own store must cover restarts.

```ts
const seen = new Set<string>(); // bound this (LRU) in production
function emitOnce(key: string, ev: unknown) {
  if (seen.has(key)) return;
  seen.add(key);
  emit(ev); // agent-emit.md
}
```

## 5. Reorgs across commitment levels

`processed` and `confirmed` can be rolled back; `finalized` cannot. A pool you saw at `confirmed`
may vanish on a fork.

- Run the watcher at **`confirmed`** for latency, tag each emitted event with its commitment, and
  **reconcile at `finalized`**: re-observe (or `getTransaction` at finalized) and emit a
  `confirmed → finalized` confirmation, or a `dropped` event if it never finalizes.
- For irreversible actions (paying out, trading on the signal), gate on `finalized` or accept the
  reorg risk explicitly.
- Treat an event's `slot` as provisional until finalized; downstream consumers should handle a later
  `dropped`/`reorged` correction.

## 6. Ordering guarantees

- Updates arrive **slot-ascending** on a healthy stream, but **within** a slot accounts and
  transactions can interleave — don't assume tx-before-account or vice versa.
- Reconnects/backfill break global order; rely on `slot` (+ `write_version` for accounts) to
  re-sort, not on arrival order.
- For strict per-pool causal order, sort buffered events by `(slot, write_version|index)` before
  emitting.

## Minimum production checklist

- [ ] Native reconnect enabled (TS 4th arg / Rust `ReconnectConfig`) and server pings answered.
- [ ] `slots` subscription + slot-continuity gap detection.
- [ ] Durable last-processed-slot; backfill via `from_slot`/LaserStream/RPC on a gap.
- [ ] Idempotent consumers keyed on signature/(pubkey,write_version).
- [ ] Run at `confirmed`, reconcile to `finalized`, emit corrections on reorg.
- [ ] Re-sort by slot before any order-sensitive downstream step.
