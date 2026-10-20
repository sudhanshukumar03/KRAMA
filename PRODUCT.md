# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Krama is designed for a person managing their own projects, technical notes, goals, and recurring habits. Engineers and solo builders are a common fit, but the daily workflow should remain understandable without specialist project-management knowledge.

## Product Purpose

Krama brings knowledge and execution into one workspace. A note can be linked to a project, the project can contain tasks, and those tasks can contribute to a goal. The value comes from these connections and from dependable records of the work already done.

## Positioning

The project focuses on a small daily loop: choose today's work, record progress, and review what needs attention. Detailed planning, document organization, and analysis are available when useful. The product should not require someone to maintain every module each day.

## Operating Context

The primary setup is a personal web application running locally through Docker. Workspace membership and roles still govern access, even when one person is the main user. Multiple workspaces can separate different projects or areas of life.

## Capabilities and Constraints

Brain provides documents and spaces. Projects, tasks, sprints, and the planner support execution. Goals, habits, and focus sessions provide feedback within their own sections, with a compact Dashboard summary. AI assistance depends on configured provider credentials, and image uploads remain Coming soon while R2 is unconfigured.

The current stack uses React 19, Vite 8, Tailwind CSS 4, Express 5, Prisma 7, PostgreSQL with pgvector, and Redis. Public hosting and a custom domain are outside the current setup. Working code, configured providers, and verified workflows are different levels of completion and should be described separately.

## Brand Commitments

Use the name Krama or KRAMA OS consistently. Write directly and calmly. Labels should explain the action, and messages should help someone recover from a problem. Dense screens should remain easy to scan; writing surfaces should leave room to read and think.

## Evidence on Hand

Application code lives in `apps/server` and `apps/web`. Shared schemas are in `packages/validation`, and tests are grouped in the backend and `e2e` directories. The [development guide](docs/development/README.md) explains how to reproduce the checks. Screenshots in `docs/screenshots` are examples of repository UI captures, not proof that every feature is complete.

## Product Principles

Keep information connected through real relationships. Show the result of an action promptly and preserve drafts when a save fails. Derive metrics from recorded activity wherever possible, and distinguish missing data from a recorded zero. Make deeper planning optional so the daily workflow stays small.

## Accessibility & Inclusion

Keyboard operation, visible labels, focus indicators, readable contrast, touch targets, and reduced-motion support are design requirements. Verify them on the affected screens in both themes rather than describing the whole application as compliant without a current review.
