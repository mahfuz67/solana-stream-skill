# CLAUDE.md — solana-stream-skill

Operational guidance for building this repo. Loaded every session. Governs **how the agent works
here**; the runtime SKILL.md (built later) governs how the skill routes for end users.

## Project & Mission
`solana-stream-skill` is a production-grade Claude Code SKILL for the Solana AI Kit bounty
(`github.com/solanabr/solana-ai-kit`). It teaches a coding agent to detect and **decode** on-chain
events in real time — new liquidity pools across every major DEX, and launchpad token migrations —
the moment they happen, and to emit them as structured events an autonomous agent can react to.

Audience: indexers, analytics, alerting, liquidation bots, DEX dashboards, and real-time agent
products that all hand-roll this today. The moat is **the verified map of WHAT to watch** (program
IDs + discriminators), not just how to decode. Frameworks (Carbon, Yellowstone-Vixen) cover the
"how"; this skill supplies the verified "what". Frame all docs as builder infrastructure. Do NOT
build x402 / payment rails — instead make the decoded stream cleanly consumable by agents
(emit-adapter) so it rides the agentic narrative without competing there.

## Working principles
1. **Expert capacity.** Operate as a senior Solana streaming/indexing engineer. Make decisions and
   recommend; don't enumerate every option or hedge.
2. **No noise comments.** Don't narrate code with comments. Comment only a non-obvious *why*
   (a discriminator's source, a native-vs-Anchor gotcha, a reorg edge case). Never restate what the
   code plainly does.
3. **Always verify output.** Nothing ships on recall. Program IDs/discriminators are verified
   against live sources (see below); code is proven against fixtures/tests; claims are checked
   before they're written down. Read back what you wrote.
4. **Delegate to subagents when it helps.** Use parallel subagents for breadth — fanning out IDL
   fetches / explorer cross-checks across many programs, or independent research — and reserve the
   main thread for synthesis and writing. Don't spawn for trivial single-file work.

## Hard rules (non-negotiable)
1. Match the reference repo's shape **exactly** (`github.com/solanabr/solana-game-skill`).
2. **ADDON pattern.** Extend `solana-dev-skill`; delegate core basics to it (toolchain/version
   errors, Anchor setup, LiteSVM/Surfpool testing, security review). Never duplicate them.
3. **Install scripts copy MARKDOWN ONLY** into `~/.claude/skills/` or `./.claude/skills/`. No
   compiled binaries, no `curl | bash` of remote code, nothing opaque. Runnable code lives in
   `examples/` and is **never** placed in the install path.
4. **Progressive / token-efficient.** `SKILL.md` is a thin router; detail lives in sub-files loaded
   only when needed. No bloat, no filler prose.
5. **Rust AND TypeScript** paths wherever relevant — Rust (Carbon + `yellowstone-grpc-client`) and
   TS (`@triton-one/yellowstone-grpc`).
6. **VERIFY, DON'T RECALL** (see procedure below) — the entire value of the skill.
7. **Current to the 2026 stack.** Include a "Default stack (Month 2026)" table like the reference.
8. **MIT licensed.** Work on branch `feat/<scope>-DD-MM-YYYY` with conventional commits.

## VERIFY, DON'T RECALL — the core value
Every program ID and every instruction/account discriminator MUST be confirmed from an
authoritative live source. For each, follow this procedure and record the result:

a) **Get the IDL** — via `carbon-cli parse`, `anchor idl fetch <programId>`, the program's official
   repo/docs, or a block explorer's IDL/anchor view.

b) **Classify Anchor vs Native** and decode accordingly:
   - Anchor instruction discriminator = first 8 bytes of `sha256("global:<ix_name>")`.
   - Anchor account discriminator = first 8 bytes of `sha256("account:<AccountName>")`.
   - Native programs (e.g. Raydium AMM v4) use a **u8/enum instruction tag**, NOT an 8-byte Anchor
     discriminator. Call this out per program.

c) **Cross-check the program ID** against a REAL recent transaction on an explorer (Solscan /
   Solana Explorer) to confirm it is current.

d) **Record** — program name, program ID, Anchor|Native, the pool-init/migration instruction, its
   discriminator/tag, the fields to extract (mint A/B, pool, LP, vaults), each line ending with:

   ```
   // source: <url> (checked YYYY-MM-DD)
   ```

e) If you cannot verify an item, mark it `TODO: VERIFY` and **do not guess a value**.

## Authoritative sources
- **Transports:** Yellowstone gRPC ("Dragon's Mouth", Triton); Helius LaserStream
  (Yellowstone-compatible, ~24h replay, multi-region failover); QuickNode Yellowstone. Geyser/gRPC
  ≈ sub-100ms vs WebSocket ~200-400ms. Earliest data: Jito ShredStream (shred-level, unconfirmed).
