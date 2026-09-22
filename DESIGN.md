---
name: KRAMA OS
description: A high-density personal operating system for knowledge, execution, and progress
colors:
  accent: "oklch(0.72 0.15 262)"
  accent-hover: "oklch(0.78 0.15 262)"
  accent-active: "oklch(0.85 0.15 262)"
  accent-subtle: "oklch(0.72 0.15 262 / 0.15)"
  bg-base: "oklch(0.18 0.01 262)"
  bg-subtle: "oklch(0.22 0.01 262)"
  surface-1: "oklch(0.25 0.01 262)"
  surface-2: "oklch(0.28 0.01 262)"
  surface-3: "oklch(0.32 0.01 262)"
  text-primary: "oklch(0.98 0.01 262)"
  text-secondary: "oklch(0.82 0.02 262)"
  text-muted: "oklch(0.66 0.02 262)"
  border-subtle: "oklch(1 0 0 / 0.05)"
  border-default: "oklch(1 0 0 / 0.1)"
  border-strong: "oklch(1 0 0 / 0.2)"
  success: "oklch(0.8 0.1 145)"
  warning: "oklch(0.85 0.1 65)"
  danger: "oklch(0.8 0.12 25)"
  info: "oklch(0.8 0.1 240)"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "-0.011em"
  caption:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.05em"
rounded:
  control: "4px"
  btn: "8px"
  input: "8px"
  card: "14px"
  dialog: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.btn}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.btn}"
    padding: "11px 20px"
  card:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.input}"
    padding: "10px 14px"
---

# Design System: KRAMA OS

## Overview

**Creative North Star: "The High-Torque Cockpit"**

KRAMA OS is engineered as a high-density, dark-mode-first operating system for technical solo-builders and engineers. Rather than imitating generic, air-filled SaaS templates with pastel blobs or nested cards, KRAMA treats screen space with the gravity and precision of an aircraft telemetry console or specialized developer instrument.

Every pixel serves clarity, focus, and rapid execution. Visual weight is earned through purposeful contrast, luminous iris slate typography, and specular micro-rim highlights that subtly distinguish nested planes. The interface recedes to spotlight work, emerging only to deliver unambiguous pace metrics, status telemetry, and responsive tactile controls.

**Key Characteristics:**
- **Dark-First Telemetry:** Deep obsidian surfaces (`oklch(0.18 0.01 262)`) with mathematically layered luminance increments (`surface-1`, `surface-2`, `surface-3`).
- **Precision Tactile Response:** Active button compression (`scale(0.98)`), specular rim lighting (`inset 0 1px 0 0 rgba(255,255,255,0.07)`), and tight physical transitions (`150ms cubic-bezier(0.16, 1, 0.3, 1)`).
- **Dual-Register Typography:** Editorial clarity in prose via Inter, balanced by rigorous tabular monospace numerals and uppercase tags for status badges and dates.

## Colors

The palette is rooted in cold, chromatic iris-slate neutrals punctuated by a high-energy violet accent and calibrated status beacons.

### Primary
- **Luminous Iris Accent** (`oklch(0.72 0.15 262)`): Reserved for primary calls-to-action, active interactive states, focus rings, and verified milestone completions. Never used as general decoration.

### Neutral
- **Obsidian Base Canvas** (`oklch(0.18 0.01 262)`): The deep background plane anchors the entire application.
- **Surface 1 / Card** (`oklch(0.25 0.01 262)`): Structural resting layer for cards, sidebars, and panels.
- **Surface 2 / Hover** (`oklch(0.28 0.01 262)`): Elevation step triggered on hover, active selection, and secondary control wells.
- **Surface 3 / Floating** (`oklch(0.32 0.01 262)`): Modal dialogs, popovers, and floating toolbars.
- **Text Primary** (`oklch(0.98 0.01 262)`): Crisp luminous white text for headlines and critical directives.
- **Text Secondary** (`oklch(0.82 0.02 262)`): Tinted silver text for body copy, descriptions, and labels.
- **Text Muted** (`oklch(0.66 0.02 262)`): Soft legible slate for metadata, timestamps, and shortcuts.
- **Alpha Borders** (`oklch(1 0 0 / 0.05)` subtle, `oklch(1 0 0 / 0.10)` default, `oklch(1 0 0 / 0.20)` strong): Zero static gray borders; all outlines use alpha washes over the underlying tone.

### Status Telemetry
- **Emerald Velocity** (`oklch(0.8 0.1 145)`): Completed tasks, on-track pace milestones, and success toasts.
- **Amber Warning** (`oklch(0.85 0.1 65)`): At-risk pace indicators, impending deadlines, and caution states.
- **Crimson Danger** (`oklch(0.8 0.12 25)`): Critical blockers, overdue deadlines, and destructive actions.
- **Cyan Signal** (`oklch(0.8 0.1 240)`): System notifications, active telemetry streams, and informational pills.

### Named Rules
**The Rarity of Iris Rule.** The primary accent is deployed on less than 10% of any viewport surface. When an element is Iris, it commands immediate, undeniable focus.

**The Alpha Border Rule.** Never use opaque gray borders (`#333` or `#444`). All borders must use white alpha transparencies (`oklch(1 0 0 / 0.1)`) so they blend naturally into whatever surface plane they enclose.

## Typography

