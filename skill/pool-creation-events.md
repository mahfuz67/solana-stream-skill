# Pool creation events ★ — verified detection across DEXs

This is the differentiator. To detect a **new liquidity pool** the instant it's created, you filter
the `transactions` stream by the DEX program ID ([subscriptions-and-filters.md](subscriptions-and-filters.md))
and match the **pool-init instruction discriminator/tag**, then extract the mints/pool/vaults from
the instruction's accounts ([decoding.md](decoding.md)).

Every row below is verified two independent ways: (1) the value in Carbon's maintained decoder
source, and (2) an independent re-derivation of the Anchor discriminator via
`sha256("global:<ix_name>")[..8]`. Native programs use a `u8` tag instead — called out per row.

## ⚠️ A discriminator alone does not identify an instruction

`sha256("global:initialize_pool")[..8] = [95,180,10,172,84,174,232,40]` — so **Orca Whirlpools**
`initialize_pool` and **Meteora DAMM v2** `initialize_pool` carry the **identical** 8 bytes. The
discriminator only disambiguates *within* a program. **Always match `program_id` AND discriminator
together.** This is exactly the class of bug this skill exists to prevent.

## Verified table

| DEX | Program ID | Type | Pool-init ix | Discriminator / tag |
|---|---|---|---|---|
| Raydium AMM v4 | `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` | **Native** | `initialize2` | `u8` tag `1` (`0x01`) |
| Raydium CLMM | `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` | Anchor | `create_pool` | `0xe992d18ecf6840bc` `[233,146,209,142,207,104,64,188]` |
| Raydium CPMM | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` | Anchor | `initialize` | `0xafaf6d1f0d989bed` `[175,175,109,31,13,152,155,237]` |
| Orca Whirlpools | `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` | Anchor | `initialize_pool` (+ `initialize_pool_v2` for Token-2022) | `0x5fb40aac54aee828` `[95,180,10,172,84,174,232,40]` |
| Meteora DLMM | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` | Anchor | `initialize_lb_pair` (+ `initialize_lb_pair2`, `initialize_customizable_permissionless_lb_pair`) | `0x2d9aedd2dd0fa65c` `[45,154,237,210,221,15,166,92]` |
| Meteora DAMM v2 (cp-amm) | `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` | Anchor | `initialize_pool` (+ `initialize_customizable_pool`) | `0x5fb40aac54aee828` `[95,180,10,172,84,174,232,40]` |

Sources (all checked 2026-06-21), program ID in `…/src/lib.rs`, discriminator in
`…/src/instructions/<ix>.rs`:
- Raydium AMM v4 — https://github.com/sevenlabs-hq/carbon/blob/main/decoders/raydium-amm-v4-decoder/src/instructions/initialize2.rs (native tag `data[0..1] == [1]`)
- Raydium CLMM — https://github.com/sevenlabs-hq/carbon/blob/main/decoders/raydium-clmm-decoder/src/instructions/create_pool.rs
- Raydium CPMM — https://github.com/sevenlabs-hq/carbon/blob/main/decoders/raydium-cpmm-decoder/src/instructions/initialize.rs
- Orca Whirlpools — https://github.com/sevenlabs-hq/carbon/blob/main/decoders/orca-whirlpool-decoder/src/instructions/initialize_pool.rs
- Meteora DLMM — https://github.com/sevenlabs-hq/carbon/blob/main/decoders/meteora-dlmm-decoder/src/instructions/initialize_lb_pair.rs
- Meteora DAMM v2 — https://github.com/sevenlabs-hq/carbon/blob/main/decoders/meteora-damm-v2-decoder/src/instructions/initialize_pool.rs

> Anchor caveat: the discriminator hashes the **snake_case** ix name. DLMM's IDL exposes
> `initializeLbPair`, but the discriminator is `sha256("global:initialize_lb_pair")` — match Carbon.

## Fields to extract (per program)

Account ordering is the decoder's account-struct order; with Carbon you get these as named fields,
with raw decoding you index by position.

**Raydium AMM v4 — `initialize2`** (native). Args: `nonce: u8`, `open_time: u64`,
`init_pc_amount: u64`, `init_coin_amount: u64`. Key accounts: `amm` (pool), `amm_lp_mint` (LP),
`amm_coin_mint` (mint A), `amm_pc_mint` (mint B), `amm_coin_vault`, `amm_pc_vault`, `market`.

**Raydium CLMM — `create_pool`**. Args: `sqrt_price_x64: u128`, `open_time: u64`. Accounts:
`pool_creator`, `amm_config`, `pool_state` (pool), `token_mint0` (A), `token_mint1` (B),
`token_vault0`, `token_vault1`, `observation_state`. (Concentrated liquidity — no LP mint.)

**Raydium CPMM — `initialize`**. Args: `init_amount0: u64`, `init_amount1: u64`, `open_time: u64`.
Accounts: `creator`, `amm_config`, `pool_state` (pool), `token0_mint` (A), `token1_mint` (B),
`lp_mint` (LP), `token0_vault`, `token1_vault`, `create_pool_fee`, `observation_state`.

