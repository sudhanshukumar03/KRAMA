# KRAMA — UI Design Direction Prompt

Use this as the complete design brief for any AI coding agent (or human designer) working on KRAMA's UI. KRAMA spans two very different information types — a writing surface (Brain) and a data-dense operational surface (Execution, Goals, Habits) — so the system needs to flex between "editorial calm" and "dashboard density" without breaking one shared visual language.

---

## 0. CORE PRINCIPLE

Every element on screen must answer at least one of: *What is this? What can I do here? What just happened? What should I do next? Why does this matter?*

Function → hierarchy → aesthetics. Never decoration → decoration → more decoration. If an element can be removed without losing information, remove it.

---

## 1. DESIGN DIRECTION

**Style:** Minimalist premium productivity tool. Monochromatic base, single accent color. The intersection of Linear's restraint and Notion's calm writing surface — never playful, never futuristic.

**Choose one style, don't blend styles (avoid "design soup"):**
- Primary style: **Minimalism**
- Supporting style: **Bento-style modular cards** for the Dashboard only
- One accent technique: a single cool accent color used sparingly

Explicitly *not* using: brutalism, neumorphism, claymorphism, glassmorphism, material-style elevation stacking, or any glass+gradient+glow combination. Two styles is a system; five is noise.

---

## 2. VISUAL HIERARCHY

Control hierarchy with size, weight, color, contrast, position, spacing, alignment, shape, density, and motion — never with color alone.

Each screen gets **1 primary focal point** and **2–4 secondary focal points**. Everything else supports them.

Example — Dashboard "Deep Work Today" stat:
```
2h 45m          ← strongest (size + weight)
Deep Work Today ← secondary (label, muted)
↑ 12m vs yesterday ← tertiary (smallest, muted color)
```
Don't bold every line. If everything is emphasized, nothing is.

**Squint test:** blur your eyes at any KRAMA screen — you should still see the primary metric/action, the section boundaries, and the CTA. If everything reads as equal weight, hierarchy needs rework before shipping.

**Grayscale test:** strip all color from any screen. If it falls apart, the design is leaning on color instead of size/weight/spacing/structure to carry hierarchy. Goal pace badges, priority chips, and habit-heatmap cells must all still be readable in grayscale via icon/label/shape, not hue alone.

---

## 3. SCANNING PATTERNS

- **F-pattern** for text- and data-heavy screens — Dashboard, Sprint View, Backlog tables, Decision Log list, Settings. Put the most important information top-left: today's focus and primary KPI top-left of the Dashboard, not buried center-page.
- **Z-pattern** for simpler, linear flows — onboarding, the Command Palette (search bar top → grouped ranked results below → nothing competing beside it), and any first-run empty-state screen.

---

## 4. GESTALT PRINCIPLES

- **Proximity:** group related fields tightly (e.g. a Goal's target date + target value + owner sit closer to each other than to the next Goal card). Don't spread related fields apart with large gaps.
- **Similarity:** every button of the same importance level shares shape, padding, typography, and hover behavior across Brain, Execution, and Goals — a "Save" button in Brain must look identical in weight to a "Save" button in the Decision Log.
- **Common region:** Kanban cards, KPI cards, and Habit cards are each a bounded container (border + background) — their contents read as one unit because they share a boundary.
- **Continuity:** align Kanban column headers, table columns, and sidebar items to one shared vertical/horizontal grid. Users should feel an invisible grid even when it's not drawn.
- **Figure/ground:** cards must be visibly distinguishable from the page background — don't use the same gray for text, card, border, and background (a common failure mode in monochrome UIs). Maintain at least one deliberate contrast step between background → surface → content.
- **Common fate:** dragging a Kanban card moves the card and its placeholder shadow together, and neighboring cards shift in the same easing curve at the same time — this is what makes drag-and-drop feel physical rather than glitchy.

---

## 5. ALIGNMENT

Left edges, right edges, baselines, and card boundaries must be consistent across a screen. Numeric columns (story points, pace %, streak counts) are right-aligned; text columns are left-aligned. No content should visually "float" off a shared alignment line — the invisible grid should be felt even where no grid lines are drawn.

---

## 6. SPACING SYSTEM

- Default: **8-point system** — 4 / 8 / 16 / 24 / 32 / 40 / 48 / 64 / 96.
  - 4px → icon-to-text micro gaps
  - 8px → inline element gaps
  - 16px → standard internal padding
  - 24px → spacing between components (Kanban cards)
  - 32px → spacing between sections (Dashboard blocks)
  - 48–64px → major page-level separation
- Drop to the **4px grid** (4/8/12/16/20/24/28/32/40/48/64) inside dense components: Sprint tables, backlog rows, the Daily Timeline's hour rail, Habit Tracker's 30-day heatmap cells.
- Consistency matters more than religious adherence to either scale — never mix arbitrary values (7px, 13px, 19px) into either system.

**Whitespace principle:** dense screens (Sprint View, Backlog, Timeline) need *stronger grouping* — tight borders/backgrounds around related clusters — because there isn't room for whitespace to do the separating. Sparse screens (empty Goals view, Brain's blank page) need *stronger composition* — generous whitespace and confident typography — because there's little content to lean on.

