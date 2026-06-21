// Verified program IDs + discriminators/tags. Source: skill/resources.md (checked 2026-06-21),
// re-derivable via sha256("global:<ix>")[..8]. Do not edit values from memory.

export const WSOL = "So11111111111111111111111111111111111111112";

export interface U64Field {
  offset: number;
}

export interface InstructionSpec {
  venue: string;
  instruction: string;
  type: "pool_created" | "migrated";
  native?: { tag: number };
  anchor?: { disc: string }; // hex of the 8-byte discriminator
  accounts: {
    pool?: number;
    mintA?: number;
    mintB?: number;
    lpMint?: number;
    vaultA?: number;
    vaultB?: number;
  };
  mintBDefault?: string; // when the quote mint is implicit (e.g. WSOL)
  amounts?: { initA?: U64Field; initB?: U64Field };
  migration?: { from: string; to: string };
}

// keyed by program ID -> list of instruction specs to try
export const INSTRUCTION_REGISTRY: Record<string, InstructionSpec[]> = {
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": [
    {
      venue: "raydium-amm-v4",
      instruction: "initialize2",
      type: "pool_created",
      native: { tag: 1 },
      accounts: { pool: 4, lpMint: 7, mintA: 8, mintB: 9, vaultA: 10, vaultB: 11 },
      amounts: { initA: { offset: 10 }, initB: { offset: 18 } },
    },
  ],
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": [
    {
      venue: "orca-whirlpool",
      instruction: "initialize_pool",
      type: "pool_created",
      anchor: { disc: "5fb40aac54aee828" },
      accounts: { mintA: 1, mintB: 2, pool: 4, vaultA: 5, vaultB: 6 },
    },
  ],
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C": [
    {
      venue: "raydium-cpmm",
      instruction: "initialize",
      type: "pool_created",
      anchor: { disc: "afaf6d1f0d989bed" },
      accounts: { pool: 3, mintA: 4, mintB: 5, lpMint: 6, vaultA: 10, vaultB: 11 },
      amounts: { initA: { offset: 8 }, initB: { offset: 16 } },
    },
  ],
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": [
    {
      venue: "pumpfun",
      instruction: "migrate",
      type: "migrated",
      anchor: { disc: "9beae792ec9ea21e" },
      accounts: { mintA: 2, pool: 9 },
      mintBDefault: WSOL,
      migration: { from: "pumpfun", to: "pumpswap" },
    },
  ],
};

// Pump.fun BondingCurve account (graduation early signal). Layout offsets are after the
// 8-byte account discriminator: 5x u64 (40 bytes) then `complete: bool` at byte 48.
export const PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const BONDING_CURVE_DISC = "17b7f83760d8ac60";
export const BONDING_CURVE_COMPLETE_OFFSET = 8 + 40;

export const ALL_PROGRAM_IDS = Object.keys(INSTRUCTION_REGISTRY);
