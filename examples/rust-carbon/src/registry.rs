// Verified program IDs + discriminators/tags. Source: skill/resources.md (checked 2026-06-21),
// re-derivable via sha256("global:<ix>")[..8]. Do not edit values from memory.

pub const WSOL: &str = "So11111111111111111111111111111111111111112";
pub const PUMPFUN_PROGRAM: &str = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
pub const BONDING_CURVE_DISC: &str = "17b7f83760d8ac60";
pub const BONDING_CURVE_COMPLETE_OFFSET: usize = 8 + 40;

pub enum Id {
    /// Native u8 instruction tag.
    Tag(u8),
    /// Anchor 8-byte discriminator, hex.
    Disc(&'static str),
}

pub struct Accounts {
    pub pool: Option<usize>,
    pub mint_a: Option<usize>,
    pub mint_b: Option<usize>,
    pub lp_mint: Option<usize>,
    pub vault_a: Option<usize>,
    pub vault_b: Option<usize>,
}

pub struct InstructionSpec {
    pub venue: &'static str,
    pub instruction: &'static str,
    pub type_: &'static str,
    pub id: Id,
    pub accounts: Accounts,
    pub mint_b_default: Option<&'static str>,
    pub amount_a_offset: Option<usize>,
    pub amount_b_offset: Option<usize>,
    pub migration: Option<(&'static str, &'static str)>,
}

const NONE: Accounts = Accounts {
    pool: None,
    mint_a: None,
    mint_b: None,
    lp_mint: None,
    vault_a: None,
    vault_b: None,
};

pub fn instruction_specs(program: &str) -> Vec<InstructionSpec> {
    match program {
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8" => vec![InstructionSpec {
            venue: "raydium-amm-v4",
            instruction: "initialize2",
            type_: "pool_created",
            id: Id::Tag(1),
            accounts: Accounts {
                pool: Some(4),
                lp_mint: Some(7),
                mint_a: Some(8),
                mint_b: Some(9),
                vault_a: Some(10),
                vault_b: Some(11),
            },
            mint_b_default: None,
            // initA tracks mintA (coin) -> init_coin_amount@18; initB tracks mintB (pc) -> init_pc_amount@10.
            amount_a_offset: Some(18),
            amount_b_offset: Some(10),
            migration: None,
        }],
        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc" => vec![InstructionSpec {
            venue: "orca-whirlpool",
            instruction: "initialize_pool",
            type_: "pool_created",
            id: Id::Disc("5fb40aac54aee828"),
            accounts: Accounts {
                mint_a: Some(1),
                mint_b: Some(2),
                pool: Some(4),
                vault_a: Some(5),
                vault_b: Some(6),
                ..NONE
            },
            mint_b_default: None,
            amount_a_offset: None,
            amount_b_offset: None,
            migration: None,
        }],
        "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C" => vec![InstructionSpec {
            venue: "raydium-cpmm",
            instruction: "initialize",
            type_: "pool_created",
            id: Id::Disc("afaf6d1f0d989bed"),
            accounts: Accounts {
                pool: Some(3),
                mint_a: Some(4),
                mint_b: Some(5),
                lp_mint: Some(6),
                vault_a: Some(10),
                vault_b: Some(11),
            },
            mint_b_default: None,
            amount_a_offset: Some(8),
            amount_b_offset: Some(16),
            migration: None,
        }],
        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" => vec![InstructionSpec {
            venue: "pumpfun",
            instruction: "migrate",
            type_: "migrated",
            id: Id::Disc("9beae792ec9ea21e"),
            accounts: Accounts {
                mint_a: Some(2),
                pool: Some(9),
                ..NONE
            },
            mint_b_default: Some(WSOL),
            amount_a_offset: None,
            amount_b_offset: None,
            migration: Some(("pumpfun", "pumpswap")),
        }],
        _ => vec![],
    }
}
