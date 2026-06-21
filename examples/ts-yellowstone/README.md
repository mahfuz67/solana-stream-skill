# ts-yellowstone — cross-DEX pool + migration watcher (TypeScript)

Live watcher over Yellowstone gRPC (`@triton-one/yellowstone-grpc`) that decodes new pools and
launchpad migrations with the **verified** discriminators from `skill/resources.md` and emits
normalized `solana-stream/v1` events. The decode logic is proven offline against
`../fixtures` with **no API key**.

```bash
npm install
npm test        # offline decode tests (no secrets)
npm run validate  # tsc --noEmit
npm run watch   # live; needs GRPC_ENDPOINT (+ GRPC_X_TOKEN) — see ../../.env.example
```

- `src/registry.ts` — verified program IDs + discriminators/tags + account index maps.
- `src/decode.ts` — `decodeInstruction` / `decodeBondingCurve` → `StreamEvent`.
- `src/schema.ts` — the schema + jsonl/webhook/multi sinks.
- `src/watch.ts` — live gRPC watcher (transactions filtered by the program IDs).
- `test/decode.test.ts` — asserts each fixture decodes to its expected event.
