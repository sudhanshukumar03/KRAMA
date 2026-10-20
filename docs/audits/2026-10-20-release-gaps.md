# Release-gap repairs

Requested 2026-10-20 after the final fix validation. Status: all 15 local verification stages passed. Gemini text is qualified with an explicitly selected healthy model; GitHub activation is prepared for publication/credential-sharing approval. All 26 fresh production HTTPS checks passed. R2 remains Coming soon.

## Gemini configuration and actual workflows

The configured key listed supported Gemini text models, so the original problem was not an absent key. Fresh synthetic probes returned 500 for `gemini-3.8-flash`, 504 for `gemini-3.5-flash-lite`, and a successful response from `gemini-3.6-flash`. The original model's outage is not declared repaired; this deployment now selects a healthy supported model explicitly.

Google lists [Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) as a stable previous-generation text model. `GEMINI_TEXT_MODEL` now controls global completions, Brain streams, Gemini helpers and direct qualification consistently; an unset value retains the previous application default. Private host/Compose settings select `gemini-3.6-flash`. Production Compose passes the setting to server/worker, while the real-AI workflow reads the non-secret variable from its `ai-verification` environment. Embedding model/dimensions are unchanged.

Direct verification records exact model IDs. The Gemini-only application case also asserts the reported provider/model and that fallback is unavailable. It then requires successful grounded Ask, a completed stream, Compose insertion, save and reload. Both Gemini-only workflows passed after the change, then passed again in the fresh qualification run. Neither run used Groq fallback. Configured-provider workflows and the direct embedding/Groq/Gemini checks also passed.

The new 3.6 cost-map entry uses the published Standard introductory text rates through 2026-12-31 from [Google's pricing table](https://ai.google.dev/gemini-api/docs/pricing). These remain application estimates, not invoices; pricing must be reviewed when the introductory period ends. No priority tier or paid subscription was activated.

## GitHub enforcement

Authenticated read-only inspection confirmed administrative access to public repository `sudhanshukumar03/KRAMA`, default branch `main`, no branch protection/rulesets, no AI environment/secrets, and an older published workflow. The published workflow permits backend test failure with `|| echo`; the current local workflow removes that behavior and contains the broader regression/staging/AI release gate. Earlier remote green checks do not qualify the unpublished repairs.

`release:github` is a read-only preflight by default. It compares the published workflow with the local reviewed one and requires the exact main revision, explicit successful current core/staging/Groq/Gemini jobs, the selected model variable, and the trusted GitHub Actions `release-ready` check. `--apply` additionally requires a full reviewed SHA, rechecks main/protection, and refuses to replace conflicting protection. Its proposed policy applies to administrators, requires an up-to-date gate and PR, blocks force pushes/deletion, and avoids requiring a second human reviewer on a solo-owner repository. GitHub Actions app ID 15368 was confirmed from real repository checks.

Six policy tests pass. The live read-only preflight correctly remains failed with `applied=false` because the new workflow/model variable and qualified remote run have not been published. Calling `--apply` without a SHA is rejected before any GitHub mutation. No protection or secret upload was attempted.

The [activation sequence](../testing/github-release-activation.md) is the reviewable action plan. A local source archive and file-hash manifest are prepared under ignored `.audit/release-gaps-2026-10-20/`. They include the accumulated requested workspace repairs, exclude private environments/local agent/editor settings and generated output, and are scanned for configured credentials and common key signatures. Publication needs approval because this moves the currently uncommitted source to a public repository and shares private provider keys with its encrypted GitHub environment. No commit, push, merge, dispatch, deployment or secret upload has occurred.

## Current verification

| Fresh check | Result |
| --- | --- |
| Build / lint / root test-config types | Passed |
| Backend unit / integration / validation | 177 / 60 / 25 passed |
| Source/asset budgets / release-policy safeguards | Passed; six policy tests |
| Workflow syntax / production Compose validation | Passed |
| Affected assistant/search/navigation browser cases | Eight passed |
| Direct embeddings / Groq text / selected Gemini text | All passed, with model IDs recorded |
| Configured-provider application AI | Both workflows passed |
| Gemini-only application AI | Both workflows passed twice after model selection; no Groq fallback |
| Isolated production HTTPS | All 26 passed in 1.8 minutes |

The 15-stage run started at 22:22 and finished at 22:28 Asia/Kolkata. All 424 inventoried application/shared/test source files were unchanged during it. Completed browser suites used zero retries and zero skips. HTTPS covered secure login/refresh, WSS task/worker events, backup ingress, restart persistence/reconnect, theme contrast and emulated mobile/Focus behavior. Verification listeners were gone afterward; only the four pre-existing healthy KRAMA/LedgerMind database/Redis containers remained running.

This is fresh qualification of the provider/configuration changes and their affected paths. The earlier complete frontend/live/performance runs remain separately recorded in the previous audit; they were not all repeated here. The remote readiness preflight remains deliberately failed until actual publication, environment configuration and successful remote qualification occur.

Evidence: `.audit/release-gaps-2026-10-20/` contains model listings/probes, provider logs with model IDs, both Gemini-only reports, configured AI results, per-stage logs/results, policy checks, the read-only remote preflight and publication manifest/archive. No credential values are printed in this report.

## Environment limits

The user selected isolated local HTTPS and has no physical device connected. Public hosting requires an authorized target; a real phone/tablet is required for actual keyboard and sleep acceptance. The existing [physical-device checklist](../testing/physical-device-checklist.md) remains not executed. These conditions cannot be made passing through browser emulation or a local certificate. R2 remains intentionally deferred and is excluded from the current release scope.
