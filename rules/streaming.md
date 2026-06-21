---
globs:
  - "**/*.rs"
  - "**/*.ts"
  - "**/*.tsx"
exclude:
  - "**/target/**"
  - "**/node_modules/**"
---

# Streaming code standards

These rules apply when editing code that touches Solana streaming/decoding — `yellowstone-grpc`,
Carbon, `carbon-cli`, ShredStream, or any `*Subscribe` / `SubscribeRequest` / Geyser usage. They
encode the non-negotiables from the skill; load the linked skill files for detail.

## Verified IDs only

- **Never** write a program ID or instruction/account discriminator from memory. Source it from
  [resources.md](../skill/resources.md), Carbon's decoder source, or the live IDL.
- Re-derive Anchor discriminators to confirm: `sha256("global:<ix>")[..8]`. Native programs use a
  `u8`/enum tag — never an 8-byte discriminator.
- Always match **program ID AND discriminator** — discriminators collide across programs
  (`initialize_pool`, `create_pool`, `initialize`).
- Unverifiable value → `TODO: VERIFY`. Do not guess.

## Reliability is mandatory

Any subscription loop must have:
- **Reconnect** with backoff (native: TS 4th-arg options / Rust `ReconnectConfig`) and answer server
  `Ping`s.
- **Gap detection** via the `slots` stream + slot continuity.
- **Backfill** on a gap (`from_slot` / LaserStream replay / RPC gap-fill).
- **Dedup** — idempotent consumers keyed on `signature` (+ ix index) or `(pubkey, write_version)`.
- **Reorg handling** — run at `confirmed`, reconcile to `finalized`; emit corrections, don't mutate.

See [reliability.md](../skill/reliability.md).

## Filters & transport

- Detecting instructions → `transactions` stream filtered by program ID in `accountInclude`, with
  `vote:false`, `failed:false`. Don't over-subscribe (no full-block when a tx filter suffices).
- Narrow with `accountRequired` / `accounts_data_slice` to cut bandwidth.
- Default transport is Yellowstone gRPC at `confirmed`; justify ShredStream (unconfirmed) or
  WebSocket (lossy) when chosen.

## Decode & emit decoupling

- Keep decoding and emit independent of the datasource so transport swaps don't touch consumers.
- Normalize every event to the `solana-stream/v1` schema; stringify `u64`/`u128`; `signature` is the
  idempotency key ([agent-emit.md](../skill/agent-emit.md)).

## Secrets & testing

- Endpoints/tokens from env (`GRPC_ENDPOINT`, `GRPC_X_TOKEN`) — never hard-coded or committed.
- Decode logic must be provable offline against fixtures with no API key; gate live calls behind an
  env check.

## Delegate

Toolchain/Anchor/testing/security → solana-dev-skill (see [SKILL.md](../skill/SKILL.md)). Don't
duplicate those here.
