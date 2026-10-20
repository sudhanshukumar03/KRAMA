# Audit history

This archive records the September 2026 code review and the repairs and verification that followed in October. It explains why changes were made and preserves the original issue identifiers. Findings describe the code at the time of each review; they are not a list of defects to apply again to the current application.

For current installation and testing instructions, use the [development guide](../../development/README.md). The [documentation index](../../README.md) links to the current product and design guides.

## The original review

The [reality audit](reality-audit.md) compared advertised features with actual writers, readers and execution paths. The [architecture risk register](architecture-risks.md) explains the resulting priorities, including three retracted findings. The [documentation corrections](documentation-corrections.md) record mistakes found in the repair instructions themselves.

The older [architecture illustration](../../diagrams/architecture.svg) is retained as an archive asset. Some capabilities shown in it were proposed rather than implemented. The repository README describes the current architecture.

## Repair records

Each record describes the problem, the chosen repair and the limits of the recorded verification.

| Topic | Record |
| --- | --- |
| Authentication and workspace selection | [01 — Authentication](remediation/01-auth-workspace.md) |
| Membership, roles and resource isolation | [02 — Security](remediation/02-security.md) |
| AI providers and document retrieval | [03 — AI and retrieval](remediation/03-ai-retrieval.md) |
| Task boards and sprints | [04 — Boards and sprints](remediation/04-boards-sprints.md) |
| Planner dates, routines and holidays | [06 — Planner and calendar](remediation/06-planner-calendar.md) |
| Goal progress and habit checkoffs | [07 — Habits and goals](remediation/07-habits-goals.md) |
| Domain events and socket updates | [08 — Realtime events](remediation/08-realtime.md) |
| Reporting and dashboard controls | [09 — Dashboard and analytics](remediation/09-dashboard-analytics.md) |
| Obsolete code and dependencies | [10 — Code cleanup](remediation/10-code-cleanup.md) |
| Focus sessions and timer layouts | [11 — Focus](remediation/11-focus.md) |
| Schema changes and migration safety | [12 — Database](remediation/12-database.md) |

The original index referred to a fifth chapter about the knowledge base, but that file was absent from the documentation set. The numbering is retained so existing issue references remain recognizable; no replacement chapter has been invented.

## Why the repair order mattered

Schema changes and reviewed backfills had to precede writes that depended on them. Membership and role checks needed to be in place before new endpoints were added. Event delivery had to move outside database transactions before more subscribers could safely consume it.

Cleanup followed reference checks and replacement work. In particular, the old focus widget could only be removed after the new Focus page was available. These dependencies were more useful than treating every topic as an independent checklist.

## Recorded verification

A later quality pass recorded 25 validation tests, 89 backend unit tests, 50 integration tests, 43 default browser checks and 61 live browser checks. The live set included four checks using configured AI providers. These totals describe that run and its fixtures; they are not a guarantee about every possible workflow or later revision.

The subsequent hosted CI run for commit `57ea8bc24bad472ce5e3add3eb1a4def18b0a52a` passed both application verification and production image builds: [GitHub Actions run 38076348237](https://github.com/sudhanshukumar03/KRAMA/actions/runs/38076348237). The changes were prepared in [pull request 5](https://github.com/sudhanshukumar03/KRAMA/pull/5). Whether they are present on another branch depends on its commit history.

R2 uploads remain marked Coming soon, and public hosting is outside the personal workspace setup. A passing audit or CI run does not establish that the application has no remaining bugs.
