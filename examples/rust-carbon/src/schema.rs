use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Serialize, Debug, Clone)]
pub struct Migration {
    pub from: String,
    pub to: String,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    pub schema: &'static str,
    #[serde(rename = "type")]
    pub type_: String,
    pub venue: String,
    pub program: String,
    pub instruction: String,
    pub signature: String,
    pub slot: u64,
    pub block_time: Option<i64>,
    pub commitment: String,
    pub pool: Option<String>,
    pub mint_a: Option<String>,
    pub mint_b: Option<String>,
    pub lp_mint: Option<String>,
    pub vault_a: Option<String>,
    pub vault_b: Option<String>,
    pub amounts: BTreeMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub migration: Option<Migration>,
}

#[derive(Clone)]
pub struct DecodeContext {
    pub signature: String,
    pub slot: u64,
    pub block_time: Option<i64>,
    pub commitment: String,
}
