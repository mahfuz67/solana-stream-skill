# gRPC setup — connect a Yellowstone stream (TS + Rust)

Connect to a Yellowstone gRPC ("Dragon's Mouth") endpoint, authenticate, send a `SubscribeRequest`,
and keep the stream alive. For *what* to put in the filters, see
[subscriptions-and-filters.md](subscriptions-and-filters.md); for transport choice, see the decision
tree in [SKILL.md](SKILL.md).

All major providers (Triton, Helius LaserStream, QuickNode) speak the same protocol, so the client
code below is portable — only the endpoint + token change.

## SubscribeRequest shape (authoritative)

From `yellowstone-grpc-proto/proto/geyser.proto`
(source: https://github.com/rpcpool/yellowstone-grpc/blob/master/yellowstone-grpc-proto/proto/geyser.proto — checked 2026-06-21):

```proto
message SubscribeRequest {
  map<string, SubscribeRequestFilterAccounts>     accounts = 1;
  map<string, SubscribeRequestFilterSlots>        slots = 2;
  map<string, SubscribeRequestFilterTransactions> transactions = 3;
  map<string, SubscribeRequestFilterTransactions> transactions_status = 10;
  map<string, SubscribeRequestFilterBlocks>       blocks = 4;
  map<string, SubscribeRequestFilterBlocksMeta>   blocks_meta = 5;
  map<string, SubscribeRequestFilterEntry>        entry = 8;
  optional CommitmentLevel                        commitment = 6;
  repeated SubscribeRequestAccountsDataSlice      accounts_data_slice = 7;
  optional SubscribeRequestPing                   ping = 9;
  optional uint64                                 from_slot = 11;  // replay/backfill start slot
}

enum CommitmentLevel { PROCESSED = 0; CONFIRMED = 1; FINALIZED = 2; }
```

Each filter map is keyed by a **client-chosen label** (e.g. `"pools"`); that label is echoed back on
every matching update so you can route by subscription. `from_slot` requests replay from a past slot
(provider-dependent; see [reliability.md](reliability.md)).

## TypeScript — `@triton-one/yellowstone-grpc`

v5+ uses a napi-rs core with an optional built-in reconnect/backfill/dedup layer (4th constructor
arg). Source: https://github.com/rpcpool/yellowstone-grpc/tree/master/yellowstone-grpc-client-nodejs
(checked 2026-06-21).

```bash
npm install @triton-one/yellowstone-grpc
```

```ts
import Client, {
  CommitmentLevel,
  SubscribeRequest,
} from "@triton-one/yellowstone-grpc";

const client = new Client(
  process.env.GRPC_ENDPOINT!,            // e.g. https://your-endpoint.example.com:443
  process.env.GRPC_X_TOKEN,              // provider auth token (x-token); undefined if none
  {
    grpcMaxDecodingMessageSize: 64 * 1024 * 1024,
  },
  {
    backoff: { initialIntervalMs: 100, multiplier: 2, maxRetries: 10 },
    slotRetention: 250,                  // dedup/backfill window in slots
  },
);

await client.connect();

const request: SubscribeRequest = {
  accounts: {},
  slots: {},
  transactions: {},
  transactionsStatus: {},
  entry: {},
  blocks: {},
  blocksMeta: {},
  accountsDataSlice: [],
  commitment: CommitmentLevel.CONFIRMED,
  ping: undefined,
};

const stream = await client.subscribe(request);

stream.on("data", (update) => {
  if (update.ping) {
    stream.write({ ...request, ping: { id: 1 } });   // answer server ping; keeps LBs alive
    return;
  }
  // update.filters carries the subscription label(s) that matched; route on it.
});

stream.on("error", (err) => {
  console.error("stream error", err);
});
```

The 4th constructor arg enables reconnect/backfill/dedup; omit it (or `{ enabled: false }`) for the
raw no-reconnect stream. See [reliability.md](reliability.md).

## Rust — `yellowstone-grpc-client` + `yellowstone-grpc-proto`

Source: https://github.com/rpcpool/yellowstone-grpc/blob/master/examples/rust/src/bin/client.rs
(checked 2026-06-21).

```toml
[dependencies]
yellowstone-grpc-client = "<workspace>"   # pin to the provider-compatible release
yellowstone-grpc-proto  = "<workspace>"
tokio   = { version = "1", features = ["rt-multi-thread", "macros"] }
futures = "0.3"
tonic   = { version = "0.12", features = ["tls-native-roots"] }
```

```rust
use {
    futures::{SinkExt, StreamExt},
    std::collections::HashMap,
    tonic::transport::channel::ClientTlsConfig,
    yellowstone_grpc_client::GeyserGrpcClient,
    yellowstone_grpc_proto::geyser::{
        subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest, SubscribeRequestPing,
    },
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut client = GeyserGrpcClient::build_from_shared(std::env::var("GRPC_ENDPOINT")?)?
        .x_token(std::env::var("GRPC_X_TOKEN").ok())?
        .tls_config(ClientTlsConfig::new().with_native_roots())?
        .max_decoding_message_size(64 * 1024 * 1024)
        .connect()
        .await?;

    let request = SubscribeRequest {
        commitment: Some(CommitmentLevel::Confirmed as i32),
        accounts: HashMap::new(),
        transactions: HashMap::new(),
        ..Default::default()
    };

    let (mut subscribe_tx, mut stream) = client.subscribe_with_request(Some(request)).await?;

    while let Some(message) = stream.next().await {
        match message?.update_oneof {
            Some(UpdateOneof::Ping(_)) => {
                subscribe_tx
                    .send(SubscribeRequest { ping: Some(SubscribeRequestPing { id: 1 }), ..Default::default() })
                    .await?;
            }
            Some(UpdateOneof::Transaction(_tx)) => { /* decode — see decoding.md */ }
            Some(UpdateOneof::Account(_acc)) => { /* decode account */ }
            _ => {}
        }
    }
    Ok(())
}
```

`subscribe_with_request` returns `(sink, stream)`: hold the sink to update filters live or answer
pings; consume the stream for updates.

## Auth, keepalive, commitment

- **x-token auth.** Every provider authenticates with a token sent as `x-token` — TS: 2nd
  constructor arg; Rust: `.x_token(...)`. Never hard-code it; load from `GRPC_X_TOKEN`.
- **Ping/keepalive.** The server emits `Ping`; reply by sending a `SubscribeRequest` with `ping`
  set (shown above). Required behind load balancers that expect periodic client traffic. Rust also
  exposes HTTP/2 keepalive on the builder (`http2_keep_alive_interval`, `keep_alive_while_idle`,
  `tcp_keepalive`).
- **Commitment.** `processed` = earliest, droppable on fork; `confirmed` = default for real-time
  watchers; `finalized` = no reorgs. Pool/migration watchers run `confirmed` and reconcile to
  `finalized` ([reliability.md](reliability.md)).

## Provider endpoints

| Provider | Endpoint source | Auth |
|---|---|---|
| Triton ("Dragon's Mouth") | endpoint from your Triton plan | `x-token` |
| Helius LaserStream | regional LaserStream endpoint from the Helius dashboard (Yellowstone-compatible; ~24h replay, multi-region failover) | API key as `x-token` |
| QuickNode | Yellowstone gRPC add-on endpoint from the QuickNode dashboard | token as `x-token` |

Pull the exact host/token from the provider dashboard and put them in `.env`
(`GRPC_ENDPOINT`, `GRPC_X_TOKEN`) — never commit them.
