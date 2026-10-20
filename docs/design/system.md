# KRAMA interface system

Canonical specification for the quality improvement pass, 2026-10-19. Implementation begins with Goal detail and shared confirmation/text-field primitives. Other screens remain under migration until verified in the [work register](../development/quality-work-register.md).

## Product direction

Make the sequence capture -> choose -> plan -> focus -> review feel clear and dependable. Keep the existing KRAMA mark, Inter family, Iris accent, neutral surfaces, habit glyph and user-approved landing content. The colored hero topic retains black text; the blue Explore action retains white text.

The working content carries the visual interest. Present a task, note, goal or plan before secondary statistics. Use one primary action within a task context, quieter supporting actions, and visible save/recovery feedback.

## Host inspection for the Goal pilot

| Concern | Existing host evidence |
| --- | --- |
| Framework | React 19.2 / Vite 8.1; `apps/web/package.json` |
| Route | React Router 7.18, `/app/goals?goal=<id>`; `App.tsx`, `AppShell.tsx`, `Goals.tsx` |
| Components | BaseButton, IconPicker, ErrorState, ConfirmDeleteButton, `useModalA11y`; `src/components/ui`, `src/hooks/useModalA11y.ts` |
| Data | React Query 5.101 and typed domain adapter; `useGoalDetailModel.ts`, `api/goalsApi.ts` |
| Tokens/theme | Semantic CSS variables and persisted theme; `styles/theme.css`, `lib/theme.ts` |
| Tailwind | Version 4.3 compiled through `@tailwindcss/vite`; `vite.config.ts` |
| Icons | Existing Lucide family 1.26; `package.json`, `lib/iconResolver.ts` |
| Additional runtime | None; reuse semantic HTML, React, existing focus management and CSS |

## Goal pilot composition

Job: understand a goal, update its settings/progress and preserve work when interrupted. Primary action: save a check-in or settings in the relevant view. Archetype: a focused detail drawer with a single scrollable working area.

| Region | Purpose | Published component | State/handoff |
| --- | --- | --- | --- |
| Header | Full readable identity, status and secondary actions | none | Stable geometry, native status selection |
| Overview | Progress, motivation and connected work | none | Loading, populated and partial failure |
| Settings | Edit title, category, motivation and date | none | Dirty -> pending -> saved/error; draft retained |
| Check-in | Update progress/current value and reflection | none | Independent dirty revision and save result |
| Confirmation | Deliberate discard or continued editing | none | Initial safe action focus; Escape/backdrop cancel |

Registry: no components installed. Existing host controls cover these behaviors without an additional animation dependency. Motion Lexicon guidance informs continuity, focus and reduced motion; the palette and typography remain KRAMA's.

Responsive: full-width at 320/390px; bounded drawer at 768/1440px. Both themes use the same semantic roles. Reduced motion removes arrival travel while retaining state and focus handoffs. Detailed acceptance evidence is recorded in the implementation report; a specification is not a passing result.

## Tokens and hierarchy

`apps/web/src/styles/theme.css` is the source of truth for colors. Reuse `--text-primary`, `--text-secondary`, `--text-muted`, `--surface-*`, `--border-*`, `--accent*` and semantic status colors. Do not copy alternate color values from historical documents into feature code.

| Role | Standard |
| --- | --- |
| Page title | 28px/36px desktop, 24px/32px phone; weight 600-650 |
| Detail/dialog title | 20-22px, line height 1.35-1.4; full wrapping and word-break fallback for user content |
| Section heading | 16-17px/24px, weight 600 |
| Workspace body | 14px/22px; text-heavy prose may use 16px/26px |
| Field labels/actions | 14px, weight 500-600; sentence case except established product names |
| Supporting text | 13px/20px; compact metadata 12px minimum in the pilot |
| Phone inputs | 16px text with 44px minimum control height |
| Numeric data | Proportional interface font with tabular numerals where comparison/alignment helps |
| Spacing | 4, 8, 12, 16, 24, 32 and 48px; proximity expresses relationship |
| Gutters | 24-32px desktop, 16px phone; align headers, toolbars and working surfaces |
| Shape | 8px controls, 12-16px working panels, 16-18px temporary dialogs |
| Elevation | Compact boundaries for work surfaces; stronger shadows reserved for temporary overlays |

Landing page display type and document prose retain their separate reading roles. The detailed historical landing typography remains context; this document resolves conflicting workspace values in earlier redesign notes.

## State and interaction contracts

