# WebSockets fallback — when gRPC is overkill or unavailable

Standard Solana RPC WebSocket subscriptions need no special provider add-on and are the quickest way
to prototype. They're slower (~200–400ms), lossier, and connection-limited versus Yellowstone gRPC —
fine to start, migrate to gRPC for production ([grpc-setup.md](grpc-setup.md)).

## The subscriptions that matter here

| Method | Fires on | Use for |
|---|---|---|
| `logsSubscribe` | transaction logs mentioning a program/account | cheapest "did program X do something" trigger |
| `programSubscribe` | account changes owned by a program | watching all pools/curves of one program |
| `accountSubscribe` | a single account's changes | tracking one pool/bonding-curve account |
| `slotSubscribe` | slot progression | gap detection ([reliability.md](reliability.md)) |

For new-pool / migration detection, `logsSubscribe` filtered by the DEX program ID is the usual
WebSocket entry point: you get the signature, then fetch + decode the transaction.

### logsSubscribe → fetch → decode

```ts
import { Connection } from "@solana/web3.js";

const conn = new Connection(process.env.RPC_HTTP!, { wsEndpoint: process.env.RPC_WS });

conn.onLogs(
  new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"), // Raydium AMM v4 — resources.md
  async (logs) => {
    if (logs.err) return;
    const tx = await conn.getTransaction(logs.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    // match the pool-init discriminator/tag in the instruction data, then decode (decoding.md)
  },
  "confirmed",
);
```

Note the extra round-trip: `logsSubscribe` gives logs + signature, not instruction data — you
`getTransaction` to get the bytes, then decode with the **verified** discriminator/tag. gRPC's
`transactions` stream skips this round-trip by delivering the full transaction inline.

### accountSubscribe (early-migration signal without gRPC)

```ts
conn.onAccountChange(
  bondingCurvePubkey,            // Pump.fun BondingCurve — launchpad-migrations.md
  (info) => {
    // borsh-decode; emit migration_pending when complete === true
  },
  "confirmed",
);
```

## Enhanced WebSockets

Some providers (e.g. Helius) offer **Enhanced WebSockets** — server-side filtered, transaction-level
subscriptions over WS that get closer to gRPC ergonomics (richer filters, decoded payloads) without
running a gRPC client. Useful middle ground when you want better-than-vanilla WS but can't adopt
Yellowstone. Capabilities and limits are provider-specific — check their docs.

## Limits vs gRPC

| | WebSocket RPC | Yellowstone gRPC |
|---|---|---|
| Latency | ~200–400ms | ~sub-100ms |
| Delivery | best-effort, can drop under load | backpressured, server-side filtered |
| Payload | logs/account; tx needs a `getTransaction` round-trip | full tx/account inline |
| Filtering | by program/account; coarse | `accountInclude`/`Required`/`Exclude`, memcmp, data-slice |
| Connections | provider-capped, few subscriptions each | high-throughput single stream |
| Reconnect/replay | roll your own; no replay | native reconnect + backfill/replay |

## When WebSocket is good enough

- Prototyping or a one-off watcher for a single program.
- Low event volume where ~hundreds of ms and occasional drops are acceptable.
- No Yellowstone endpoint available.

Otherwise prefer gRPC. If you start on WebSocket, keep your **decoding** code
([decoding.md](decoding.md)) and **emit** code ([agent-emit.md](agent-emit.md)) transport-agnostic so
moving to gRPC later is just swapping the source — exactly how Carbon's datasource abstraction works.
