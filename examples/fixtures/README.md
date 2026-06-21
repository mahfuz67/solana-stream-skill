# Recorded fixtures (offline, key-free decode tests)

Each JSON file is a single decode case: the program ID, the raw instruction data
(`ixDataHex`) or account data (`accountDataHex`), the ordered `accounts`, stream context
(slot/signature/blockTime), and the `expected` normalized `solana-stream/v1` event.

The byte layouts are built to the **verified** on-chain structure — each `ixDataHex` is
`discriminator || borsh(args)` using the discriminators verified in
`skill/resources.md` (re-derivable via `sha256("global:<ix>")[..8]`), and account ordering
matches Carbon's decoder account structs. This lets decode tests run with **no API key**.

To use a real mainnet capture instead, record a Yellowstone `SubscribeUpdate` and replace
`ixDataHex` + `accounts` with the captured instruction; the `expected` block is unchanged.

Consumed by `examples/ts-yellowstone/test/decode.test.ts` and the Rust example tests.
