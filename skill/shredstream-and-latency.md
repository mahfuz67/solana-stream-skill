# ShredStream & latency — when pre-confirmation is worth it

Jito **ShredStream** delivers **shreds** — the packet fragments validators gossip *before* a block is
processed — so you see transactions earlier than any confirmed stream. It is the lowest-latency
option and the riskiest: the data is **unconfirmed and may never land**.

## Latency ladder

| Source | Typical latency | Status of data |
|---|---|---|
| Jito ShredStream | earliest (shred-level, pre-processing) | **unconfirmed** — may be dropped/forked |
| Yellowstone gRPC `processed` | ~sub-100ms | unconfirmed, droppable on fork |
| Yellowstone gRPC `confirmed` | ~hundreds of ms | reorg-able but rarely |
| Yellowstone gRPC `finalized` | ~12–13s | irreversible |
| WebSocket | ~200–400ms | per commitment; lossy |

ShredStream buys you tens-to-hundreds of milliseconds over `processed` gRPC. That edge matters for
sniping/MEV and almost nothing else.

## How it works

You run the `jito-shredstream-proxy` (request access from Jito): it connects to a Jito region,
receives shreds, **reconstructs** entries/transactions, and exposes them over a local gRPC endpoint.
Carbon consumes this directly via `jito-shredstream-grpc-datasource` — swap it in for the
yellowstone datasource and the rest of your pipeline (decoders, processors) is unchanged
([decoding.md](decoding.md), [resources.md](resources.md)).

```rust
// Same pipeline as decoding.md, different datasource:
use carbon_jito_shredstream_grpc_datasource::JitoShredstreamGrpcClient;
// Pipeline::builder().datasource(jito_shredstream).instruction(MyDecoder, MyProcessor)...
```

## Tradeoffs

**You gain:** the absolute earliest view of a new-pool or migration transaction — before it's even
processed.

**You give up:**
- **Certainty.** Shreds can be skipped, re-ordered, or land on a fork. A "new pool" seen here may
  never confirm. Treat every ShredStream event as a *candidate*.
- **Completeness/ordering.** Reconstruction can be partial; you may see a transaction with missing
  context. No commitment semantics apply.
- **Simplicity & cost.** You operate a proxy and need Jito access; more moving parts than a hosted
  gRPC endpoint.

## When it's worth it

Use ShredStream **only** when single-digit-to-low-hundreds of milliseconds changes the outcome:
front-running a pool, first-block sniping, latency-critical MEV. For indexing, analytics, alerting,
dashboards, and virtually all agent use cases, **Yellowstone gRPC at `confirmed` is the right
default** — the latency is fine and you avoid acting on data that never lands.

## If you do use it

- **Always confirm before acting.** Pair ShredStream (the candidate signal) with a Yellowstone
  `confirmed`/`finalized` stream (the confirmation), and reconcile — exactly the reorg pattern in
  [reliability.md](reliability.md). Emit `candidate` → `confirmed` → optionally `dropped`.
- Dedup across both streams by signature so the same event from shred + confirmed collapses to one.
- Never gate irreversible actions on the shred signal alone unless you accept the loss when it
  doesn't land.