**Orca Whirlpools — `initialize_pool`**. Args: `bumps`, `tick_spacing: u16`,
`initial_sqrt_price: u128`. Accounts: `whirlpools_config`, `token_mint_a` (A), `token_mint_b` (B),
`funder`, `whirlpool` (pool), `token_vault_a`, `token_vault_b`, `fee_tier`. (Concentrated — no LP
mint; use `initialize_pool_v2` for Token-2022 mints.)

**Meteora DLMM — `initialize_lb_pair`**. Args: `active_id: i32`, `bin_step: u16`. Accounts:
`lb_pair` (pool), `token_mint_x` (A), `token_mint_y` (B), `reserve_x`, `reserve_y`, `oracle`,
`preset_parameter`, `funder`. (Bin-based — no LP mint; LP is per-position.)

**Meteora DAMM v2 — `initialize_pool`**. Args: `params: InitializePoolParameters`. Accounts:
`creator`, `pool`, `token_a_mint` (A), `token_b_mint` (B), `token_a_vault`, `token_b_vault`,
`config`, `position`. (LP is represented as a position NFT, not an LP mint.)

## Worked example — cross-DEX new-pool detection

### Rust (Carbon) — typed, recommended

Generate or import each decoder, register it, and match the init variant in the processor.

```rust
use carbon_core::{error::CarbonResult, instruction::InstructionProcessorInputType, processor::Processor};
use carbon_raydium_amm_v4_decoder::{instructions::RaydiumAmmV4Instruction, RaydiumAmmV4Decoder};
use carbon_orca_whirlpool_decoder::{instructions::OrcaWhirlpoolInstruction, OrcaWhirlpoolDecoder};

struct PoolWatcher;

impl Processor<InstructionProcessorInputType<'_, RaydiumAmmV4Instruction>> for PoolWatcher {
    async fn process(&mut self, input: &InstructionProcessorInputType<'_, RaydiumAmmV4Instruction>) -> CarbonResult<()> {
        if let RaydiumAmmV4Instruction::Initialize2(ix) = &input.decoded_instruction.data {
            let accts = &input.decoded_instruction.accounts; // typed account struct
            // emit { dex: "raydium-amm-v4", pool: accts.amm, mint_a: accts.amm_coin_mint, mint_b: accts.amm_pc_mint, ... }
            let _ = (ix.open_time, ix.init_coin_amount, ix.init_pc_amount);
        }
        Ok(())
    }
}

impl Processor<InstructionProcessorInputType<'_, OrcaWhirlpoolInstruction>> for PoolWatcher {
    async fn process(&mut self, input: &InstructionProcessorInputType<'_, OrcaWhirlpoolInstruction>) -> CarbonResult<()> {
        if let OrcaWhirlpoolInstruction::InitializePool(_ix) = &input.decoded_instruction.data {
            // emit { dex: "orca-whirlpool", pool: whirlpool, mint_a: token_mint_a, mint_b: token_mint_b, ... }
        }
        Ok(())
    }
}
```

Register both decoders on one pipeline (`.instruction(RaydiumAmmV4Decoder, PoolWatcher)`,
`.instruction(OrcaWhirlpoolDecoder, PoolWatcher)`) over a yellowstone-grpc datasource whose filter
`accountInclude`s every DEX program ID. Carbon handles Anchor-vs-native per decoder.

### TypeScript (yellowstone-grpc + manual match) — the no-Rust path

```ts
// Filter: transactions.accountInclude = [all DEX program IDs], vote:false, failed:false
const POOL_INIT = {
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": { dex: "raydium-amm-v4", native: true,  tag: 0x01 },
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": { dex: "raydium-clmm",   disc: "e992d18ecf6840bc" },
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C": { dex: "raydium-cpmm",   disc: "afaf6d1f0d989bed" },
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc":  { dex: "orca-whirlpool", disc: "5fb40aac54aee828" },
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo":  { dex: "meteora-dlmm",   disc: "2d9aedd2dd0fa65c" },
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG":  { dex: "meteora-damm-v2", disc: "5fb40aac54aee828" },
} as const;

function classify(programId: string, ixData: Buffer) {
  const spec = POOL_INIT[programId];
  if (!spec) return null;
  if ("native" in spec && spec.native) {
    return ixData.readUInt8(0) === spec.tag ? spec.dex : null;        // native u8 tag
  }
  return ixData.subarray(0, 8).toString("hex") === spec.disc ? spec.dex : null;  // Anchor 8-byte
}
```

For each matched instruction, resolve the mint A/B, pool, LP, and vault accounts by the positions in
the field map above (or borsh-decode with the program IDL via the Anchor coder — see
[decoding.md](decoding.md)), then normalize and emit via [agent-emit.md](agent-emit.md).

## Notes

- `initialize2` (tag `1`) is the pool-creation path used in practice for Raydium AMM v4;
  `initialize` (tag `0`) and `pre_initialize` exist but are not the standard create flow.
- CLMM/Whirlpools/DLMM are concentrated/bin liquidity — there is **no LP mint**; liquidity is held
  per-position. DAMM v2 represents the position as an NFT. Only AMM v4 and CPMM expose an `lp_mint`.
- Customizable/permissionless variants (`create_customizable_pool`, `initialize_customizable_*`)
  create pools too; add their discriminators if you need full coverage — verify each the same way.
