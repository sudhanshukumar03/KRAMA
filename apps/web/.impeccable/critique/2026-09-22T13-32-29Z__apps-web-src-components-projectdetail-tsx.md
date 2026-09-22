---
target_identity: "file:C:\\Users\\sksin\\OneDrive\\Desktop\\Krama\\apps\\web\\apps\\web\\src\\components\\ProjectDetail.tsx"
timestamp: 2026-09-22T13-32-29Z
slug: apps-web-src-components-projectdetail-tsx
---
# Design Critique: ProjectDetail.tsx

⚠️ DEGRADED: single-context (no general sub-agent tool exposed in environment)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good telemetry counters, but quick status updates lack optimistic card indicators. |
| 2 | Match System / Real World | 3 | Mental model of Initiatives and Directives is strong; some linked entity terms feel disconnected. |
| 3 | User Control and Freedom | 2 | Native browser `confirm()` dialog used for destructive deletion; tag removal lacks undo. |
| 4 | Consistency and Standards | 2 | 30 off-ramp font sizes and hardcoded Tailwind palette overrides violate DESIGN.md tokens. |
| 5 | Error Prevention | 2 | Destructive initiative deletion lacks barrier against accidental triggers. |
| 6 | Recognition Rather Than Recall | 3 | Tab counters and telemetry summary row keep vital project metrics visible. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts for tab navigation, quick directives, or inline status switching. |
| 8 | Aesthetic and Minimalist Design | 2 | Warm peach gradient banner and decorative quote widget clash with "The High-Torque Cockpit". |
| 9 | Error Recovery | 3 | Toast errors on mutations; missing retry buttons on failed tab data. |
| 10 | Help and Documentation | 2 | AI diagnostic and strategic OKR selector lack contextual tooltips and guidance. |
| **Total** | | **24/40** | **Needs Work (20–27)** |

## Design Specificity Verdict

**LLM Assessment:**
`ProjectDetail.tsx` demonstrates deep domain fidelity to KRAMA's core thesis—binding documentation, issues, and goals to a single Project entity. However, its visual execution suffers from stylistic schizophrenia. While `DESIGN.md` mandates "The High-Torque Cockpit" (an obsidian, iris-accented developer console with specular rim highlights), this component contains an ad-hoc pastel peach/orange hero banner with an inspirational quote block ("*Organize today, Build a better tomorrow*") featuring a decorative serif quote mark. This looks borrowed from an unrelated consumer journaling app rather than an engineering cockpit. Furthermore, buttons like `Edit Initiative` bypass semantic tokens with hardcoded slate values (`bg-[#1E293B]`, `dark:bg-slate-100`).

**Deterministic Scan (`impeccable detect`):**
- 0 hard anti-pattern violations (no broken contrast or inline style bans).
- 30 advisory notes (`design-system-font-size`): 30 occurrences of literal arbitrary classes (`text-[9px]`, `text-[10px]`, `text-[11px]`) across badges, counters, and metadata, bypassing the canonical typography scale (`text-badge`, `text-caption`, `text-body`).

## Overall Impression
Structurally strong and feature-complete, but visually conflicted. The underlying information architecture and telemetry are excellent; the styling and decorative artifacts contradict KRAMA's defined design system.

## What's Working
1. **Telemetry Grid**: The Open, Done, Issues, Linked Docs, and freshness counters provide instant situational awareness at the top of the initiative.
2. **Tabbed Information Architecture**: Clear separation of concerns between Overview, Board (Kanban), Docs, and Timeline without losing context.
3. **Responsive Grid Layout**: Overview tab cleanly pairs strategic directives, linked deliverables, and habit pacing in a dense 3-column layout.

## Priority Issues

### [P1] Token Bypasses & Pastel Hero Mismatch
- **Why it matters**: The hero banner uses warm orange gradients (`from-[#FFF5EE]`, `dark:from-[#1F1714]`) and hardcoded hex classes (`bg-[#1E293B]`), violating the brand's obsidian/iris dark-mode palette and breaking visual continuity with the rest of KRAMA OS.
- **Fix**: Refactor hero container to use semantic `surface-1` with specular rim highlights (`inset 0 1px 0 0 rgba(255,255,255,0.07)`), iris/accent telemetry badges, and remove hardcoded hexes.
- **Suggested command**: `/impeccable colorize apps/web/src/components/ProjectDetail.tsx` or `/impeccable polish`

### [P1] Off-Ramp Typography (30 Advisory Notes)
- **Why it matters**: 30 instances of arbitrary micro-text (`text-[9px]`, `text-[10px]`, `text-[11px]`) degrade legibility, cause layout jitter, and ignore the canonical typography scale defined in `DESIGN.md`.
- **Fix**: Standardize all metadata tags, counters, and timestamps to semantic `text-badge font-mono` (12px) or `text-caption font-mono` (13px) with tabular numbers (`tnum`).
- **Suggested command**: `/impeccable typeset apps/web/src/components/ProjectDetail.tsx`

### [P2] Decorative Quote Fluff vs. Cockpit Telemetry
- **Why it matters**: The inspirational quote block with serif quotes ("*Organize today...*") adds extraneous cognitive noise and conflicts with the "Restraint over decoration" product principle.
- **Fix**: Replace the quote block with real velocity telemetry (e.g. Milestone pace badge, Sprint burn rate %, or OKR pace differential).
- **Suggested command**: `/impeccable distill apps/web/src/components/ProjectDetail.tsx`

### [P2] Destructive Deletion Pattern
- **Why it matters**: Clicking "Delete Initiative" invokes a synchronous browser `window.confirm()`, blocking the main thread, offering no styled UX, and lacking undo recovery.
- **Fix**: Replace `confirm()` with a themed destructive confirmation dialog or soft-delete with an immediate undo toast.
- **Suggested command**: `/impeccable harden apps/web/src/components/ProjectDetail.tsx`

## Persona Red Flags

**Alex (Technical Solo-Builder / Power User):**
- Cannot jump between Overview, Board, Docs, and Timeline using keyboard shortcuts (no 1/2/3/4 or hotkeys).
- Header search dropdown has no keyboard navigation; requires mouse clicks to select matching initiatives.
- Destructive modal confirmation interrupts flow with native browser prompt.

**Marcus (Engineering Lead):**
- Inspirational quote block feels like amateur template scaffolding rather than an executive engineering dashboard.
- 9px and 10px text elements in task cards and status pills require eye strain on high-DPI displays.

## Minor Observations
- Quick status dropdown menu could use an active checkmark next to the current status.
- Tag adding requires pressing enter with no visible "Add" button fallback for touch/mobile users.
- Sub-initiative tree indicator has subtle alignment drift on nested items.

## Questions to Consider
- What if the hero banner displayed a live SVG burndown sparkline or Pace differential instead of a static quote?
- How much faster would triage be if pressing `B` switched to Board, `D` to Docs, and `T` to Timeline?
