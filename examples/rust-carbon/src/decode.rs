use crate::registry::{
    instruction_specs, Id, InstructionSpec, BONDING_CURVE_COMPLETE_OFFSET, BONDING_CURVE_DISC,
    PUMPFUN_PROGRAM,
};
use crate::schema::{DecodeContext, Migration, StreamEvent};
use std::collections::BTreeMap;

fn matches(spec: &InstructionSpec, data: &[u8]) -> bool {
    match spec.id {
        Id::Tag(t) => !data.is_empty() && data[0] == t,
        Id::Disc(hexstr) => data.len() >= 8 && hex::encode(&data[0..8]) == hexstr,
    }
}

fn at(accounts: &[String], i: Option<usize>) -> Option<String> {
    i.and_then(|idx| accounts.get(idx).cloned())
}

fn read_u64(data: &[u8], off: usize) -> Option<u64> {
    data.get(off..off + 8)
        .map(|s| u64::from_le_bytes(s.try_into().unwrap()))
}

pub fn decode_instruction(
    program: &str,
    data: &[u8],
    accounts: &[String],
    ctx: &DecodeContext,
) -> Option<StreamEvent> {
    let specs = instruction_specs(program);
    let spec = specs.iter().find(|s| matches(s, data))?;

    let mut amounts = BTreeMap::new();
    if let Some(off) = spec.amount_a_offset {
        if let Some(v) = read_u64(data, off) {
            amounts.insert("initA".to_string(), v.to_string());
        }
    }
    if let Some(off) = spec.amount_b_offset {
        if let Some(v) = read_u64(data, off) {
            amounts.insert("initB".to_string(), v.to_string());
        }
    }

    Some(StreamEvent {
        schema: "solana-stream/v1",
        type_: spec.type_.to_string(),
        venue: spec.venue.to_string(),
        program: program.to_string(),
        instruction: spec.instruction.to_string(),
        signature: ctx.signature.clone(),
        slot: ctx.slot,
        block_time: ctx.block_time,
        commitment: ctx.commitment.clone(),
        pool: at(accounts, spec.accounts.pool),
        mint_a: at(accounts, spec.accounts.mint_a),
        mint_b: at(accounts, spec.accounts.mint_b).or_else(|| spec.mint_b_default.map(String::from)),
        lp_mint: at(accounts, spec.accounts.lp_mint),
        vault_a: at(accounts, spec.accounts.vault_a),
        vault_b: at(accounts, spec.accounts.vault_b),
        amounts,
        migration: spec
            .migration
            .map(|(from, to)| Migration { from: from.to_string(), to: to.to_string() }),
    })
}

/// Early graduation signal: Pump.fun BondingCurve account with `complete == true`.
pub fn decode_bonding_curve(program: &str, data: &[u8], ctx: &DecodeContext) -> Option<StreamEvent> {
    if program != PUMPFUN_PROGRAM
        || data.len() < BONDING_CURVE_COMPLETE_OFFSET + 1
        || hex::encode(&data[0..8]) != BONDING_CURVE_DISC
        || data[BONDING_CURVE_COMPLETE_OFFSET] != 1
    {
        return None;
    }
    Some(StreamEvent {
        schema: "solana-stream/v1",
        type_: "migration_pending".to_string(),
        venue: "pumpfun".to_string(),
        program: program.to_string(),
        instruction: "BondingCurve".to_string(),
        signature: ctx.signature.clone(),
        slot: ctx.slot,
        block_time: ctx.block_time,
        commitment: ctx.commitment.clone(),
        pool: None,
        mint_a: None,
        mint_b: None,
        lp_mint: None,
        vault_a: None,
        vault_b: None,
        amounts: BTreeMap::new(),
        migration: None,
    })
}
