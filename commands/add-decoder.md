---
description: "Generate and VERIFY a Carbon decoder for a program from an IDL or on-chain address"
---

Add a decoder for a program the user names, then verify it. Read [decoding.md](../skill/decoding.md)
and the Rule 6 procedure in [resources.md](../skill/resources.md) first.

## Step 1 — Check for a shipped decoder
Carbon already ships decoders for most major programs (Raydium/Orca/Meteora/Pump.fun/Moonshot/…) —
see [resources.md](../skill/resources.md). If one exists, use it; don't regenerate.

## Step 2 — Generate (from IDL or address)
```sh
# From a local IDL
npx @sevenlabs-hq/carbon-cli parse -i ./idl.json -o ./<name>-decoder -n <name> -s anchor

# From an on-chain program address (fetch IDL via RPC)
npx @sevenlabs-hq/carbon-cli parse -i <ProgramPubkey> -u <rpcUrl> -o ./<name>-decoder -n <name> -s anchor
```
Use `-s codama` for Codama IDLs; `--program-id` if the IDL lacks an address; `--as-crate` for a crate
layout. For **native** programs (no Anchor IDL, e.g. Raydium AMM v4) use Carbon's native decoder or
hand-write the `u8` tag match — do not force an 8-byte discriminator.

## Step 3 — VERIFY (mandatory)
1. Classify Anchor vs native. For Anchor, re-derive: `sha256("global:<ix>")[..8]` must equal the
   generated discriminator.
2. Cross-check the program ID against a real recent transaction on Solscan / Solana Explorer.
3. Record the row: `program, programId, Anchor|Native, ix, discriminator/tag, fields // source: <url> (checked YYYY-MM-DD)`.
4. Add it to [resources.md](../skill/resources.md). If anything can't be confirmed, mark
   `TODO: VERIFY` — never guess.

## Step 4 — Test
Add a fixture decode test asserting the decoder produces the expected fields offline (no API key).