- **Clients:** `@triton-one/yellowstone-grpc` (TS); `yellowstone-grpc-client` +
  `yellowstone-grpc-proto` (Rust). `SubscribeRequest` filters: `accountInclude` / `accountRequired`
  / `owner`; commitment; ping/keepalive; `x-token` auth.
- **Decoding:** Carbon (`sevenlabs-hq/carbon`, v0.9.x) + `carbon-cli` (generates a decoder from an
  IDL or program address; pipeline = datasource → decoder → processor; ships datasources for
  yellowstone-grpc / jito-shredstream and decoders for pumpfun/raydium/meteora);
  Yellowstone-Vixen (parser/handler) as alternative; raw borsh/IDL as the no-framework path.
- **Programs to verify** (extract pool-init / migration ix + fields): Raydium AMM v4 (NATIVE),
  Raydium CLMM, Raydium CPMM, Raydium LaunchLab; Orca Whirlpools; Meteora DLMM + DAMM v2; Pump.fun
  (create + graduation/migration to PumpSwap); plus any verifiable launchpad (LetsBonk, Moonshot,
  Believe).
- **Reference repos:** `solanabr/solana-game-skill` (shape to copy exactly — ADDON extending
  solana-dev-skill); `solanabr/solana-ai-kit` (skill hub routing — yours must drop in cleanly);
  `solana-foundation/solana-dev-skill` (core to extend & delegate to); `sevenlabs-hq/carbon`
  (decode framework).

## Target file tree
```
solana-stream-skill/
├── CLAUDE.md  README.md  LICENSE(MIT)  install.sh  install-custom.sh  .gitignore
├── skill/
│   ├── SKILL.md                     # entry + "WebSocket vs gRPC vs ShredStream" decision tree
│   ├── grpc-setup.md
│   ├── subscriptions-and-filters.md
│   ├── decoding.md
│   ├── pool-creation-events.md      # ★ differentiator — verified ID/discriminator table
│   ├── launchpad-migrations.md      # ★ differentiator — verified migration detection
│   ├── reliability.md
│   ├── shredstream-and-latency.md
│   ├── websockets-fallback.md
│   ├── agent-emit.md                # normalize decoded events for agent consumption
│   └── resources.md                 # master verified program-ID reference table
├── agents/stream-engineer.md        # model: opus
├── commands/{scaffold-indexer.md,add-decoder.md,watch-pools.md,emit-events.md}
├── rules/streaming.md
└── examples/
    ├── rust-carbon/  ts-yellowstone/   # runnable cross-DEX pool + migration watcher
    └── fixtures/                       # recorded stream for offline, key-free decode tests
```

## Build order & checkpoints
Checkpoint and **pause after each**; ask before assuming.
1. Step 0 grounding summary (5 lines).
2. Repo skeleton + SKILL.md + decision tree + frontmatter.
3. grpc-setup + subscriptions-and-filters.
4. decoding + Carbon (carbon-cli wired).
5. ★ pool-creation-events + launchpad-migrations — **most effort here**; verify EVERY ID per the
   procedure and show the sources.
6. reliability.
7. shredstream-and-latency + websockets-fallback.
8. agent-emit + the emit adapter.
9. agents / commands / rules.
10. examples + fixtures + offline tests.
11. README + install scripts + LICENSE + scripts/validate.
12. Run validate + tests; report pass/fail + short summary.

**Two-strike rule:** if a build/test fails twice on the same root cause, STOP and ask the user.

## Conventions
- Branch `feat/<scope>-DD-MM-YYYY`; conventional commits (`feat:`, `docs:`, `test:`, `chore:`).
- Commit or push **only when asked**. Never push to a remote yourself — when done, PRINT the exact
  `git remote add` + `git push` + "open PR / submit repo link" steps for the user to run.
- Provide BOTH Rust and TS for anything runnable. Include `.env.example` and a Makefile/justfile or
  npm scripts: `test`, `watch`, `validate`.
- Offline fixture decode tests must run in CI with **no API key**; gate live devnet/mainnet smoke
  tests behind an env check so CI passes without secrets.
- README states: what it does, the exact problem, install path (both scripts), default-stack table,
  usage examples, the verified-reference highlight, and a one-line "pairs with
  solana-execution-skill" note.

## Definition of Done
- [ ] Shape matches `solana-game-skill`.
- [ ] EVERY program ID + discriminator carries a source link + date; none guessed; unknowns marked
      `TODO: VERIFY`.
- [ ] Anchor vs native decoding handled correctly per program.
- [ ] Rust + TS paths both present.
- [ ] Install scripts copy markdown only; no binaries in the install path.
- [ ] Watcher runs and emits structured pool + migration events; agent-emit adapter works.
- [ ] Offline fixture decode tests pass with no secrets.
- [ ] README + MIT done.
- [ ] On a `feat/` branch with clean commits; push/PR steps printed for the user.
