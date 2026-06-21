import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decodeInstruction, decodeBondingCurve, type DecodeContext } from "../src/decode.js";
import type { StreamEvent } from "../src/schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "..", "fixtures");

interface Fixture {
  name: string;
  venue: string;
  program: string;
  instruction?: string;
  kind?: "account";
  signature: string;
  slot: number;
  blockTime: number | null;
  ixDataHex?: string;
  accountDataHex?: string;
  accounts?: string[];
  expected: Record<string, unknown>;
}

function loadFixtures(): Fixture[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(fixturesDir, f), "utf8")) as Fixture);
}

const ctx = (f: Fixture): DecodeContext => ({
  signature: f.signature,
  slot: f.slot,
  blockTime: f.blockTime,
  commitment: "confirmed",
});

for (const f of loadFixtures()) {
  test(f.name, () => {
    let event: StreamEvent | null;
    if (f.kind === "account") {
      event = decodeBondingCurve(f.program, Buffer.from(f.accountDataHex!, "hex"), ctx(f));
    } else {
      event = decodeInstruction(f.program, Buffer.from(f.ixDataHex!, "hex"), f.accounts!, ctx(f));
    }

    assert.ok(event, "fixture should decode to an event");
    assert.equal(event!.schema, "solana-stream/v1");
    assert.equal(event!.signature, f.signature);
    assert.equal(event!.slot, f.slot);

    for (const [k, v] of Object.entries(f.expected)) {
      assert.deepEqual((event as unknown as Record<string, unknown>)[k], v, `field "${k}"`);
    }
  });
}

test("unknown program decodes to null", () => {
  assert.equal(
    decodeInstruction("11111111111111111111111111111111", Buffer.from("00", "hex"), [], {
      signature: "x",
      slot: 1,
      blockTime: null,
      commitment: "confirmed",
    }),
    null,
  );
});