- Buttons expose disabled/pending state and preserve their label's context. Do not report success before the write is acknowledged.
- Fields have visible associated labels, accessible names, useful hints/errors and stable height. An error is described in text and connected with `aria-describedby`.
- Confirmation defaults to the safe action. Escape, outside click and cancellation preserve unsaved work. Confirmation continues the originally requested action once.
- Dialogs own focus while open, return it to a connected opener, and preserve nested-dialog ordering. Background controls become inert while a nested confirmation is active.
- Human-readable status and source labels accompany color. Native selects have explicit foreground/background colors in both themes.
- Interactive target is 44x44 CSS px for the pilot. A compact visual glyph may occupy less space inside that target.
- Progress sliders have a visible focus treatment, accessible label and sufficient pointer/keyboard target. Supporting pace details use an accessible native disclosure.
- Arrival feedback uses opacity/transform over roughly 160-200ms. No decorative looping, pulsing status dots or global `transition: all` is added.
- Long content wraps; dense boards and calendars may scroll inside their working surface. Content must remain usable with text enlargement and zoom.

## Acceptance and migration

For every migrated screen, review empty/populated/error states in both themes, required widths, keyboard paths, visible focus, actual target geometry and pending/failure recovery. Inspect captures and actual behavior before accepting a screenshot baseline.

The Goal pilot has focused cases for long-title clipping, 320/390/768/1440px geometry, mobile field text size, discard/cancel/Escape and return focus, plus existing goal-switching, unsaved-section independence and stale-version regressions. Build, lint/type and live verification remain required. Screen-reader speech and physical devices remain explicitly unverified until executed.

Existing `workspace-redesign.md` and `typography-and-voice.md` document prior decisions. They remain useful context; migrated components use this consolidated system and the implemented semantic tokens.

## Shell, search and large-list composition

Host inspection: the same React/Vite, Router, React Query, semantic tokens and Lucide stack above; routes remain inside `AppShell`. Existing `CommandPalette` uses cmdk and `useModalA11y`. The AI conversation remains the existing `AIAssistant`; no new component package or runtime is installed. Published registry component IDs: none.

| Surface | Job / primary action | Composition and state handoff |
| --- | --- | --- |
| Sidebar | Reach a workspace area | Stable navigation with scoped count badges; unavailable counts disappear without disabling navigation |
| Global search | Open a page or matching record | One input, module matches, bounded recent/result groups; input -> pending -> results/empty/error; aborted requests cannot replace newer results |
| Task lists/board | Find and act on work | Existing task cards/rows, 50-item visible pages, count and native Previous/Next; explicit page change focuses new content |
| Brain tree | Open a note | Bounded root/child/favorite lists; a deep link reveals its branch and page |
| AI entry | Ask about work | Desktop sidebar/footer or collapsed-header action, mobile header action; close returns focus to a connected entry |

Keep content geometry stable during loading and use existing restrained search arrival motion. Reduced motion removes travel; focus and status feedback remain. Paging is immediate and does not animate across large datasets. The tested shell/paging matrix covers 320/390/768/1440px and both themes; full visual, screen-reader and human usability migration remains open.

## Planner task-list refinement

Host: existing `TodayTasks` view and `useTodayPlanner` request/write owner, existing `PaginatedItems`, native buttons/inputs and semantic theme tokens. Registry IDs: none; no added runtime. The job is to identify a task and choose completion, Focus, editing or scheduling without hiding the title behind secondary actions.

Task rows place the wrapping 14px title and 12px date/priority details above a visible secondary action row. Controls provide 44px targets, phone text inputs use 16px, and completed rows retain readable controls. Date labels derive from the selected calendar day; “today” appears only for the actual current day. Day, backlog and carried-over lists mount 50 rows at a time, expose counts and native paging, and keep search over the full backlog. Existing requests, optimistic versions and scheduling policy remain owned by the hook.

State handoffs: idle -> pending/saved/error remain the existing mutation flow; explicit page changes transfer focus to new content through the shared pager. Search retains input focus. Critical actions are visible in pointer and keyboard states. Changes use color feedback only, with no added arrival or looping motion.

Acceptance: title-clipping cases failed before repair at 390/1440px in both themes; the final seven focused cases passed geometry/keyboard visibility, historical date wording, and paging/search across 450 synthetic tasks. The final complete mocked/frontend run passed 262 cases. Final phone-light and desktop-dark captures were inspected; backend/live/HTTPS and real-device acceptance remain separately recorded in the [verification ledger](../audits/2026-10-20-quality-verification.md).
