# Decoding — turn raw stream bytes into typed events

A stream gives you raw instructions and account bytes. Decoding maps those bytes to the program's
instruction/account types so you can read the fields (mints, pool, vaults, amounts). The hard part is
not the framework — it's knowing the **program ID + discriminator/tag** to match, which you verify
and record in [pool-creation-events.md](pool-creation-events.md), [launchpad-migrations.md](launchpad-migrations.md),
and [resources.md](resources.md).

## Anchor vs native — the one distinction that matters

Every instruction is identified by leading bytes. How many, and how they're computed, depends on the
program type:

| | Instruction id | Account id | Example |
|---|---|---|---|
| **Anchor** | first 8 bytes of `sha256("global:<ix_name>")` | first 8 bytes of `sha256("account:<AccountName>")` | Pump.fun, Orca Whirlpools, Raydium CLMM/CPMM |
| **Native** | a `u8`/enum **tag** (often byte 0), program-defined — NOT 8 bytes | program-defined layout, no Anchor discriminator | **Raydium AMM v4** |

You must decode each accordingly. Computing the Anchor discriminator yourself:

```python
import hashlib
hashlib.sha256(b"global:initialize2").digest()[:8].hex()   # instruction
hashlib.sha256(b"account:Whirlpool").digest()[:8].hex()    # account
```

```rust
use sha2::{Digest, Sha256};
let disc = &Sha256::digest(b"global:initialize2")[..8];
```

For a native program you read its source/IDL to learn the tag value and field layout — never assume
8 bytes. Per-program tags/discriminators (with sources) live in the verified tables; this file is the
*mechanism*.

## Carbon pipeline (Rust) — the recommended path

Carbon (`sevenlabs-hq/carbon`, source checked 2026-06-21) is a Rust framework: **datasource →
decoder → processor**. Datasources stream updates, decoders produce typed Rust values, processors
run your logic. Carbon ships maintained decoders (Raydium, Orca, Meteora, Pump.fun, …) and
datasources (yellowstone-grpc, helius-laserstream, jito-shredstream, rpc-*) — see
[resources.md](resources.md).

```rust
use carbon_core::pipeline::Pipeline;
use carbon_log_metrics::LogMetrics;
use carbon_my_program_decoder::{MyProgramDecoder, PROGRAM_ID};
use carbon_rpc_block_subscribe_datasource::{Filters, RpcBlockSubscribe};
use solana_client::rpc_config::RpcBlockSubscribeFilter;

#[tokio::main]
async fn main() -> carbon_core::error::CarbonResult<()> {
    let datasource = RpcBlockSubscribe::new(
        std::env::var("WS_URL").unwrap(),
        Filters::new(
            RpcBlockSubscribeFilter::MentionsAccountOrProgram(PROGRAM_ID.to_string()),
            None,
        ),
    );

    Pipeline::builder()
        .datasource(datasource)
        .metrics(std::sync::Arc::new(LogMetrics::new()))
        .instruction(MyProgramDecoder, MyProcessor)
        .build()?
        .run()
        .await
}
```

The processor receives **typed** instruction data — no manual byte parsing:

```rust
use carbon_core::{error::CarbonResult, instruction::InstructionProcessorInputType, processor::Processor};
use carbon_my_program_decoder::instructions::MyProgramInstruction;

struct MyProcessor;

impl Processor<InstructionProcessorInputType<'_, MyProgramInstruction>> for MyProcessor {
    async fn process(&mut self, input: &InstructionProcessorInputType<'_, MyProgramInstruction>) -> CarbonResult<()> {
        // input.decoded_instruction is the typed enum variant; match it and emit (see agent-emit.md)
        Ok(())
    }
}
```

Swap `RpcBlockSubscribe` for the yellowstone-grpc / helius-laserstream / jito-shredstream datasource
to change transport without touching the decoder or processor. Carbon also decodes nested CPIs and
Anchor events.

## carbon-cli — generate a verified decoder from an IDL or address

