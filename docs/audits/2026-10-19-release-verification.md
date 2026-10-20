# Release verification and automation

Current status: **application/staging regressions passed; final Gemini text availability is failing with provider HTTP 503**. Release verification is not entirely green.

Plan: [release-verification-plan](2026-10-19-release-verification-plan.md). User chose isolated local HTTPS staging and confirmed that no physical device is connected.

## Real AI verification

Initial configured Gemini embeddings, Groq text and Gemini text probes returned successful real responses using synthetic prompts. The embedding probe returned 768 finite values. No personal notes were sent externally.

Two application cases passed with the usual configured text path, and the same two passed with Groq disabled: actual worker embedding persistence, keyword/semantic retrieval and ranking, workspace isolation, deleted-note exclusion, grounded Ask SSE completion, Compose SSE completion, insertion into the editor, autosave and reload persistence. The first retrieval attempt used an incorrect URL in the new test; the corrected API route passed without an application change.

The final maintained probe passed Gemini embeddings and Groq text, but Gemini text returned HTTP 503 UNAVAILABLE with a high-demand message in three bounded attempts. The earlier successful Gemini-only application run remains valid historical evidence; it does not establish current provider availability. No configured model or credential was changed to bypass this failure. The provider check exits nonzero, so an applicable release gate remains failed until a fresh run succeeds.

The reusable provider probe imports the application's text model constants. CI probes each provider directly before application workflows, so fallback cannot hide a failed primary credential/model.

## Local HTTPS production-image verification

A separate generated Compose project builds the real server, migration and web Dockerfiles. It uses dedicated PostgreSQL/Redis volumes, random credentials, an isolated network, loopback-only ports and a short-lived self-signed certificate. No certificate trust setting, existing app service, production data store or production image tag is changed.

The completed 26-case run passed secure/HttpOnly/SameSite cookies and refresh rotation, authenticated WSS task events, worker notification delivery across Redis, a 12 MiB backup through Nginx into a new workspace, app-container restart with retained task/note data, HTTPS session reuse, WSS reconnection, mobile layouts and accelerated Focus recovery. Automatic production secure-cookie handling was tested without forcing COOKIE_SECURE. Its containers, network and volumes were removed afterwards.

Earlier restart assertions fired after the transport upgrade but before the authenticated Socket.IO connection. The test now waits for both; a focused rerun and the complete corrected suite passed. No production socket or authentication code was changed for this test timing issue.

The two theme-palette cases passed all 68 measured text/background pairs across the workspace and landing page. Minimum ratios were 4.94:1 (workspace light), 5.00:1 (landing light), 5.02:1 (workspace dark) and 6.32:1 (landing dark). These do not establish contrast for every image-backed or state-dependent element.

## Regression automation

- `test:live`: safe test-target validation, migration deployment, owned API/worker startup with a shared run identifier, full live suite and process cleanup.
- `test:providers`, `test:ai`, `test:ai:gemini`: direct real-provider checks and synthetic application workflows.
- `test:mobile`, `test:staging`: emulated interaction checks and isolated production-image HTTPS checks.
- CI now checks main pull requests/pushes, version tags and manual dispatch. It runs full live regressions and production staging. Version tags and explicitly requested manual AI runs also require successful Groq and Gemini AI matrix jobs. An aggregate `release-ready` job fails on applicable failed/canceled/skipped jobs. Normal PRs avoid provider quota.
- Local dedicated TEST_DATABASE_URL/TEST_REDIS_URL settings were added to the private server environment without changing application URLs or provider credentials.

GitHub activation still requires committing/pushing the work, configuring both provider secrets in the `ai-verification` GitHub environment, and requiring `release-ready` in repository protection/publishing rules. No remote secrets, repository settings or releases were modified.

## Verification results

| Check | Result |
| --- | --- |
| Real provider probes, final | Gemini embedding and Groq passed; Gemini text failed HTTP 503 in three attempts |
| Application AI workflows, usual provider path | 2 passed |
| Application AI workflows, Gemini-only text | 2 passed |
| Corrected full HTTPS staging run | 26 passed; no skips, failures or retries |
| Expanded staging theme-contrast coverage | Both themes passed; all 68 pairs above 4.5:1 |
| Workflow validation | actionlint passed |
| YAML parsing | Workflow and Compose files passed |
| Root test/config TypeScript | Final check passed |
| Full live suite via new runner | 127 passed, 6 opt-in cases skipped |
| Backend unit suite | 157 tests / 27 suites passed in a clean sequential run |
| Shared validation and lint | 25 validation tests passed; workspace lint passed |
| Backend integration suite | 59 tests / 9 suites passed |
| Unsafe verification target guard | Invalid synthetic target rejected before startup; credential not printed |
| Fixture/resource cleanup | One interrupted synthetic account removed; temporary staging containers/network/volumes removed |

A provisional concurrent live run was stopped deliberately when Windows reported critically low available virtual memory. Its partial results are not counted as a complete pass. Subsequent unit/integration, validation, lint and type checks ran sequentially and passed. The final provider-availability failure is recorded separately above. Existing application database/Redis containers remained healthy, and existing development processes were preserved. A temporary automatic approval-review usage failure prevented one Docker lint invocation; the explicit-file retry later completed successfully.

## Limits and handoff

No physical phone/tablet was connected. Actual mobile keyboard resize, device brightness/readability, OS background throttling and genuine sleep/resume remain not run. Automated checks use browser viewport/keyboard APIs and accelerated clocks, including two-hour suspension, pause exclusion, midnight, failed-save and expired-login recovery. The [physical-device checklist](../testing/physical-device-checklist.md) records the remaining tests.

Local HTTPS with a permitted self-signed certificate does not verify public DNS, certificate-chain trust or an external hosting platform. R2 uploads remain disabled because real storage credentials are absent; unavailable-state behavior was verified. No provider purchase or public deployment was performed.

Commands, required environment settings and CI activation steps: [release-verification guide](../testing/release-verification.md). Raw local evidence is kept in ignored `.audit/release-2026-10-19/` and `test-results/` artifacts.
