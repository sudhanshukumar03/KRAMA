# Configuration verification - 18 October 2026

The saved work was reviewed after the interrupted sessions. The local application is available at `http://127.0.0.1:5173`, and the API at port 3000 reports ready. This review checks configuration and the public landing/film flow; it is not a new complete live application audit.

## Findings fixed

| Finding | Change |
| --- | --- |
| Root scripts invoked the laptop's global pnpm 11 despite the project's pnpm 9.15.0 pin. The first production test command failed with a version mismatch. | Nested workspace commands now use `corepack pnpm`. Root build, lint and the production landing command subsequently succeeded. No global installation was changed. |
| Production Nginx served captions as `application/octet-stream`. | WebVTT files under `/landing/` now use `text/vtt`. The real-caption browser journey asserts that response type. |
| Missing movies and JavaScript fell through to `index.html`, returning HTTP 200 or a partial HTML response for a video range request. | `/assets/`, `/brand/` and `/landing/` require existing files and return 404 when absent. App routes retain the SPA fallback. |
| The combined production landing configuration lived only under local `.audit/`. | Added root `playwright.landing.config.ts` and `corepack pnpm test:landing`. The command rebuilds before testing. It supports a validated local HTTP target for Nginx verification, otherwise starts its own production preview. |
| The environment template selected port 8080 but used a portless frontend URL, and supplied fake optional provider keys. | Matched `FRONTEND_URL` to port 8080 and left optional provider keys blank. Private environment files were not changed. |
| Generated audit outputs and downloaded tooling were visible to Git. | `.audit/` is now ignored by Git; Docker already excluded it. Reusable configuration and this report remain outside that folder. No evidence files were deleted. |

## Verification

- Root `corepack pnpm build`: all four workspace packages passed, including backend and frontend TypeScript and the production bundle.
- Root `corepack pnpm lint`: passed.
- Root browser/config TypeScript check: passed.
- Both Compose files: `config --quiet` passed, without printing resolved secrets.
- Prisma: two migrations found, database schema up to date. No migrations were applied during this review.
- PostgreSQL and Redis: healthy. Host/container connection settings and passwords match; both private signing secrets match and are 96 characters. Only sanitized presence/consistency summaries were inspected.
- Current frontend and `/ready`: HTTP 200. The frontend API proxy returns the expected unauthenticated 401 at `/api/v1/auth/me`.
- Nginx syntax: passed. A temporary loopback container served the current frontend build with the current Nginx configuration, using an existing Nginx image and read-only mounts. This was not a fresh Docker image build or a production deployment.
- Twelve production HTTP checks passed: root and deep route, all four film variants returning correct video MIME and 206 byte ranges, WebVTT MIME, four missing static resources returning 404, and proxied readiness.
- Full landing/film browser run through Nginx: **38 passed, four explicitly skipped, zero failures**, one worker, no retries, about 2.1 minutes. Chromium and Firefox verified actual media playback, captions, seeking, fallback and failure recovery. All three engines covered layout and keyboard behavior.
- Default production-preview configuration: an additional real-caption/keyboard-seek smoke test passed. Configuration discovery lists all 42 cases.

Commands and configuration are documented in [the development guide](../development/README.md). Local evidence: `test-results/landing-results.json`, `.audit/configuration/ingress-results.json`, and the landing measurement/screenshot folders. Generated evidence is intentionally not project source.

## Remaining work and limits

- R2 is absent in both private environment files. Successful image uploads need real bucket credentials and an upload check; the disabled-upload state remains expected. Unsplash is also unset and optional. AI and holiday provider keys are present, but this review did not send fresh requests to those providers or establish their current quota/key validity.
- Four Windows WebKit media tests remain skipped because that runner does not decode these files. Actual Safari playback requires macOS or iOS. Physical Android/iPhone checks and human screen-reader listening remain unverified.
- The earlier overnight Focus test was interrupted when its tab closed. Actual physical laptop sleep/wake remains unverified; simulated time gaps and short real sessions are separate evidence.
- The broader application live suite was not rerun here against this final source. Earlier workflow results remain historical evidence; these 38 passes cover the public landing and intro film.
- Hosted deployment remains outside the user's localhost-only scope. Container users must rebuild the web image to receive the corrected Nginx rules.

Personal workspace records, credentials, Focus tabs and the running application services were not changed by this review. The temporary audit container was stopped afterward.
