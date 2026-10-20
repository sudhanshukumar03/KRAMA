# Security and privacy review checkpoint

Historical checkpoint. The [October 21 continuation](2026-10-21-quality-continuation.md) records completed remote publication, provider-environment setup and enforced branch protection. Remaining security-review qualifications in this document stay open; remote setup is no longer awaiting approval.

Later follow-up: [release-gap qualification](2026-10-20-release-gaps.md) passed direct and Gemini-only workflows with the explicitly selected 3.6 model. It also records read-only GitHub findings, guarded protection activation and a credential-scanned local publication bundle. Source publication, provider-secret sharing and remote protection await approval; they have not occurred.

Date: 2026-10-20. Scope: local KRAMA application source, dependency graph and synthetic verification. This is a control review and regression record, not an independent penetration test or certification. Fresh core, production HTTPS and dependency checks passed; required real-provider qualification remains incomplete.

## Assets and boundaries

Protect account/session credentials, private notes and AI context, task/goal/habit history, imported backups, provider credentials and diagnostic output. Consider unauthenticated callers, authenticated users selecting an unauthorized workspace, revoked or rotated sessions, stale indexing/event work, malformed external errors and provider-generated identifiers. Infrastructure administrators and a compromised database/Redis host are outside the application isolation guarantee.

| Boundary | Reviewed implementation | Evidence / disposition |
| --- | --- | --- |
| Session -> authenticated identity | `middlewares/auth.middleware.ts`, `services/auth.service.ts` | Signed access tokens also require a matching non-revoked database session. Password/session issuance and rotation use transactional checks. Fresh live regressions and all 26 HTTPS cases passed, including secure cookie refresh and restart recovery |
| Identity -> workspace | `middlewares/rbac.middleware.ts`, domain routes and services | Verified membership and role determine downstream scope. New count/recent/task-page contract cases check another selected workspace. Malformed workspace query shapes and broader role UI visibility remain review items |
| HTTP / reverse proxy | `index.ts`, `config/proxy.ts`, ingress configuration | Explicit trusted proxy addresses, production origin allowlist, Helmet, bounded JSON parsers. IPv6 subnet regression passed after the dependency patch. Public ingress/certificate behavior is not established by local TLS |
| Work data -> WebSockets | `services/socket.service.ts` | Session expiry/revocation and membership-aware event recipients; worker events pass through the same delivery gate. Existing socket authorization/restart cases remain required |
| User text -> browser | React views, search result component, Brain editor | Search uses React text nodes/highlights. The source scan found one static stylesheet `dangerouslySetInnerHTML`; it does not interpolate note input. Rich editor link/paste behavior still needs a dedicated hostile-content review |
| Upload -> public storage | `routes/upload.routes.ts`, `services/uploadImage.service.ts` | Authenticated 10MB raster uploads; signatures, decoding/pixel limits and fresh WEBP encoding. Synthetic image tests cover disguised/SVG/truncated/oversized input and metadata removal. Actual R2 success remains unverified |
| Backup -> new workspace | `services/workspaceRestore.service.ts` | Validated personal backup, remapped IDs, cross-reference/cycle checks, one transaction, bounded insert batches. Mature 14.8MB restore passed counts and relationship checks; external storage backup procedures are outside this result |
| Application failure -> HTTP/logs | `utils/errors.ts`, migrated controllers | Unknown errors, recognized metadata serialization, invalid statuses, bounded classifications and production privacy checks. Auth, uploads, workspace, Goal/Habit and global fallback now use this boundary. Other feature/provider/worker raw diagnostic calls remain under review |
| Model -> UI citations | `services/rag/sources.ts`, `services/krama-ai.service.ts` | Reproduced model-invented source links without retrieval. Canonical retrieved IDs/titles now determine source badges, with deduplication and a three-source limit. This constrains links; it does not prove factual correctness of generated prose |
| Dependencies -> runtime | Lockfile and targeted compatible updates | Seventeen original advisories cleared; fresh acceptance pnpm audit reported no known vulnerabilities. Production images rebuilt and passed functional HTTPS checks; container OS packages were not vulnerability-scanned |

## Confirmed repairs in this slice

- Generic error bodies previously forwarded circular Prisma/Zod metadata or invalid operational HTTP status codes. The regression failed before repair and passed afterward. Validation now exposes the stable `code`, `path`, `message` fields; arbitrary rejected inputs are excluded.
- Authentication catches could reject again on `null`, and raw adapter diagnostics could include private inputs. Upload failures had the same malformed-error failure and included adapter messages in the response. Eighteen focused error/auth/upload checks passed after migration, using fake storage and model-independent inputs.
- Workspace and backup catches were migrated to the same boundary; backup format/relationship failures retain deliberate 400 responses. Full workflow coverage remains necessary after this change.
- A model could return invented source IDs/titles even without retrieval; the application now discards those. A separate failing case found paused Goal metadata rendered as ACTIVE in the model context. Both mocked service cases now pass.

## Remaining qualification

The fresh build/types/lint, 171 backend unit, 59 integration, 25 validation and asset/source checks passed. Full mocked/frontend checks passed 262, full live passed 135 with eight optional skips, and HTTPS staging passed all 26. Stale-index scope is checked with a failing-before/passing-after live case: both retrieval queries join the active document, space and workspace, excluding orphaned and mismatched chunks. Global chat validates trimmed messages/prompt aliases (20,000-character maximum) and boolean retrieval flags before provider work; all eight live data contracts pass, including rollback after a later restore batch fails.

Fresh Gemini embeddings and Groq text probes passed, as did both configured-provider application AI workflows, including a final repeat after the test-only deadline correction. The direct Gemini text probe returned HTTP 503 (high demand). Gemini-only retrieval passed, and diagnostic Ask returned HTTP 503; Gemini-only Compose was not reached. The [verification ledger](2026-10-20-quality-verification.md) records the original test deadline and final response separately. An unavailable required provider keeps that release check failed.

The subsequent [final logic review](2026-10-20-final-logic-review.md) reproduced and repaired malformed telemetry and concurrent daily insight quota defects. Validation runs before provider/context work, and shared Redis reservations enforce the allowance atomically, with refunds on generation failure. The new boundary, outage, cache and real-Redis concurrency regressions passed; broader qualification is recorded in that report.

Review remaining raw provider/feature/worker logs and rich content/URL handling. Keep remote CI enforcement, public hosting and real devices separate from local automation. The user deferred R2 uploads as Coming soon on 2026-10-20; real storage success/recovery belongs to that future feature release, while disabled-upload handling stays required now. No permission to publish private configuration, push code or enable external services is inferred from this review.

Private evidence: `.audit/quality-2026-10-19/recognized-errors-before.log`, `recognized-errors-after.log`, `sensitive-errors-before.log`, `sensitive-errors-after.log`, `ai-grounding-before.log`, `ai-goal-context-before.log`, `ai-grounding-after.log`. These use synthetic failures; provider keys and environment file contents are not included in the report.
