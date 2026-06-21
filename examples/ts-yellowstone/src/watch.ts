// Live cross-DEX pool + migration watcher over Yellowstone gRPC.
// Requires GRPC_ENDPOINT (+ GRPC_X_TOKEN). Decoding is shared with the offline tests.
import Client, { CommitmentLevel, type SubscribeRequest } from "@triton-one/yellowstone-grpc";
import bs58 from "bs58";
import { ALL_PROGRAM_IDS } from "./registry.js";
import { decodeInstruction, type DecodeContext } from "./decode.js";
import { jsonlSink, type EventSink } from "./schema.js";

async function main(sink: EventSink = jsonlSink) {
  const endpoint = process.env.GRPC_ENDPOINT;
  if (!endpoint) throw new Error("set GRPC_ENDPOINT (see .env.example)");

  const client = new Client(
    endpoint,
    process.env.GRPC_X_TOKEN,
    { grpcMaxDecodingMessageSize: 64 * 1024 * 1024 },
    { backoff: { initialIntervalMs: 100, multiplier: 2, maxRetries: 10 }, slotRetention: 250 },
  );
  await client.connect();

  const request: SubscribeRequest = {
    accounts: {},
    slots: {},
    transactions: {
      watch: {
        vote: false,
        failed: false,
        accountInclude: ALL_PROGRAM_IDS,
        accountExclude: [],
        accountRequired: [],
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    commitment: CommitmentLevel.CONFIRMED,
    ping: undefined,
  };

  const stream = await client.subscribe(request);

  stream.on("data", (update: any) => {
    if (update.ping) {
      stream.write({ ...request, ping: { id: 1 } });
      return;
    }
    const tx = update.transaction?.transaction;
    if (!tx) return;

    const sig = bs58.encode(tx.signature);
    const slot = Number(update.transaction.slot ?? 0);
    const ctx: DecodeContext = { signature: sig, slot, blockTime: null, commitment: "confirmed" };

    const msg = tx.transaction?.message;
    // Static keys only; v0 address-lookup-table accounts (tx.meta.loaded*Addresses) are not
    // resolved here. Append them if you need ALT-referenced accounts.
    const keys: string[] = (msg?.accountKeys ?? []).map((k: Uint8Array) => bs58.encode(k));

    for (const ix of msg?.instructions ?? []) {
      const programId = keys[ix.programIdIndex];
      const accounts: string[] = [...ix.accounts].map((i: number) => keys[i]);
      const event = decodeInstruction(programId, Buffer.from(ix.data), accounts, ctx);
      if (event) void sink(event);
    }
  });

  stream.on("error", (err) => console.error("stream error", err));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
