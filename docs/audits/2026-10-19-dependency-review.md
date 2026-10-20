# Dependency review during quality improvement

Status: all 17 original advisories cleared in the post-update registry scan; build and proxy checks passed; broad application/staging verification is in progress. Scope: the installed workspace graph, scanned on 2026-10-19 with `corepack pnpm audit --json`.

The registry returned 17 advisories: 2 critical, 5 high and 10 moderate, affecting 12 package names. Advisory counts describe dependency versions and do not prove an exploitable KRAMA endpoint. Raw findings and dependency paths are retained under ignored `.audit/quality-2026-10-19/dependency-advisories.json`.

| Package / installed version | Context in KRAMA | Planned compatible remediation |
| --- | --- | --- |
| proxy-addr 2.0.7 | Express proxy trust; critical advisory concerns incorrectly broad IPv4-mapped IPv6 subnet matching | Resolve to 2.0.8 and retain origin/proxy/session regression coverage |
| shell-quote 1.10.0 | Concurrently development command tooling; no user-controlled application shell flow identified | Same-major resolution 1.12.0; preserve project commands |
| engine.io 6.6.9 | Socket.IO runtime transport upgrades | Same-major resolution 6.6.11; verify authenticated polling/WSS and worker delivery |
| deepmerge-ts 7.1.5 | Prisma configuration toolchain | Prisma 7.10.1 uses maintained deepmerge-ts 8.0.2; update through parent rather than forcing a major transitive replacement |
| mysql2 3.15.3 | Prisma toolchain, not the application's PostgreSQL driver | Prisma 7.10.1 uses mysql2 3.24.4; verify generation, migrations and deployment |
| qs 6.15.3 | Express/body-parser dependency | Same-major resolution 6.16.1; verify ordinary and malformed request behavior |
| multer 2.3.0 | Authenticated upload parsing; current storage capability is unconfigured | Direct update to 2.4.0; retain clear unavailable/upload-limit behavior |
| ip-address 10.3.1 | Rate-limiter dependency | Same-major resolution 10.7.4; preserve IP/rate-limit/origin tests |
| fast-uri 3.1.7 | Prisma local-tooling AJV dependency | Same-major resolution 3.1.8 |
| nanoid 3.3.16 | CSS/build dependency | Scope the resolution to major 3, target 3.3.20; preserve other majors |
| source-map-js 1.2.1 | CSS/build dependency | Same-major resolution 1.2.2 |
| postcss-selector-parser 6.0.10 | Tailwind typography build plugin; current plugin release still pins version 6 | Review plugin API use and scoped version 7.1.6 override; qualify build output and document typography |

Current generated local staging uses ordinary IPv4 proxy notation. A new isolated Express regression reproduced the advisory behavior with the problematic IPv6 subnet notation before the dependency patch; a correctly mapped subnet is covered by a separate passing guard. This does not establish exploitation of the current staging configuration. Shell quoting is used by fixed development commands rather than a public command-execution endpoint. These observations scope exposure; they do not waive upgrading vulnerable packages.

Prisma client, PostgreSQL adapter and CLI will remain aligned on the verified 7.10.1 patch family. Registry metadata for the global `latest` Prisma CLI points to an 8.0 release candidate, which is outside this pass's compatibility scope. No framework migration is needed for these fixes.

Dependency installation waits for the currently running browser suite to finish. Preserve package/lockfile snapshots, install without automatic lifecycle execution, regenerate Prisma explicitly, and then verify the frozen lockfile, build, unit/integration/browser suites and HTTPS production images. Record post-update audit results before calling any finding resolved.

Sources: [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [Engine.IO advisory](https://github.com/advisories/GHSA-2gc4-cqfq-p2gv), [DeepmergeTS advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [selector-parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). Exact parent dependency metadata was read from the npm registry and retained in the local audit directory.

## Implemented result

Prisma client/adapter/CLI are aligned on 7.10.1. Multer is 2.4.0. Root overrides restrict fixes to the existing compatible major families, with the selector-parser 7.1.6 change scoped to Tailwind typography 0.5.20. The regenerated lockfile passes an offline frozen install. The proxy regression failed before the patch and all five proxy cases passed afterward. The new audit reports zero info/low/moderate/high/critical advisories.

All-package build passed. The six generated production CSS files have byte-identical contents before and after dependency updates, supporting compatibility of the scoped selector-parser change. This comparison was performed before the subsequent Goal status-label correction. Dependency audit checks are wired locally into CI at high/critical severity; remote activation remains pending.

Final acceptance on 2026-10-20 again reported no known vulnerabilities. Fresh production images passed all 26 HTTPS staging checks; workflow syntax passed actionlint 1.7.7. This package audit does not establish the absence of undisclosed vulnerabilities or scan container OS packages.
