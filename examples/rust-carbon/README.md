# rust-carbon — cross-DEX pool + migration watcher (Rust)

The decode/normalize layer plus a Carbon-based live watcher. The offline decode tests use only
`serde`/`hex` and run with **no API key**; the live watcher is gated behind `--features live`.

```bash
cargo test                         # offline decode tests against ../fixtures (no secrets)
cargo test --no-run                # compile-check only
cargo run --features live --bin watch   # live; needs GRPC_ENDPOINT — see ../../.env.example
```

- `src/registry.rs` — verified program IDs + discriminators/tags + account index maps.
- `src/decode.rs` — `decode_instruction` / `decode_bonding_curve` → `StreamEvent`.
- `src/schema.rs` — the `solana-stream/v1` event (serde, camelCase).
- `src/bin/watch.rs` — Carbon pipeline sketch (enable the Carbon deps in `Cargo.toml`).
- `tests/decode.rs` — asserts each fixture decodes to its expected event.

The production watcher uses Carbon's shipped decoders (`carbon-raydium-amm-v4-decoder`,
`carbon-orca-whirlpool-decoder`, `carbon-pumpfun-decoder`, …) over
`carbon-yellowstone-grpc-datasource` — see `skill/decoding.md`. Carbon is currently **v1.0**.
