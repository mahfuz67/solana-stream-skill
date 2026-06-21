# Launchpad migrations ★ — verified graduation/migration detection

A launchpad token lives on a **bonding curve** until it "graduates": liquidity migrates to a real
AMM pool. Catching that transition early is the highest-signal launchpad event. This file gives the
verified program IDs + create/migration instructions, and — critically — how to tell **"about to
migrate"** from **"migrated"**.

Same rigor as [pool-creation-events.md](pool-creation-events.md): every value is from Carbon's
maintained decoder source AND re-derived via `sha256("global:<ix>")[..8]` (accounts via
`sha256("account:<Name>")[..8]`). All Anchor programs.

## Verified table

| Launchpad | Program ID | Create ix (disc) | Migration ix (disc) |
|---|---|---|---|
| **Pump.fun** | `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` | `create` `0x181ec828051c0777` | `migrate` `0x9beae792ec9ea21e` (→ PumpSwap) |
| **PumpSwap** (migration target) | `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` | `create_pool` `0xe992d18ecf6840bc` | — |
| **Raydium LaunchLab** (LetsBonk) | `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` | `initialize` `0xafaf6d1f0d989bed` | `migrate_to_amm` `0xcf52c091fecf91df`; `migrate_to_cpswap` `0x885cc8671cda908c` |
| **Meteora DBC** (Believe & others) | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` | `initialize_virtual_pool_with_spl_token` `0x8c55d7b06636684f` | `migration_damm_v2` `0x9ca9e66735e45040` (→ DAMM v2) |
| **Moonshot** | `MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG` | `token_mint` `0x032ca4b87b0df5b3` | `migrate_funds` `0x2ae50ae7bd3ec1ae` |

Sources (program ID in `…/src/lib.rs`, discriminator in `…/src/instructions/<ix>.rs`,
all checked 2026-06-21):
- Pump.fun — https://github.com/sevenlabs-hq/carbon/tree/main/decoders/pumpfun-decoder/src
- PumpSwap — https://github.com/sevenlabs-hq/carbon/tree/main/decoders/pump-swap-decoder/src
- Raydium LaunchLab — https://github.com/sevenlabs-hq/carbon/tree/main/decoders/raydium-launchpad-decoder/src
- Meteora DBC — https://github.com/sevenlabs-hq/carbon/tree/main/decoders/meteora-dbc-decoder/src
- Moonshot — https://github.com/sevenlabs-hq/carbon/tree/main/decoders/moonshot-decoder/src

**More discriminator collisions (match program ID too):** PumpSwap `create_pool` shares
`0xe992d18ecf6840bc` with Raydium CLMM `create_pool`; LaunchLab `initialize` shares
`0xafaf6d1f0d989bed` with Raydium CPMM `initialize`. The 8 bytes only mean "an ix named X" —
[pool-creation-events.md](pool-creation-events.md) explains why.

## "About to migrate" vs "migrated"

| Launchpad | About to migrate (pre-) | Migrated (the event) |
|---|---|---|
| Pump.fun | `BondingCurve` account flips `complete = true` (bonding curve filled) | `migrate` instruction observed → PumpSwap pool created |
| Raydium LaunchLab | `pool_state` curve nears its threshold (monitor the account) | `migrate_to_amm` / `migrate_to_cpswap` instruction |
| Meteora DBC | virtual pool reserves near migration threshold (monitor the account) | `migration_damm_v2` instruction |
| Moonshot | curve near threshold (monitor `curve_account`) | `migrate_funds` instruction |

The cleanest **early** signal is Pump.fun's `BondingCurve.complete` flag — you learn a token has
filled its curve *before* the migrate transaction lands.

### Pump.fun `BondingCurve` account (verified)

Account discriminator `0x17b7f83760d8ac60` = `sha256("account:BondingCurve")[..8]`. Layout:

```
virtual_token_reserves: u64
virtual_quote_reserves: u64
real_token_reserves:    u64
real_quote_reserves:    u64
token_total_supply:     u64
complete:               bool   // false while trading; true once the curve fills → graduation
creator:                Pubkey
...
quote_mint:             Pubkey
```

Source: https://github.com/sevenlabs-hq/carbon/blob/main/decoders/pumpfun-decoder/src/accounts/bonding_curve.rs (checked 2026-06-21).

## Key migration instruction fields

- **Pump.fun `migrate`** (no args). Accounts include `mint`, `bonding_curve`, `pump_amm`
  (PumpSwap program), `pool` (the new PumpSwap pool), `pool_authority`. Seeing this = the token
  has graduated; the `pool` account is the tradable PumpSwap market.
- **PumpSwap `create_pool`**. Args: `index: u16`, `base_amount_in: u64`, `quote_amount_in: u64`,
  `coin_creator`. Accounts: `pool`, `base_mint`, `quote_mint`, `lp_mint`. The migrated pool, also
  created directly for non-graduated pairs.
- **LaunchLab `migrate_to_amm`**. Args: `base_lot_size`, `quote_lot_size`,
  `market_vault_signer_nonce`. Accounts: `base_mint`, `quote_mint`, `market`, AMM/OpenBook accounts
  → migrates to Raydium AMM v4. `migrate_to_cpswap` (no args) migrates to Raydium CPMM (accounts:
  `cpswap_pool`, `cpswap_lp_mint`, …).
- **Meteora DBC `migration_damm_v2`** (no args). Accounts: `virtual_pool`, `pool` (the new DAMM v2
  pool), `base_mint`, position NFT accounts → migrates to Meteora DAMM v2.
- **Moonshot `migrate_funds`** (no args). Accounts: `curve_account`, `mint`, `dex_fee_account`,
  `migration_authority`.

## Platform attribution caveat

LaunchLab is a shared program: **LetsBonk** and other platforms all launch through
`LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`, distinguished by the `platform_config` account on
`initialize`. Likewise **Meteora DBC** underpins **Believe** and other launchpads, distinguished by
`config`. The *programs* above are verified; mapping a migration to a specific *platform brand*
requires matching the platform/config pubkey.

> `TODO: VERIFY` — exact `platform_config` (LaunchLab→LetsBonk) and `config` (DBC→Believe) pubkeys
> for brand-level filtering are not yet confirmed against a live source. Do not hard-code a brand
> mapping until verified per the procedure in [resources.md](resources.md).

## Worked example — graduation watcher

Two complementary subscriptions:

1. **Early signal (accounts stream).** Subscribe to Pump.fun-owned `BondingCurve` accounts
   (`owner = 6EF8…F6P`, `datasize` + discriminator `memcmp` for `BondingCurve`); emit
   `migration_pending` when a decoded account shows `complete == true`.
2. **Migration event (transactions stream).** `accountInclude` every launchpad program ID;
   on each tx, match the migration discriminators above (with program ID) and emit `migrated` with
   the new pool + mints.

```ts
const MIGRATION = {
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": { lp: "pumpfun",  disc: "9beae792ec9ea21e", to: "pumpswap" },
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj": { lp: "launchlab", disc: ["cf52c091fecf91df","885cc8671cda908c"], to: "raydium" },
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN": { lp: "meteora-dbc", disc: "9ca9e66735e45040", to: "damm-v2" },
  "MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG": { lp: "moonshot", disc: "2ae50ae7bd3ec1ae", to: "moonshot-dex" },
} as const;

function isMigration(programId: string, ixData: Buffer): string | null {
  const spec = MIGRATION[programId];
  if (!spec) return null;
  const d = ixData.subarray(0, 8).toString("hex");
  const discs = Array.isArray(spec.disc) ? spec.disc : [spec.disc];
  return discs.includes(d) ? spec.lp : null;
}
```

In Rust, register `carbon_pumpfun_decoder`, `carbon_raydium_launchpad_decoder`,
`carbon_meteora_dbc_decoder`, and `carbon_moonshot_decoder` on the pipeline and match the migration
variant in the processor (same pattern as [pool-creation-events.md](pool-creation-events.md)). Then
normalize and emit via [agent-emit.md](agent-emit.md).
