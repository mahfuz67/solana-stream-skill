# Resources — master verified reference

The single source of truth for verified program IDs/discriminators, the verification procedure that
produced them, and provider/SDK/decoder/datasource links. Detail and worked examples live in
[pool-creation-events.md](pool-creation-events.md) and [launchpad-migrations.md](launchpad-migrations.md).

## Master verified program-ID table

All Anchor unless marked Native. Discriminators are `sha256("global:<ix>")[..8]`; account
discriminators are `sha256("account:<Name>")[..8]`. Every row verified two ways — Carbon's
maintained decoder source AND independent sha256 re-derivation — checked **2026-06-21**. Source =
`https://github.com/sevenlabs-hq/carbon/tree/main/decoders/<decoder>/src`.

### DEX pools

| Protocol | Program ID | Type | Pool-init ix | Discriminator / tag |
|---|---|---|---|---|
| Raydium AMM v4 | `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` | Native | `initialize2` | u8 tag `1` (`0x01`) |
| Raydium CLMM | `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` | Anchor | `create_pool` | `0xe992d18ecf6840bc` |
| Raydium CPMM | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` | Anchor | `initialize` | `0xafaf6d1f0d989bed` |
| Orca Whirlpools | `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` | Anchor | `initialize_pool` | `0x5fb40aac54aee828` |
| Meteora DLMM | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` | Anchor | `initialize_lb_pair` | `0x2d9aedd2dd0fa65c` |
| Meteora DAMM v2 | `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` | Anchor | `initialize_pool` | `0x5fb40aac54aee828` |

### Launchpads & migrations

| Launchpad | Program ID | Create ix | Migration ix |
|---|---|---|---|
| Pump.fun | `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` | `create` `0x181ec828051c0777` | `migrate` `0x9beae792ec9ea21e` |
| PumpSwap | `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` | `create_pool` `0xe992d18ecf6840bc` | — |
| Raydium LaunchLab (LetsBonk) | `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` | `initialize` `0xafaf6d1f0d989bed` | `migrate_to_amm` `0xcf52c091fecf91df`; `migrate_to_cpswap` `0x885cc8671cda908c` |
| Meteora DBC (Believe) | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` | `initialize_virtual_pool_with_spl_token` `0x8c55d7b06636684f` | `migration_damm_v2` `0x9ca9e66735e45040` |
| Moonshot | `MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG` | `token_mint` `0x032ca4b87b0df5b3` | `migrate_funds` `0x2ae50ae7bd3ec1ae` |

Useful account discriminator: Pump.fun `BondingCurve` = `0x17b7f83760d8ac60` (field `complete: bool`
= graduation signal).

### Discriminator collisions (always match program ID too)

| Discriminator | Shared by |
|---|---|
| `0x5fb40aac54aee828` (`initialize_pool`) | Orca Whirlpools · Meteora DAMM v2 |
| `0xe992d18ecf6840bc` (`create_pool`) | Raydium CLMM · PumpSwap |
| `0xafaf6d1f0d989bed` (`initialize`) | Raydium CPMM · Raydium LaunchLab |

### Open verification items

- `TODO: VERIFY` — brand-level `platform_config` (LaunchLab → LetsBonk) and `config` (DBC → Believe)
  pubkeys for filtering by platform brand. Programs are verified; brand→config mapping is not.

## The verification procedure (Rule 6 — do this for every new ID)

1. **Get the IDL** — `carbon-cli parse -i <programId> -u <rpc>`, `anchor idl fetch <programId>`, the
   program's official repo/docs, or an explorer's IDL/anchor view.
2. **Classify Anchor vs Native.** Anchor ix = `sha256("global:<ix_name>")[..8]` (snake_case name);
   Anchor account = `sha256("account:<Name>")[..8]`. Native (e.g. Raydium AMM v4) = a `u8`/enum tag,
   never 8 bytes.
3. **Cross-check the program ID** against a real recent transaction on Solscan / Solana Explorer.
4. **Record** — `program, programId, Anchor|Native, ix, discriminator/tag, fields // source: <url> (checked YYYY-MM-DD)`.
5. **Can't verify? Mark `TODO: VERIFY`. Never guess a value.**