---

## 7. CONTAINER WIDTH & RESPONSIVE BEHAVIOR

- Desktop app max content width: **1200–1440px** for Dashboard/Execution/Goals.
- Reading-focused surfaces (Brain pages, Decision Log entries): **600–750px** column width regardless of viewport.
- Design for **mobile, tablet, laptop, and desktop** — don't just shrink the desktop layout. Change composition:

```
Desktop:                          Mobile:
┌──────┬───────────────┐          ┌────────────────┐
│ Side │ Main          │          │ Header + menu  │
│ bar  │  (Kanban:      │          ├────────────────┤
│      │   columns      │          │ Main           │
│      │   side by side)│          │ (Kanban: swipe- │
│      │               │          │  between columns│
└──────┴───────────────┘          │  or stacked)    │
                                   └────────────────┘
```
Sidebar collapses to a bottom nav or slide-over menu on mobile; the Kanban board becomes single-column-at-a-time (swipeable) rather than a horizontally-scrolled shrink of the desktop board.

**One-hand test (mobile):** primary actions — logging a habit, adding a quick task, opening the Command Palette equivalent — must sit within comfortable thumb reach at the bottom of the screen, not require a stretch to a top corner.

---

## 8. NAVIGATION STRUCTURE

**Rule of 5–7:** KRAMA's current top-level surfaces (Dashboard, Brain, Execution, Sprint, Planner, Timeline, Goals, Habits, Review, Decisions) is 10 items — too many for a flat sidebar. Group them:

```
Overview
 └ Dashboard

Plan & Execute
 ├ Execution Board
 ├ Sprint View
 ├ Weekly Planner
 └ Daily Timeline

Strategy
 ├ Goals
 └ Habits

Knowledge
 ├ Brain
 └ Decision Log

Reflect
 └ Daily Review
```
This turns 10 competing flat items into 5 scannable groups, consistent with how the Rule of 5–7 says humans handle simultaneous choices.

**Rule of 3** applies to smaller compositions throughout: a Goal card shows exactly *Metric → Trend → Context*, not five competing data points; a Habit entry shows *Icon → Title → Streak*, nothing more, at a glance.

**Active state** must be visually obvious (accent-colored text/icon + a background tint or left-border indicator), never just a subtle weight change.

---

## 9. TYPOGRAPHY

- One primary typeface: **Inter**, **Geist**, or **IBM Plex Sans**. One optional display face only if a "hero" moment (e.g. onboarding) genuinely needs it — otherwise one font, period.
- Type scale: **12 / 14 / 16 / 18 / 20 / 24 / 32**
  - 12px → metadata, timestamps, table meta
  - 14px → secondary text, table cells, nav labels
  - 16px → body text, Brain editor default
  - 18–20px → component/card headings
  - 24–32px → page headings (Dashboard, Goals overview)
