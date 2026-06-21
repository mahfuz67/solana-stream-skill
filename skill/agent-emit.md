# Agent emit — a decoded event stream agents can act on

Detection and decoding are only useful if something downstream can react. This is the bridge to the
agentic layer: every decoded pool/migration event is normalized to **one stable JSON schema** and
delivered over **stdout/JSONL, webhook, or an in-process callback**. An autonomous agent loop
consumes the same shape regardless of which DEX or launchpad produced it. Pair with an execution
skill to *act* (`pairs with solana-execution-skill`).

## Normalized schema (`solana-stream/v1`)

The decoders return venue-specific field names (`token0`/`token_mint_a`/`token_mint_x`). Normalization
collapses them to stable names so consumers never special-case a venue.

```jsonc
{
  "schema": "solana-stream/v1",
  "type": "pool_created" | "migration_pending" | "migrated",
  "venue": "raydium-amm-v4",            // raydium-clmm | orca-whirlpool | meteora-dlmm | pumpfun | ...
  "program": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  "instruction": "initialize2",
  "signature": "5h2...",               // dedup / idempotency key
  "slot": 301234567,
  "blockTime": 1718900000,             // unix seconds; null if unavailable
  "commitment": "confirmed",           // processed | confirmed | finalized
  "pool": "<pubkey>",
  "mintA": "<pubkey>",
  "mintB": "<pubkey>",
  "lpMint": "<pubkey|null>",           // null for CLMM/Whirlpools/DLMM/DAMMv2 (no LP mint)
  "vaultA": "<pubkey|null>",
  "vaultB": "<pubkey|null>",
  "amounts": { "initA": "0", "initB": "0" },   // STRINGS — u64/u128 exceed JS Number
  "migration": { "from": "pumpfun", "to": "pumpswap" },  // present only on migration events
  "raw": {}                            // optional venue-specific extras, never required by consumers
}
```

Rules that keep it stable:
- **`type`** is the contract: `pool_created`, `migration_pending` (e.g. Pump.fun `complete=true`),
  `migrated`. Add types, never repurpose them.
- **All integers are strings** (`u64`/`u128` overflow JS `Number`). Same in Rust output for parity.
- **`signature`** is the idempotency key; with reorg handling, emit a later `type` transition rather
  than mutating a prior event ([reliability.md](reliability.md)).
- **`mintA`/`mintB`** map from `coin/pc`, `0/1`, `a/b`, `x/y`, `base/quote` per the field maps in
  [pool-creation-events.md](pool-creation-events.md) / [launchpad-migrations.md](launchpad-migrations.md).
- Bump `schema` on any breaking change.

## TypeScript

```ts
export interface StreamEvent {
  schema: "solana-stream/v1";
  type: "pool_created" | "migration_pending" | "migrated";
  venue: string;
  program: string;
  instruction: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  commitment: "processed" | "confirmed" | "finalized";
  pool: string;
  mintA: string;
  mintB: string;
  lpMint: string | null;
  vaultA: string | null;
  vaultB: string | null;
  amounts: Record<string, string>;
  migration?: { from: string; to: string };
  raw?: Record<string, unknown>;
}

export type EventSink = (e: StreamEvent) => void | Promise<void>;

// 1) stdout / JSONL — one object per line
export const jsonlSink: EventSink = (e) => void process.stdout.write(JSON.stringify(e) + "\n");

// 2) webhook — idempotent POST with retry/backoff
export function webhookSink(url: string): EventSink {
  return async (e) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": e.signature },
        body: JSON.stringify(e),
      }).catch(() => null);
      if (res?.ok) return;
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
  };
}

// 3) callback — in-process, for an agent loop
export function callbackSink(onEvent: EventSink): EventSink {
  return onEvent;
}

// fan out to many sinks; one slow/failing sink never blocks the others
export function multiSink(...sinks: EventSink[]): EventSink {
  return async (e) => { await Promise.allSettled(sinks.map((s) => s(e))); };
}
```

In the decode handler ([decoding.md](decoding.md)) build the `StreamEvent` from the typed
instruction + accounts and call your sink:

```ts
await emit({
  schema: "solana-stream/v1", type: "pool_created", venue: "raydium-amm-v4",
  program, instruction: "initialize2", signature, slot, blockTime, commitment: "confirmed",
  pool: accts.amm, mintA: accts.ammCoinMint, mintB: accts.ammPcMint,
  lpMint: accts.ammLpMint, vaultA: accts.ammCoinVault, vaultB: accts.ammPcVault,
  amounts: { initA: ix.initCoinAmount.toString(), initB: ix.initPcAmount.toString() },
});
```

## Rust

```rust
use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    pub schema: &'static str,         // "solana-stream/v1"
    pub r#type: String,               // pool_created | migration_pending | migrated
    pub venue: String,
    pub program: String,
    pub instruction: String,
    pub signature: String,
    pub slot: u64,
    pub block_time: Option<i64>,
    pub commitment: String,
    pub pool: String,
    pub mint_a: String,
    pub mint_b: String,
    pub lp_mint: Option<String>,
    pub vault_a: Option<String>,
    pub vault_b: Option<String>,
    pub amounts: std::collections::BTreeMap<String, String>, // stringified integers
    #[serde(skip_serializing_if = "Option::is_none")]
    pub migration: Option<Migration>,
}

#[derive(Serialize, Clone)]
pub struct Migration { pub from: String, pub to: String }

#[async_trait::async_trait]
pub trait EventSink: Send + Sync {
    async fn emit(&self, e: &StreamEvent);
}

pub struct JsonlSink;
#[async_trait::async_trait]
impl EventSink for JsonlSink {
    async fn emit(&self, e: &StreamEvent) {
        println!("{}", serde_json::to_string(e).unwrap());
    }
}

pub struct WebhookSink { pub url: String, pub client: reqwest::Client }
#[async_trait::async_trait]
impl EventSink for WebhookSink {
    async fn emit(&self, e: &StreamEvent) {
        for attempt in 0..5u32 {
            let ok = self.client.post(&self.url)
                .header("idempotency-key", &e.signature)
                .json(e).send().await.map(|r| r.status().is_success()).unwrap_or(false);
            if ok { return; }
            tokio::time::sleep(std::time::Duration::from_millis(100 * 2u64.pow(attempt))).await;
        }
    }
}
```

Call `sink.emit(&event)` from the Carbon processor. A `CallbackSink` wrapping an
`Arc<dyn Fn(&StreamEvent)>` gives an agent loop the same in-process hook.

## Delivery surfaces — pick by consumer

| Surface | Consumer | Notes |
|---|---|---|
| stdout / JSONL | pipes, log shippers, `jq`, file tailing | simplest; compose with anything |
| Webhook | remote services, serverless agents | idempotency-key = signature; retry w/ backoff |
| Callback | in-process agent loop | lowest latency; no serialization hop |

`multiSink`/multiple sinks let you emit JSONL for audit **and** webhook/callback for action
simultaneously. Keep emit decoupled from decode so transport or venue changes never touch consumers —
the whole point of the normalized schema.
