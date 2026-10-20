# Documentation

The root [README](../README.md) introduces Krama and explains how to start the local application. Use the guides below when you need to develop a feature, understand a design decision, or investigate an earlier repair.

## Product and design

The [product guide](../PRODUCT.md) describes who Krama is for and how its modules fit into a small daily workflow. The [design guide](../DESIGN.md) defines the shared interface language. The [interface guide](design/interface-guide.md) covers screen composition and interaction, while the [theme token reference](design/theme-tokens.md) maps color roles to the implementation.

Frontend-specific guidance is kept beside the application in [apps/web/DESIGN.md](../apps/web/DESIGN.md) and [apps/web/PRODUCT.md](../apps/web/PRODUCT.md).

## Development and maintenance

The [development guide](development/README.md) covers setup, repository structure, database preparation, test isolation, CI, and common configuration problems. The [migration notes](../apps/server/prisma/migrations/README.md) explain how to deploy the database history. The [holiday data guide](../apps/server/src/services/holidays/data/README.md) explains the annual Indian calendars and their sources.

## History

The [changelog](../CHANGELOG.md) records product changes. The [audit archive](archive/audit/README.md) preserves earlier findings, repair decisions, and verification limits. The [dark-mode discovery notes](archive/design/dark-mode-discovery.md) preserve the observations that preceded the theme work.

Archived reports refer to the revisions reviewed at the time. Read their dates and scope before treating a finding as a current defect. Local editor and assistant tooling is excluded from the application repository and Docker build context.

## Keeping these documents useful

Keep one main document for each subject, link to it from related guides, and update links when files move. Describe observable behavior and give enough context to reproduce a claim. Record historical test results with a revision or date; do not turn them into a general promise that the current application has no bugs.
