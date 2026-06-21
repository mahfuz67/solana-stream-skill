// Live cross-DEX pool + migration watcher built on Carbon.
// Gated behind `--features live`; enable the Carbon deps in Cargo.toml first.
// Build/run: cargo run --features live --bin watch
//
// Pipeline: yellowstone-grpc datasource -> shipped Carbon decoders -> a processor that
// normalizes each decoded instruction into the solana-stream/v1 schema (see ../decode.rs and
// ../schema.rs) and prints JSONL. The offline tests in tests/decode.rs exercise the same
// normalization without a network or API key.
//
// Sketch (uncomment after adding the Carbon deps from Cargo.toml):
//
// use carbon_core::pipeline::Pipeline;
// use carbon_raydium_amm_v4_decoder::RaydiumAmmV4Decoder;
// use carbon_orca_whirlpool_decoder::OrcaWhirlpoolDecoder;
// use carbon_pumpfun_decoder::PumpfunDecoder;
// use carbon_yellowstone_grpc_datasource::YellowstoneGrpcGeyserClient;
//
// #[tokio::main]
// async fn main() -> carbon_core::error::CarbonResult<()> {
//     let datasource = YellowstoneGrpcGeyserClient::new(
//         std::env::var("GRPC_ENDPOINT").expect("set GRPC_ENDPOINT"),
//         std::env::var("GRPC_X_TOKEN").ok(),
//         /* commitment, transaction filter on the verified program IDs, ... */
//         Default::default(),
//     );
//     Pipeline::builder()
//         .datasource(datasource)
//         .instruction(RaydiumAmmV4Decoder, PoolWatcher)
//         .instruction(OrcaWhirlpoolDecoder, PoolWatcher)
//         .instruction(PumpfunDecoder, PoolWatcher)
//         .build()?
//         .run()
//         .await
// }

fn main() {
    eprintln!(
        "Enable the `live` feature and the Carbon deps in Cargo.toml, then implement the \
         pipeline sketch in this file. The offline decode logic is in src/decode.rs and is \
         tested by `cargo test`."
    );
}