Re-derive any Anchor discriminator to confirm:

```python
import hashlib
hashlib.sha256(b"global:initialize_pool").digest()[:8].hex()   # 5fb40aac54aee828
```

## Transports & providers

| Transport | What | Notes |
|---|---|---|
| Yellowstone gRPC ("Dragon's Mouth") | default high-throughput stream | ~sub-100ms; Triton / Helius LaserStream / QuickNode |
| Helius LaserStream | Yellowstone-compatible | ~24h replay, multi-region failover |
| Jito ShredStream | shred-level, pre-confirmation | earliest data, unconfirmed — see [shredstream-and-latency.md](shredstream-and-latency.md) |
| WebSocket | `logs/account/programSubscribe` | ~200–400ms, lossy — see [websockets-fallback.md](websockets-fallback.md) |

- Triton Yellowstone — https://docs.triton.one/project-yellowstone/introduction
- Helius LaserStream — https://www.helius.dev/ (LaserStream docs)
- QuickNode Yellowstone gRPC — https://www.quicknode.com/ (Yellowstone add-on)
- Jito ShredStream — https://docs.jito.wtf/

## Clients & SDKs

| | Package | Source |
|---|---|---|
| TS client | `@triton-one/yellowstone-grpc` | https://github.com/rpcpool/yellowstone-grpc/tree/master/yellowstone-grpc-client-nodejs |
| Rust client | `yellowstone-grpc-client` + `yellowstone-grpc-proto` | https://github.com/rpcpool/yellowstone-grpc |
| Proto (geyser) | `geyser.proto` | https://github.com/rpcpool/yellowstone-grpc/blob/master/yellowstone-grpc-proto/proto/geyser.proto |
| Decode framework | Carbon (`sevenlabs-hq/carbon`, v0.9.x) | https://github.com/sevenlabs-hq/carbon |
| Decoder generator | `@sevenlabs-hq/carbon-cli` | https://www.npmjs.com/package/@sevenlabs-hq/carbon-cli |
| Decode alt | Yellowstone-Vixen | https://github.com/rpcpool/yellowstone-vixen |
| Anchor coder (TS) | `@coral-xyz/anchor` | https://github.com/coral-xyz/anchor |

## Carbon shipped decoders (mine these for verified IDs)

DEX/launchpad-relevant: `raydium-amm-v4`, `raydium-clmm`, `raydium-cpmm`, `raydium-launchpad`,
`raydium-stable-swap`, `raydium-liquidity-locking`, `orca-whirlpool`, `meteora-dlmm`,
`meteora-damm-v2`, `meteora-dbc`, `meteora-pools`, `meteora-vault`, `pumpfun`, `pump-swap`,
`pump-fees`, `moonshot`, `boop`, `bonkswap`, `virtuals`, `heaven`, `fluxbeam`, `lifinity-amm-v2`,
`phoenix-v1`, `openbook-v2`, `jupiter-swap`. Full list:
https://github.com/sevenlabs-hq/carbon/tree/main/decoders

## Carbon datasources (pick by latency/backfill)

`yellowstone-grpc-datasource`, `helius-laserstream-datasource`, `jito-shredstream-grpc-datasource`,
`rpc-block-subscribe-datasource`, `rpc-program-subscribe-datasource`, `rpc-transaction-crawler-datasource`,
`rpc-block-crawler-datasource`, `rpc-gpa-datasource`, `validator-snapshot-datasource`,
`stream-message-datasource` (replay recorded messages — used by the offline fixture tests). Full list:
https://github.com/sevenlabs-hq/carbon/tree/main/datasources

## Delegated to solana-dev-skill

IDL fetch/codegen, Anchor internals, testing (LiteSVM/Mollusk/Surfpool), and security review live in
the core skill — see the delegate table in [SKILL.md](SKILL.md).