- Weights limited to **400 / 500 / 600 / 700** only. Numbers that matter (pace %, story points, streak counts) get 600–700; their labels stay 400–500.
- Line height: body **1.4–1.6** (critical for the Brain editor's readability); headings **1.1–1.25** (tighter as size increases).
- Letter spacing: default tracking for body; slightly negative tracking (-0.01em to -0.02em) is acceptable on large headings (24px+) for a tighter, more premium feel — never add positive tracking to body text.

---

## 10. COLOR

### Color roles, not raw hex values
Define roles once, reference everywhere — never hardcode a hex value inside a component:
```
--primary
--primary-hover
--primary-active
--primary-muted

--surface
--surface-elevated

--text-primary
--text-secondary
--text-muted

--border
--border-subtle

--success
--warning
--error
--info
```
Full role set: Primary, Secondary, Background, Surface, Border, Text, Muted text, Success, Warning, Error, Info. That's the whole palette — no more.

### Light mode base
Avoid pure black-on-white (`#000000`/`#FFFFFF`) — it reads harsh. Use near-black on off-white:
- `--text-primary` → `#111827`
- `--background` → `#F9FAFB`

### Dark mode — layered, never inverted
Multiple dark surfaces create depth without relying on heavy shadows:
```
--background        #09090B
--surface            #111113
--surface-elevated   #18181B
```
Background → Surface → Elevated Surface, each a step lighter. Command Palette and modals sit on `--surface-elevated`; the Kanban board and page canvas sit on `--background`; cards sit on `--surface`.

### One accent color (Accent Scarcity Rule)
A single primary accent, reserved *only* for: primary buttons, the active nav item, links, and the "today" marker in Planner/Timeline. Once an accent shows up everywhere (random Kanban label colors, decorative highlights) it stops signaling anything — everything else stays neutral gray/near-black.

### 60–30–10 balance (visual weight, not pixel counting)
- **60%** — background/surface neutrals (page canvas, sidebar)
- **30%** — secondary surfaces (cards, table rows, Kanban columns)
- **10%** — the one accent color (primary CTA, active states, links)

### Color temperature
KRAMA should feel calm and trustworthy, not urgent — lean toward a **cool accent** (blue, teal, or indigo) rather than warm (red/orange), since warm hues read as energetic/urgent and would fight the "restraint" identity. Reserve warm hues strictly for Warning/Error states, where urgency *is* the intended signal.

### Semantic status — never color alone
- Goal pace badges (On Track / Ahead / Behind / Stalled) → colored chip **with the text label itself**, not a bare dot.
- Kanban priority/labels → color chip + text, never a color-only swatch.
- Habit heatmap → color intensity encodes density, but the "complete" state also gets an icon on hover/focus, not color alone.
- Binary states (Paid/Failed-style) use ✓/✕ icons reinforced by color, never color alone.

### Contrast targets (WCAG AA — actual ratios, not "color difference")
- Normal body text: **≥ 4.5:1** against its background
- Large text (24px+/bold 18px+): **≥ 3:1**
- UI component boundaries and state indicators (input borders, focus rings, chip outlines): **≥ 3:1**
- Verify both light and dark mode independently.

---

## 11. ICONOGRAPHY

- One icon family only (Lucide, matching the existing stack) — never mix Lucide with Font Awesome, emoji, or random SVGs.
- Consistent stroke width and optical weight across every icon used.
- Size scale: **12px** tiny metadata, **16px** inline with text, **20px** standard UI controls, **24px** navigation, **32px+** reserved for feature/empty-state illustration only.
- When pairing icon + text (`[icon] Settings`), keep them optically balanced — the icon should not visually outweigh the label text next to it.
- Avoid decorative illustrations entirely unless they communicate something specific (e.g. an empty-state illustration hinting at what will appear there) — decoration for its own sake violates the core principle.

---

## 12. BUTTONS & CONTROLS

- Hierarchy: **Primary → Secondary → Tertiary/Ghost → Destructive.** One primary-styled button visible per screen, maximum.
- Sizes: **32px** small (inline/table actions), **40px** medium (default), **48px** large (primary CTAs, onboarding). Touch targets on mobile stay ≥44×44px regardless of visual size.
- Radius system: **4px** small controls/chips, **8px** buttons/inputs, **12–16px** cards/modals/Kanban cards. A card's radius and the buttons inside it must feel like one language — don't pair a 16px card with a 4px button inside it.
- Destructive actions (delete Project, delete Sprint) get the dedicated `--error` color — never the primary accent color.
- Content/labels on buttons are specific actions, not generic verbs: **"Create invoice"** beats "Submit," **"Add habit"** beats "Create," **"Move to Sprint"** beats "Confirm." Users shouldn't have to decode what a button does.

---

## 13. BORDERS, SHADOWS & ELEVATION

- Borders subtle and hairline — used to separate Kanban columns, table rows, sidebar sections. Never used to decorate every box.
- Shadow/elevation system, not random shadow values:
  - Level 0 → page background
  - Level 1 → cards (Kanban cards, KPI cards, Habit cards)
  - Level 2 → dropdowns, Command Palette
  - Level 3 → modals (delete/undo confirmation, Sprint settings)
  - Level 4 → popovers/tooltips
- Deeper layers get progressively stronger visual separation from what's beneath them — never a single flat drop-shadow value reused everywhere.

---

## 14. MOTION

- Standard interaction transitions: **150–250ms**. Larger transitions (panel open, page transition): up to **250–400ms**. Anything longer reads as slow.
- Easing: **ease-out** for elements entering (a new Kanban card appearing, a modal opening); **ease-in** for elements leaving (dismissing a toast, closing a panel).
- Drag-and-drop uses common-fate motion (see Gestalt, above) — the dragged element and displaced neighbors move together in the same curve.
- Microinteractions matter: button hover, checkbox toggle, the "saved" confirmation flash after editing a Brain page, a copy-to-clipboard confirmation on the Decision Log. These make the tool feel alive without being showy.
- Always respect `prefers-reduced-motion` — disable parallax, bounce, and non-essential transitions when it's set.

---

## 15. LOADING, EMPTY & ERROR STATES

- **Loading:** skeletons that match each screen's real layout (Dashboard KPI skeletons, Kanban card skeletons, Timeline row skeletons) rather than a generic spinner — this preserves perceived structure and reduces perceived wait.
- **Empty states** explain what happened, why, and what to do next:
  > *No habits yet.*
  > *Once you add your first habit, it'll show up here — on the Dashboard, your Daily Timeline, and the Habit Tracker.*
  > `[ Add a habit ]`
  Never just "No data."
- **Error states** are specific and actionable, not raw status codes:
  > *Couldn't save this page.*
  > *Check your connection and try again — your changes are kept locally until it saves.*
  > `[ Retry ]`

---

## 16. FORMS

- Group related fields with proximity and spacing, not individual cards per field (e.g. a new-Issue form groups Title/Description together, then Priority/Labels/Assignee together, then Dependencies separately).
- Always use a **visible label above the field**, never a placeholder-only pattern (`Email address` label + example text inside the field, not just placeholder text that disappears on focus).
- Validate at the right time: don't flag errors while the user is still typing — validate on blur/submit, and keep the feedback specific ("Target date must be after the start date," not "Invalid input").

---

## 17. DATA-DENSE SCREENS (Dashboard, Sprint View, Habit Tracker, Execution Board, Backlog)

- Prioritize information density and scannability here — the opposite instinct from the Brain editor's whitespace, and that split is intentional (see Section 6, Whitespace).
- KPI cards follow strict order: **Label → Value → Change/Context** in that visual-weight order. No oversized icon or gradient fill competing with the number itself.
- Charts: simplest type that communicates the point.
  - Line → pace-over-time, burndown trend
  - Bar → velocity comparison across sprints
  - Heatmap → 30-day habit contribution grid
  - Avoid pie/donut entirely — bars compare better with more than a couple categories.
- Chart decoration stripped to essentials: no 3D, no gradients, no decorative shadows, minimal gridlines/legends — the data is the hero, not the chart chrome.
- Tables: numeric columns right-aligned, status as icon+text chip, consistent row height, strict columnar alignment (see Section 5).
- Dependency badges ("blocked by"/"blocking") on Kanban cards stay small, text+icon — not a full-color banner across the card.
- Treat density deliberately: Dashboard is "comfortable," Sprint/Backlog is "compact," and the raw Timeline hour-rail can go "dense" — don't mix density levels randomly within one screen.

---

## 18. WRITING SURFACE (Brain)

- Editorial, not dashboard: 600–750px reading column, generous whitespace, near-monochrome palette with the accent reserved for links/mentions only.
- Breadcrumbs stay small (12–14px) and muted, top-left, clearly subordinate to the page title in visual weight.
- Backlink references (Project/Goal/Issue mentions) render as quiet inline chips, never colored banners.
- Progressive disclosure: page metadata (created date, linked Project, contributors) sits collapsed/secondary below the title, not competing with it — reveal on hover or a small expand action rather than always-on clutter.

---

## 19. PROGRESSIVE DISCLOSURE & INFORMATION ARCHITECTURE

Before any screen is designed, map: **User → Goal → Task → Information → Action.** Don't design the screen first and retrofit the structure.

Apply progressive disclosure throughout:
- A Kanban card shows title, priority, assignee, dependency badges at rest. Full description, sub-tasks, and comment history reveal on open/expand.
- A Goal card shows current progress and pace status at rest; the underlying `GoalProgressSnapshot` history reveals in a detail view.
- A Decision Log entry shows title + outcome at rest; the full context/reasoning/alternatives-considered reveals on expand.

---

## 20. ACCESSIBILITY

Beyond contrast (Section 10), cover the full checklist:
- Full keyboard navigation — every Kanban action, Command Palette function, and form field reachable and operable without a mouse.
- Visible focus indicators on every interactive element (buttons, cards, table rows, nav items) — never suppressed for aesthetics.
- Semantic HTML (real `<button>`, `<nav>`, `<table>` elements, proper heading hierarchy) so screen readers can navigate KRAMA's structure correctly.
- Touch targets ≥44×44px on any touch-capable surface.
- Labels on every form field and icon-only control (aria-labels for icon buttons like the drag handle or the delete icon on a Kanban card).
- `prefers-reduced-motion` respected everywhere (Section 14).

---

## 21. THE 80/20 RULE & CONSISTENCY VS. CONTRAST

About 80% of KRAMA should feel immediately predictable — standard nav patterns, standard form patterns, standard card patterns — so users never have to relearn the basics screen to screen. The remaining 20% (the Pace Engine's projected-completion visualization, the Habit heatmap, the dependency-badge system) is where KRAMA's actual personality and differentiation live. If everything were novel, nothing would feel special; if nothing were novel, the product wouldn't feel considered.

Consistency creates familiarity (shared type scale, color roles, radius, icon family). Contrast creates attention (the one accent color on the one primary CTA per screen). Both are required, not in tension.

---

## 22. THE 3-SECOND TEST FOR KRAMA

On any screen, a returning user should immediately answer:
1. Which layer am I in — Brain, Execution, Goals, or Habits?
2. What's the one number/status that matters most here (pace %, burndown %, streak count, today's focus)?
3. What's the one action I'd take next (add a page, move a card, log today's habit)?

If a screen doesn't pass this at a glance, hierarchy needs rework before adding more features to it.

---

## 23. FINAL QA CHECKLIST

**Layout** — consistent grid □ consistent alignment □ predictable spacing □ responsive composition (not just shrinking) □ correct max content width per surface type

**Typography** — one font family □ consistent type scale □ weights limited to 400/500/600/700 □ readable line height □ clear hierarchy

**Color** — defined roles/tokens, no hardcoded hex in components □ single accent used sparingly □ 4.5:1 / 3:1 contrast verified in both modes □ no color-only status indicators □ dark mode uses layered surfaces, not inversion

**Components** — consistent radius system □ consistent button hierarchy □ one icon family at defined sizes □ elevation system, not random shadows □ consistent borders

**UX** — clear nav with obvious active state, grouped per Rule of 5–7 □ one primary CTA per screen □ useful empty states □ specific, actionable error states □ layout-matching loading skeletons □ progressive disclosure on dense entities

**Accessibility** — full keyboard support □ visible focus states □ semantic HTML □ adequate contrast □ 44px+ touch targets □ labeled controls □ reduced-motion support

**Graphics** — one icon family, one illustration approach (or none) □ no unnecessary decoration □ no gradients/glow/glass/3D □ no visual competition between elements

**Polish** — hover/active/disabled states on every control □ 150–250ms transitions with correct easing □ microinteractions on save/copy/toggle actions □ passes the squint test and the grayscale test □ passes the 3-second test per screen
