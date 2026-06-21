---
description: "Scaffold a Carbon (Rust) or yellowstone-grpc (TS) streaming pipeline for a target program/event"
---

Scaffold a real-time indexer pipeline for the user's target program/event. Read
[decoding.md](../skill/decoding.md), [grpc-setup.md](../skill/grpc-setup.md), and
[subscriptions-and-filters.md](../skill/subscriptions-and-filters.md) first.

## Step 1 — Clarify
- What to index: specific program(s)? new pools? migrations? Which venues?
- Language: Rust (Carbon) or TypeScript (yellowstone-grpc).
- Transport: Yellowstone gRPC (default) / LaserStream / ShredStream / WebSocket — use the
  [decision tree](../skill/SKILL.md).
- Live only, or backfill too.

## Step 2 — Verify targets
Resolve every program ID + pool-init/migration discriminator from [resources.md](../skill/resources.md)
(or generate a decoder with `/add-decoder`). Never hard-code an unverified value. Classify Anchor vs
native per program.

## Step 3 — Generate

**Rust (Carbon):**
```sh
npx @sevenlabs-hq/carbon-cli scaffold -n <name> -o . --idl <idlOrAddress> --idl-standard anchor -s yellowstone-grpc
```
Then wire `Pipeline::builder().datasource(...).instruction(<Decoder>, <Processor>)...` and implement
the processor against the typed instruction.

**TypeScript:** create the `Client` + `SubscribeRequest` from [grpc-setup.md](../skill/grpc-setup.md),
filter by program ID in `accountInclude`, and match the discriminator/tag in the handler.

## Step 4 — Wire reliability + emit
Add reconnect/gap-detection/backfill/dedup ([reliability.md](../skill/reliability.md)) and a
normalized emit sink ([agent-emit.md](../skill/agent-emit.md)) — or run `/emit-events`.

## Step 5 — Prove it
Add an offline fixture decode test (no API key) before any live run. Gate live smoke tests behind an
env check. Two-strike rule: if it fails twice on the same cause, stop and ask.

Keep endpoints/tokens in `.env` (`GRPC_ENDPOINT`, `GRPC_X_TOKEN`).