`carbon-cli` (npm `@sevenlabs-hq/carbon-cli`) generates a Carbon decoder. It accepts either an IDL
file **or a program address** (fetched via RPC), so you can produce a decoder for any program even
without a local IDL. Source: `packages/cli/src/cli.ts` (checked 2026-06-21).

```sh
# From a local Anchor IDL
npx @sevenlabs-hq/carbon-cli parse -i ./idl.json -o ./my-decoder -n my-program -s anchor

# From an on-chain program address (fetch IDL via RPC)
npx @sevenlabs-hq/carbon-cli parse -i <ProgramPubkey> -u devnet -o ./generated -n my-program -s anchor

# Codama IDL, hinting CPI-event types
npx @sevenlabs-hq/carbon-cli parse -i ./codama.json -o ./generated -s codama --event-hints "CreatePoolEvent"

# Scaffold a whole runnable pipeline wired to a datasource
npx @sevenlabs-hq/carbon-cli scaffold -n my-indexer -o . --idl ./idl.json --idl-standard anchor -s yellowstone-grpc
```

Key `parse` flags: `-i <fileOrAddress>`, `-o <out-dir>`, `-n <name>`, `-s <anchor|codama>`,
`-u <rpcUrl>` (when `-i` is an address), `--program-id` (if the IDL lacks an address), `--as-crate`.
`scaffold` datasources include `yellowstone-grpc`, `helius-laserstream`, `rpc-block-subscribe`,
`rpc-program-subscribe`, `rpc-transaction-crawler`.

> **Verify after generating.** carbon-cli derives discriminators from the IDL — confirm the program
> ID and a sample discriminator against a real explorer transaction before trusting it
> (see the procedure in [resources.md](resources.md)). For **native** programs (Raydium AMM v4) an
> IDL may not exist; use Carbon's maintained native decoder or hand-write the tag match.

## Yellowstone-Vixen — alternative (Rust)

Vixen is a parser/handler framework in the same space: implement a `Parser` for a program and a
`Handler` for the parsed output, fed by a Yellowstone source. Reach for it if you're standardizing on
its parser/handler model or its prometheus/runtime ergonomics; otherwise Carbon's shipped decoders
get you to verified DEX/launchpad events faster.

## Raw borsh / IDL — the no-framework path (Rust + TS)

When you want zero framework, match the discriminator/tag yourself and borsh-deserialize the rest.
This is the **only** in-stream decode path for **TypeScript** (Carbon and Vixen are Rust).

TypeScript with the Anchor coder:

```ts
import { BorshInstructionCoder, BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import idl from "./my_program.json" assert { type: "json" };

const ixCoder = new BorshInstructionCoder(idl as Idl);
const decoded = ixCoder.decode(ixDataBuffer, "base58"); // { name, data } or null
```

TypeScript, native program (manual tag + borsh):

```ts
const tag = data.readUInt8(0);              // native u8 instruction tag
if (tag === RAYDIUM_AMM_V4_INITIALIZE2_TAG) {
  // borsh-decode the remaining layout per the verified field map
}
```

Rust, manual:

```rust
let (disc, rest) = data.split_at(8);                 // Anchor: 8-byte discriminator
if disc == EXPECTED_DISCRIMINATOR {
    let ix = MyIx::try_from_slice(rest)?;            // borsh
}
// Native: let tag = data[0]; match tag { ... }
```

## Pick one

| Situation | Use |
|---|---|
| Rust indexer/watcher, want maintained DEX/launchpad decoders fast | **Carbon** (shipped decoder) |
| Rust, program has no shipped decoder but has an IDL/address | **carbon-cli** → generate, then Carbon |
| Rust, standardizing on parser/handler model or its runtime | **Yellowstone-Vixen** |
| **TypeScript** consumer, or a one-off/native program, no framework | **Raw borsh** (+ Anchor coder if IDL exists) |
| Native program (e.g. Raydium AMM v4) | Carbon native decoder, or raw **u8 tag** match — never an 8-byte discriminator |

Whatever you pick, the program ID and discriminator/tag come from the **verified tables**, not from
memory.
