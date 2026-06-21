import {
  INSTRUCTION_REGISTRY,
  BONDING_CURVE_DISC,
  BONDING_CURVE_COMPLETE_OFFSET,
  PUMPFUN_PROGRAM,
  type InstructionSpec,
} from "./registry.js";
import type { StreamEvent } from "./schema.js";

export interface DecodeContext {
  signature: string;
  slot: number;
  blockTime: number | null;
  commitment: "processed" | "confirmed" | "finalized";
}

function matches(spec: InstructionSpec, data: Buffer): boolean {
  if (spec.native) return data.length >= 1 && data.readUInt8(0) === spec.native.tag;
  if (spec.anchor) return data.length >= 8 && data.subarray(0, 8).toString("hex") === spec.anchor.disc;
  return false;
}

function at(accounts: string[], i: number | undefined): string | null {
  return i === undefined ? null : (accounts[i] ?? null);
}

export function decodeInstruction(
  programId: string,
  data: Buffer,
  accounts: string[],
  ctx: DecodeContext,
): StreamEvent | null {
  const specs = INSTRUCTION_REGISTRY[programId];
  if (!specs) return null;
  const spec = specs.find((s) => matches(s, data));
  if (!spec) return null;

  const amounts: Record<string, string> = {};
  if (spec.amounts?.initA) amounts.initA = data.readBigUInt64LE(spec.amounts.initA.offset).toString();
  if (spec.amounts?.initB) amounts.initB = data.readBigUInt64LE(spec.amounts.initB.offset).toString();

  const event: StreamEvent = {
    schema: "solana-stream/v1",
    type: spec.type,
    venue: spec.venue,
    program: programId,
    instruction: spec.instruction,
    signature: ctx.signature,
    slot: ctx.slot,
    blockTime: ctx.blockTime,
    commitment: ctx.commitment,
    pool: at(accounts, spec.accounts.pool),
    mintA: at(accounts, spec.accounts.mintA),
    mintB: at(accounts, spec.accounts.mintB) ?? spec.mintBDefault ?? null,
    lpMint: at(accounts, spec.accounts.lpMint),
    vaultA: at(accounts, spec.accounts.vaultA),
    vaultB: at(accounts, spec.accounts.vaultB),
    amounts,
  };
  if (spec.migration) event.migration = spec.migration;
  return event;
}

// Early graduation signal: Pump.fun BondingCurve account with complete == true.
export function decodeBondingCurve(
  programId: string,
  data: Buffer,
  ctx: DecodeContext,
): StreamEvent | null {
  if (programId !== PUMPFUN_PROGRAM) return null;
  if (data.length < BONDING_CURVE_COMPLETE_OFFSET + 1) return null;
  if (data.subarray(0, 8).toString("hex") !== BONDING_CURVE_DISC) return null;
  if (data.readUInt8(BONDING_CURVE_COMPLETE_OFFSET) !== 1) return null;

  return {
    schema: "solana-stream/v1",
    type: "migration_pending",
    venue: "pumpfun",
    program: programId,
    instruction: "BondingCurve",
    signature: ctx.signature,
    slot: ctx.slot,
    blockTime: ctx.blockTime,
    commitment: ctx.commitment,
    pool: null,
    mintA: null,
    mintB: null,
    lpMint: null,
    vaultA: null,
    vaultB: null,
    amounts: {},
  };
}
