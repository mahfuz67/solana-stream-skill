use serde_json::Value;
use solana_stream_rust_carbon::decode::{decode_bonding_curve, decode_instruction};
use solana_stream_rust_carbon::schema::{DecodeContext, StreamEvent};
use std::fs;
use std::path::PathBuf;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("fixtures")
}

fn ctx(f: &Value) -> DecodeContext {
    DecodeContext {
        signature: f["signature"].as_str().unwrap().to_string(),
        slot: f["slot"].as_u64().unwrap(),
        block_time: f["blockTime"].as_i64(),
        commitment: "confirmed".to_string(),
    }
}

#[test]
fn fixtures_decode_to_expected_events() {
    let mut checked = 0;
    for entry in fs::read_dir(fixtures_dir()).unwrap() {
        let path = entry.unwrap().path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let f: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        let program = f["program"].as_str().unwrap();

        let event: StreamEvent = if f["kind"].as_str() == Some("account") {
            let data = hex::decode(f["accountDataHex"].as_str().unwrap()).unwrap();
            decode_bonding_curve(program, &data, &ctx(&f))
                .unwrap_or_else(|| panic!("{:?} should decode", path))
        } else {
            let data = hex::decode(f["ixDataHex"].as_str().unwrap()).unwrap();
            let accounts: Vec<String> = f["accounts"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_str().unwrap().to_string())
                .collect();
            decode_instruction(program, &data, &accounts, &ctx(&f))
                .unwrap_or_else(|| panic!("{:?} should decode", path))
        };

        let got = serde_json::to_value(&event).unwrap();
        assert_eq!(got["schema"], "solana-stream/v1");
        assert_eq!(got["signature"], f["signature"]);
        assert_eq!(got["slot"], f["slot"]);

        for (k, v) in f["expected"].as_object().unwrap() {
            assert_eq!(&got[k], v, "fixture {:?} field {}", path, k);
        }
        checked += 1;
    }
    assert!(checked >= 5, "expected at least 5 fixtures, checked {checked}");
}

#[test]
fn unknown_program_is_none() {
    let ctx = DecodeContext {
        signature: "x".into(),
        slot: 1,
        block_time: None,
        commitment: "confirmed".into(),
    };
    assert!(decode_instruction("11111111111111111111111111111111", &[0u8], &[], &ctx).is_none());
}
