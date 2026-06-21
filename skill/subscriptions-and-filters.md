# Subscriptions & filters — pick the right stream, then cut the noise

A `SubscribeRequest` carries one or more **named filters** across five stream types. The art is
choosing the narrowest filter that still catches every event you need — bandwidth, cost, and decode
CPU all scale with what you let through. For connection mechanics see
[grpc-setup.md](grpc-setup.md); all field defs below are from the geyser proto
(source: https://github.com/rpcpool/yellowstone-grpc/blob/master/yellowstone-grpc-proto/proto/geyser.proto — checked 2026-06-21).

## The five stream types

| Stream | Filter message | Emits | Use for |
|---|---|---|---|
| `accounts` | `SubscribeRequestFilterAccounts` | account writes | watching pool/vault/config state change |
| `transactions` | `SubscribeRequestFilterTransactions` | full transactions | **detecting instructions** (new pool, migration) |
| `transactions_status` | same | tx status only (no payload) | cheap "did it land" signal |
| `slots` | `SubscribeRequestFilterSlots` | slot progression | gap detection, reorg tracking |
| `blocks` / `blocks_meta` | `SubscribeRequestFilter{Blocks,BlocksMeta}` | full blocks / headers | block-level indexing, timestamps |
| `entry` | `SubscribeRequestFilterEntry` | PoH entries | advanced ordering/latency work |

For pool-creation and migration detection you almost always want the **`transactions`** stream
filtered by program ID — the init/migration instruction lives in the transaction, not in a single
account write. Pair it with `slots` for gap detection.

## Transaction filter semantics (the part people get wrong)

```proto
message SubscribeRequestFilterTransactions {
  optional bool   vote = 1;
  optional bool   failed = 2;
  optional string signature = 5;
  repeated string account_include = 3;   // OR  — tx touches ANY of these
  repeated string account_exclude = 4;   // NOT — drop tx touching ANY of these
  repeated string account_required = 6;  // AND — tx must touch ALL of these
}
```

- **`accountInclude` = OR.** Tx passes if it references *at least one* listed account. Put the
  **program IDs** here to catch every transaction that invokes a DEX/launchpad.
- **`accountRequired` = AND.** Tx passes only if it references *all* listed accounts. Use to narrow
  to a specific pool, market, or `(program AND base mint)` pair.
- **`accountExclude` = NOT.** Drop transactions touching any listed account (e.g. exclude a noisy
  router).
- `vote: false` + `failed: false` removes vote spam and reverted txs — almost always what you want
  for event detection.

The three lists combine: a tx passes when `(include matched) AND (all required present) AND (none
excluded)`.

### Example: every new-pool tx across two DEXs, no votes, no failures

TypeScript:

```ts
request.transactions.pools = {
  vote: false,
  failed: false,
  accountInclude: [
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",  // Raydium AMM v4 — verify in pool-creation-events.md
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",   // Orca Whirlpools — verify in pool-creation-events.md
  ],
  accountExclude: [],
  accountRequired: [],
};
```

Rust:

```rust
use yellowstone_grpc_proto::geyser::SubscribeRequestFilterTransactions;

request.transactions.insert(
    "pools".to_string(),
    SubscribeRequestFilterTransactions {
        vote: Some(false),
        failed: Some(false),
        account_include: vec![
            "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8".to_string(),
            "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc".to_string(),
        ],
        account_exclude: vec![],
        account_required: vec![],
        ..Default::default()
    },
);
```

> Program IDs above are illustrative — use only the **verified, sourced** values from
> [pool-creation-events.md](pool-creation-events.md) / [resources.md](resources.md).

## Account filter semantics

```proto
message SubscribeRequestFilterAccounts {
  repeated string account = 2;   // specific account pubkeys
  repeated string owner = 3;     // owning program(s)
  repeated SubscribeRequestFilterAccountsFilter filters = 4;  // memcmp / datasize / lamports / token_account_state
  optional bool nonempty_txn_signature = 5;
}
```

- `owner` = the program that owns the accounts (e.g. subscribe to all Whirlpool accounts).
- `filters`: `memcmp { offset, bytes|base58|base64 }`, `datasize`, `token_account_state`,
  `lamports { eq|ne|lt|gt }` — combine to match one account layout. `datasize` + a discriminator
  `memcmp` at offset 0 cheaply isolates a single account type (e.g. only `Pool` accounts).
- `nonempty_txn_signature: true` drops snapshot/no-tx writes.

Use the `accounts` stream when you care about **state**, the `transactions` stream when you care
about **the instruction that caused it**.

## `accounts_data_slice` — stop shipping bytes you won't read

`accounts_data_slice: [{ offset, length }]` returns only those byte ranges of each account. If you
only need the discriminator and two mints, slice them out instead of streaming whole accounts. Large
bandwidth saver on hot account subscriptions.

## Filter-design checklist (minimize bandwidth/cost)

1. Detecting instructions? Use `transactions` filtered by **program ID in `accountInclude`**, not a
   full-block subscription.
2. Always set `vote: false`, `failed: false` unless you specifically need them.
3. Narrow with `accountRequired` (e.g. program + base mint) before widening `accountInclude`.
4. Watching state? Prefer `accounts` with `owner` + a `datasize`/`memcmp` filter over `blocks`.
5. Add `accounts_data_slice` when you read only a few fields.
6. One labelled filter per concern (`"pools"`, `"migrations"`) so the echoed `filters` label routes
   updates without re-inspecting payloads.
7. Match commitment to need (`confirmed` default); coarser commitment = fewer interim updates.

## Updating filters live

Both clients let you change the subscription without reconnecting: hold the sink
(`subscribe_tx.send(newRequest)` in Rust, `stream.write(newRequest)` in TS) and send a fresh
`SubscribeRequest`. Use this to add a pool to `accountRequired` the moment you detect its creation.
