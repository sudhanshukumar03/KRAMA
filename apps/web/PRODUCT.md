# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The frontend serves people using Krama as a personal workspace for notes, projects, daily planning, and progress review. The shared [product guide](../../PRODUCT.md) is the source for product scope and priorities.

## Product Purpose

Help the user understand today's work, act on it, and see what persisted. Shared records should remain consistent when the user moves between Brain, Projects, the execution board, Planner, Goals, Habits, and Focus Mode.

## Positioning

Keep the daily workflow small. Show deeper planning and analysis when the user needs them, with clear links back to the work behind each summary.

## Operating Context

The frontend lives in `apps/web` and connects to the API through REST and Socket.IO. Its state comes from TanStack Query, the authentication context, and feature-specific hooks. Local preferences such as theme selection should remain distinct from server-owned records.

## Capabilities and Constraints

AI actions depend on the backend's provider configuration. Upload controls should explain that uploads are Coming soon while storage is unavailable. Failed writes should retain user input and provide an explicit retry or conflict resolution path.

## Brand Commitments

Use the shared product guide's naming and voice. Action labels and recovery messages should use ordinary language that explains what will happen.

## Evidence on Hand

Frontend components and hooks are in `src`, while browser checks are in the root `e2e` directory. The [development guide](../../docs/development/README.md) explains which checks use mocked responses and which require a live backend.

## Product Principles

Present one clear next action, keep navigation predictable, and use the same words for the same entities across screens. Avoid replacing the shared product guide with a second copy of its feature list.

## Accessibility & Inclusion

Follow the [frontend design guide](DESIGN.md) for keyboard controls, dialog behavior, form labels, responsive layouts, and reduced-motion support.
