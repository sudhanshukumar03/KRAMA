# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Engineers, technical founders, and solo-builders managing projects, technical documentation, sprint execution, and strategic milestones in an integrated daily workflow.

## Product Purpose

KRAMA OS is a personal operating system for knowledge, execution, and progress. It unifies notes/docs, tasks/sprints, and goals into a single cohesive system centered around the Project entity with real foreign-keyed relational integrity and automated pace measurement.

## Positioning

Unlike fragmented productivity stacks (Notion + Jira + spreadsheets) or generic all-in-one apps, KRAMA provides a dedicated Bridge Layer where the Project entity couples Knowledge (nested docs & rich editor), Execution (Kanban with real dependencies & sprints), and Strategic Goals (required vs. actual pace computed mathematically from snapshots, not subjective estimates).

## Operating Context

- Daily engineering work, sprint planning, and task triage via Kanban boards.
- Long-form RFC and technical documentation drafting with rich block editing and bidirectional links.
- Milestone pacing and habit tracking across Dashboard, Timeline, and Planner views.
- Single-tenant, local-first web application environment.

## Capabilities and Constraints

- **Architecture:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Query, Tiptap, `@dnd-kit`.
- **Backend & Data:** Node.js/Express, PostgreSQL 16 with `pgvector`, Redis (locks/cache/BullMQ), Prisma ORM.
- **Workflow Build Path:** Code-first (direct implementation governed by strict direction contracts and audits).
- **AI Intelligence:** Chokepointed AI Gateway routing through context-grounded RAG (`pgvector`) and output validation.

## Brand Commitments

- **Name:** KRAMA OS
- **Voice:** Restrained, sharp, technical, opinionated, direct, high-craft.
- **Aesthetic:** Dark-mode first, semantic tokens, dense typography, high information-density without visual clutter.

## Evidence on Hand

- Production web application in `apps/web` with completed implementations for Brain (documents/spaces), Execution (Kanban/sprints), and Goals/Habits.
- Architecture and schema documentation in `README.md` and `packages/types`.
- Verified UI screenshots in `docs/screenshots/`.

## Product Principles

1. **Restraint over decoration:** Color and visual weight are used deliberately with full semantic dark mode token hierarchy.
2. **Match structure to data:** The UI reflects mental and data models (e.g., a calendar looks like a calendar, pace is computed).
3. **Distributed where visibility matters, unified where truth matters:** Multi-surface projections backed by a single relational truth.
4. **Verify, don't assume:** Verifiable state, real relational dependencies, and end-to-end reliability.

## Accessibility & Inclusion

- Keyboard navigation across modal dialogs, menus, and Kanban interactions.
- Full color-contrast compliance across semantic dark/light tokens.
- Accessible ARIA labeling on icon buttons, form fields, and status badges.
