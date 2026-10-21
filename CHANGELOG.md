# Changelog

This file records dated product changes.

## Unreleased

The audit branch contains workspace authorization, persistence, authentication, reporting, and configuration repairs. CI covers validation, backend tests, browser regressions, type checks, and production image builds. These changes are tracked in [PR #5](https://github.com/sudhanshukumar03/KRAMA/pull/5); their presence on the default branch depends on the PR's merge state.

Setup and release verification guides are kept under `docs/`.

Dependency cleanup removes redundant root and server packages and repository copies of assistant tooling. Docker installs are scoped to each application, and frontend API contracts no longer depend on Prisma generation.

## 2026-08-26

Quick Capture was connected to task creation and default scheduling.

## 2026-08-25

Habits gained planner pinning, alongside updates to the habit tracker.

## 2026-08-24

Work began on the planner matrix and its layout.
