export interface StreamEvent {
  schema: "solana-stream/v1";
  type: "pool_created" | "migration_pending" | "migrated";
  venue: string;
  program: string;
  instruction: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  commitment: "processed" | "confirmed" | "finalized";
  pool: string | null;
  mintA: string | null;
  mintB: string | null;
  lpMint: string | null;
  vaultA: string | null;
  vaultB: string | null;
  amounts: Record<string, string>;
  migration?: { from: string; to: string };
}

export type EventSink = (e: StreamEvent) => void | Promise<void>;

export const jsonlSink: EventSink = (e) => void process.stdout.write(JSON.stringify(e) + "\n");

export function webhookSink(url: string): EventSink {
  return async (e) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": e.signature },
        body: JSON.stringify(e),
      }).catch(() => null);
      if (res?.ok) return;
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
  };
}

export function multiSink(...sinks: EventSink[]): EventSink {
  return async (e) => void (await Promise.allSettled(sinks.map((s) => s(e))));
}
