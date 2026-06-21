---
description: "Wire the decoded stream into the agent-emit adapter (JSONL / webhook / callback)"
---

Connect a decoded stream to the normalized agent-emit adapter so an autonomous agent can react. Read
[agent-emit.md](../skill/agent-emit.md) first.

## Step 1 — Normalize
In each decode handler, build a `solana-stream/v1` event from the typed instruction + accounts. Map
venue-specific names to stable fields (`mintA`/`mintB`, `pool`, `lpMint`, `vaultA/B`), **stringify all
integers**, set `type` (`pool_created` / `migration_pending` / `migrated`), `commitment`, and
`signature` (the idempotency key). Use the field maps in
[pool-creation-events.md](../skill/pool-creation-events.md) /
[launchpad-migrations.md](../skill/launchpad-migrations.md).

## Step 2 — Pick sink(s)
- **JSONL** (stdout) — pipes, `jq`, log shippers.
- **Webhook** — remote/serverless agents; POST with retry/backoff and `idempotency-key: <signature>`.
- **Callback** — in-process agent loop; lowest latency.

Use a multi-sink to emit JSONL for audit **and** webhook/callback for action at once.

## Step 3 — Keep it decoupled
Emit must not depend on the datasource or venue — that's the point of the schema. Switching transport
or adding a venue should not touch consumers.

## Step 4 — Verify
Assert a fixture decodes to the exact expected event JSON offline (no API key). Confirm reorg
transitions emit a follow-up event (e.g. `confirmed → finalized`, or `dropped`) rather than mutating
a prior one ([reliability.md](../skill/reliability.md)).
