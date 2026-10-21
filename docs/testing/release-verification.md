# Release verification

## Local commands

Run from the repository root with Node 24, Corepack/pnpm 9.15.0, installed dependencies and Playwright Chromium available.

- `corepack pnpm quality:check`: source import/any boundaries and fixed production asset budgets after a build.
- `corepack pnpm quality:baseline`: fresh production client, isolated small-workspace route/editor/API budgets and both-theme captures.
- `corepack pnpm quality:scale`: isolated mature-workspace qualification with 5,000 tasks, 2,000 documents, two years of synthetic history and full backup round-trip; no real indexing jobs. Its fixed route/read and bulk-restore budgets must pass before release acceptance.
- `corepack pnpm test:contracts`: focused live checks for bounded task reads, habit cache/day semantics, navigation projections, AI retrieval/input scoping and batched backup rollback. These also run inside the complete live suite.
- `corepack pnpm test:landing`: builds the production client and checks the landing page and inline film in Chromium, Firefox and WebKit. Windows WebKit media-decoding cases are explicitly skipped; Linux CI runs them as part of the required core job.
- `corepack pnpm test:live`: prepares dedicated test storage, starts its own API and worker, runs the complete live suite, and stops owned processes. External provider keys are disabled.
- `corepack pnpm test:providers`: probes real embedding/text credentials and the configured text model identifiers directly, so a working fallback cannot hide a failed primary provider.
- `corepack pnpm test:ai`: uses the configured text provider and real Gemini embeddings with synthetic notes. It verifies Brain retrieval and UI Ask/Compose insertion/reload persistence.
- `corepack pnpm test:ai:gemini`: repeats the real workflows with Groq disabled, verifying the Gemini-only text stream.
- `corepack pnpm test:mobile`: browser-emulated layouts, keyboard navigation and accelerated Focus suspension/recovery checks.
- `corepack pnpm test:staging`: builds the production Docker images and starts a unique isolated HTTPS Compose stack. It checks secure cookies and refresh, authenticated WSS task/worker events, measured theme text-token contrast, a 12 MiB backup round-trip, service restart recovery, and production-bundle mobile/Focus scenarios. It removes only its own containers and volumes afterwards.

Host commands load private `apps/server/.env` without overwriting inherited settings. Live/AI/mobile runs require `TEST_DATABASE_URL` ending in `_test` and a dedicated nonzero `TEST_REDIS_URL` database, both different from application targets. Preparation deploys committed migrations and never resets a database. Use disposable test stores; scripts clean up only fixture records, not unrelated records or queues. API/frontend ports default to 3021/4189 and must be free; `KRAMA_API_TARGET` and `KRAMA_LIVE_FRONTEND_URL` can choose other local origins.

AI verification sends only synthetic fixture text to configured providers and consumes their normal quota. It fails clearly when required credentials are absent. Provider outages (including HTTP 503) also fail the gate; resolve the outage and rerun rather than accepting an earlier pass or silently using a different provider. Keep provider keys in private environment settings; never put them in test files or reports. Service logs redact configured keys and connection strings.

`GEMINI_TEXT_MODEL` selects Gemini text generation consistently for global completion, Brain streams and direct verification, independently of embeddings. Restart the server after changing it. This deployment explicitly selects `gemini-3.6-flash` after fresh direct and Gemini-only application qualification; an unset value retains the existing application default. Production Compose forwards the setting to server/worker, and the AI CI environment reads its same-named non-secret variable. Direct verification reports model IDs, and the Gemini-only application case asserts the reported model and absence of fallback.

Staging generates throwaway secrets, private test certificates and settings below ignored `test-results/staging-data/`. The certificate is valid only for local test names; Playwright permits this self-signed certificate for functional verification. No certificate is installed in a system trust store. This does not verify public DNS, a publicly trusted certificate or an external hosting platform. Existing app services, production volumes and image tags are preserved.

## CI and release gates

`.github/workflows/ci.yml` runs on main pushes, main pull requests, version tags (`v*`) and manual dispatch.

- Core checks: committed migrations, build/type/lint, validation and backend unit/integration/startup tests, mocked browser tests, the production landing suite in Chromium/Firefox/WebKit, full live workspace regressions, dependency audit and controlled production/mature-workspace performance gates.
- Production staging: build and execute the isolated HTTPS production-image stack, including restart and backup checks.
- Real AI: tag releases or manual dispatch with `real_ai=true` run a Groq/Gemini provider matrix against synthetic records.
- `release-ready` fails when an applicable job fails, is canceled or is unexpectedly skipped. A version tag or an explicitly requested manual AI run requires both real AI matrix entries to succeed. Normal pull requests do not consume provider quota.

Repository activation still requires committing/pushing these files. Configure `GEMINI_API_KEY` and `GROQ_API_KEY` as secrets in the GitHub `ai-verification` environment. Local keys are not uploaded automatically. Configure branch/ruleset protection to require the `release-ready` status, and make any future publishing/deployment job depend on it. Workflow files alone cannot prevent an administrator from publishing a release manually. No remote repository settings or credentials were changed by this work.

`corepack pnpm release:github --sha <reviewed-main-sha>` is read-only by default; `--apply` is guarded by successful current core/staging/Groq/Gemini checks and refuses to replace conflicting protection. Test those safeguards with `corepack pnpm test:release-policy`.

Failure artifacts are retained for seven days. Test accounts are disposable and cleaned up; do not enable these fixtures against personal application storage or an arbitrary public server. A deployed staging service needs a separate authorized fixture/cleanup contract before mutation tests are run there.
