# PR #395 Final Merge-Readiness Status

Date: 2026-03-10
PR: https://github.com/ComposioHQ/agent-orchestrator/pull/395
Branch: `feat/380`
Issue: #380

## 1) Scope delivered
- Added stable `event_id` to OpenClaw escalation payloads and included `Event ID: <id>` in escalation message text.
- Implemented AO-side idempotency dedupe cache scoped by `sessionKey + event_id` with bounded TTL via `idempotencyTtlMs` (default `300000`).
- Duplicate detection now reserves idempotency keys before send, preventing timeout/retry replay from creating duplicate OpenClaw runs within TTL.
- Added test coverage for dedupe behavior (same-event replay, session scoping, TTL expiry, timeout replay) and updated OpenClaw notifier docs.

## 2) Bugbot/CI status
- Mergeability: `MERGEABLE`
- Cursor Bugbot: `PASS`
- CI checks: all passing
  - `Lint` (PASS)
  - `Typecheck` (PASS)
  - `Test` (PASS)
  - `Test (Web)` (PASS)
  - `Integration Tests` (PASS)
  - `Test Fresh Onboarding` (PASS)
  - `Scan for Secrets` (PASS)
  - `Dependency Review` (PASS)
  - `NPM Audit` (PASS)

## 3) Exact tests run
Local, targeted validation run for this change:
- `pnpm -C packages/plugins/notifier-openclaw test`
- `pnpm -C packages/integration-tests exec vitest run --config vitest.config.ts src/notifier-openclaw.integration.test.ts`

PR CI validation (GitHub checks):
- `Lint`
- `Typecheck`
- `Test`
- `Test (Web)`
- `Integration Tests`
- `Test Fresh Onboarding`
- `Scan for Secrets`
- `Dependency Review`
- `NPM Audit`
- `Cursor Bugbot`

## 4) Residual risks (if any)
- Dedupe cache is in-memory in the notifier process; it does not persist across AO process restarts.
- Dedupe is process-local; in multi-instance AO deployments without shared state, cross-instance duplicates remain possible.
- Phase-0 behavior intentionally reserves keys before successful send; repeated retries of the exact same event are suppressed within TTL even if the first attempt timed out.

## 5) Explicit merge recommendation
YES

Reason: issue scope is delivered, acceptance behavior is covered by tests, Bugbot/CI are green, and remaining risks are known Phase-0 tradeoffs documented above.