**Display Font:** `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
**Body Font:** `Inter`, sans-serif
**Mono / Telemetry Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Character:** Technical, crisp, and dense. Body text uses OpenType features (`cv02`, `cv03`, `cv04`, `cv11`, `tnum`) with negative tracking for compact legibility. Numerical telemetry always uses tabular figures (`tnum`).

### Hierarchy
- **Display** (Bold 700, 24px, line-height 32px, tracking -0.025em): Page headers, major initiative titles.
- **Headline** (Bold 700, 20px, line-height 30px, tracking -0.025em): Modal headers, primary container titles.
- **Title** (SemiBold 600, 18px, line-height 28px, tracking -0.02em): Section dividers, column headers.
- **Body** (Regular 400, 15px, line-height 24px, tracking -0.011em): Ticket descriptions, long-form RFCs, document pages. Max line length: 68ch.
- **Caption** (Medium 500, 13px, line-height 20px): Form labels, auxiliary table text, secondary list items.
- **Telemetry Label** (Mono SemiBold 600, 12px, line-height 16px, tracking 0.05em uppercase): Status badges, commit hashes, estimates, and dates.

### Named Rules
**The Tabular Number Rule.** All numerical indicators (sprint velocity, pace percentages, time estimates, countdowns) must enforce `font-feature-settings: 'tnum'` to prevent layout jitter during live updates.

## Layout

- **Grid & Model:** High-density responsive flexbox and grid layouts. Max container width capped at 1440px for dashboards; full-bleed with slim sidebars for Kanban and document workspaces.
- **Spacing Scale:** Multiples of 4px / 8px (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`). Density favors tight spatial groupings over sprawling whitespace.
- **Sidebar & Shell:** Fixed left navigation with icon + compact text, zero outer corner radius (`radius-sidebar: 0px`).
- **Scrollbars:** Ultra-slim floating 6px scrollbars with transparent track and border-matched thumb.

## Elevation & Depth

KRAMA relies on **tonal luminance layering** rather than heavy blurred drop shadows. Higher planes receive higher lightness values (`bg-base` < `surface-1` < `surface-2` < `surface-3`).

### Shadow Vocabulary
- **Resting Specular** (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.07)`): The signature card treatment providing a metallic top rim highlight.
- **Hover Lift** (`box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06), inset 0 1px 0 0 rgba(255,255,255,0.09)`): Applied dynamically when hovering over cards and interactive panels.
- **Modal Depth** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)`): Reserved exclusively for floating dialogs and quick-capture overlays.

### Named Rules
**The Specular Rim Rule.** Elevated cards in dark mode must carry a 1px white alpha inset border at the top (`inset 0 1px 0 0 rgba(255,255,255,0.07)`), mimicking the physical reflection of an overhead workbench light source.

## Shapes

- **Form Language:** Architectural, crisp, and consistent.
- **Controls & Chips:** 4px radius (`--radius-control: 4px`).
- **Buttons & Inputs:** 8px radius (`--radius-btn: 8px`).
- **Cards & Boards:** 14px radius (`--radius-card: 14px`).
- **Modals & Dialogs:** 16px radius (`--radius-dialog: 16px`).
- **Pills & Avatars:** Fully circular (`rounded-full`).

## Components

### Buttons
- **Shape:** 8px radius (`--radius-btn`).
- **Primary:** Iris accent (`var(--color-accent)`) with white text, 1px transparent border, and resting shadow. Transitions background on hover (`var(--color-accent-hover)`).
- **Secondary:** Surface-1 background with primary text and 1px default border. Transitions to surface-2 and strong border on hover.
- **Ghost:** Transparent background with secondary text; washes to state-hover on interaction.
- **Tactile Click:** All active buttons physically compress: `active:scale-[0.98]` via 150ms ease-out spring.

### Cards / Containers
- **Corner Style:** 14px radius.
- **Background:** `surface-1` at rest.
- **Border:** 1px `border-default` (`rgba(255,255,255,0.1)`).
- **Specular Highlight:** Inset 1px white rim.
- **Padding:** 16px to 20px internal gutter.

### Inputs / Form Fields
- **Style:** `surface-1` background, 1px `border-default`, 8px radius, placeholder in muted slate.
- **Focus:** 2px ring outline in Iris accent (`var(--color-ring)`) with 2px outline-offset.

### Categorical Badges & Chips
- **Style:** Compact 32x32 icon chips or 4px-radius badges with 12% alpha tinted background matching the categorical domain (Blue for Tasks, Purple for Routines, Teal for Timeblocks, Orange for Projects).

### Modals & Dialogs
- **Backdrop:** Deep backdrop blur (`backdrop-blur-[2px]` over `rgba(0,0,0,0.5)`).
- **Container:** `surface-3` elevated plane with 16px radius, strong border, and deep drop shadow.

## Do's and Don'ts

### Do:
- **Do** use `font-mono` with uppercase tracking for status badges, commit hashes, estimates, and dates.
- **Do** maintain the specular rim highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.07)`) on all elevated cards.
- **Do** compress active interactive controls using `scale(0.98)` for physical tactility.
- **Do** use OKLCH semantic variables (`--surface-1`, `--text-primary`, `--accent`) instead of arbitrary hardcoded color hexes.
- **Do** preserve tabular numbers (`tnum`) across all telemetry, timers, and pace indicators.

### Don't:
- **Don't** use opaque solid gray borders (`#2e2e2e`); always use alpha transparencies over the surface.
- **Don't** flood entire cards or headers with bright accent fills; save Iris for interactive triggers and key indicators.
- **Don't** use slow, sluggish animations; keep transitions bounded between 100ms and 200ms with snappy easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Don't** insert floating decorative gradients or generic pastel blobs that dilute the utilitarian instrument aesthetic.
