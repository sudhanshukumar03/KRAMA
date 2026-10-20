# KRAMA UI design audit and rating — 18 October 2026

Overall: **7.9/10**. Light: **7.8/10**. Dark: **8.0/10**. These are subjective design judgments, not a calculated accessibility score or certification. Dark mode has slightly stronger visual depth; the same navigation, density and mobile problems affect both themes.

## Scope and method

Reviewed the local running React app using isolated synthetic records from `scripts/media/example-workspace.ts`. Covered landing, Dashboard, Inbox, Tasks, Planner week/day, Goals, Habits, Projects, project detail, Brain and Focus at 1440x900 and 390x900 in light/dark: **48 page views**. Also opened five creation dialogs in each theme at 390x844 (**10 dialog states**) and the search palette in each theme. No forms were submitted and no real records or product source files were changed.

Fourteen browser inspection tests completed (13 capture/measurement tests plus one finding-confirmation test). This means the audit ran successfully; it does not mean the design is free of defects. Measurements found no document-level horizontal overflow or controls below the project's 44x44 target in the initially visible page samples. All ten dialogs fit horizontally, retained initial Tab focus, closed with Escape and returned focus to their trigger. Zero page exceptions occurred in the captured views. This is Chromium desktop/mobile viewport emulation, not a physical-phone, screen-reader or full WCAG audit. Keyboard verification covered those sampled dialog paths, not every control.

Visual/interaction baseline: [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) and the installed UI/UX Pro Max guidance. Contrast candidates were sampled from computed text/background colors, compositing ancestor backgrounds. Image-backed/translucent text was excluded from numeric conclusions and inspected visually. Decorative breadcrumb separators are not treated as failing meaningful text. Disabled states were excluded.

## Ratings by area

| Area | Light | Dark | Main assessment |
| --- | ---: | ---: | --- |
| Landing | 8.6 | 8.7 | Clear hierarchy, product-first content, coherent examples and restrained palette |
| Dashboard | 8.0 | 8.2 | Strong next-task emphasis; repeated focus actions and many bordered cards compete |
| Inbox | 8.1 | 8.3 | Clear capture/organize flow in isolation; oversized route-specific shell hurts app consistency |
| Tasks | 7.8 | 8.0 | Understandable board; dense metadata and engineering vocabulary remain |
| Planner | 6.8 | 7.0 | Compressed labels, large sparse week cells, repeated date headings and weak phone composition |
| Goals | 7.8 | 8.0 | Useful progress structure; many filters, labels and status styles compete |
| Habits | 8.0 | 8.2 | Clear completion control and visible history; metadata and tiny counts add noise |
| Projects including detail | 7.5 | 7.8 | Functional organization, but engineering terminology and heavy card nesting reduce personal-workspace clarity |
| Brain | 7.0 | 7.3 | Good desktop writing surface; too much phone chrome before the document |
| Focus | 8.3 | 8.5 | Strong single-purpose timer and immersive environment; small supporting copy and image-dependent contrast need care |

The overall score is a holistic judgment of the connected product, including cross-page consistency and mobile usability; it is not the arithmetic mean of isolated screen scores.

## Findings in priority order

### 1. High — floating assistant covers other controls on phones

`apps/web/src/components/AIAssistant.tsx:200` — fixed bottom-right launcher occupies the same space as underlying content. At 390x900, DOM hit-testing confirmed it partly covers Planner's Milestone control and Brain's Document title field. Intersections were approximately 1,892 and 1,209 square CSS pixels respectively; a sampled point within each overlap resolves to the launcher.

Evidence: `.audit/ui-design-audit/confirmed-findings.json`, `planner-day-390-light.png`, `brain-390-dark.png`.

Direction: reserve a stable content-safe area for the launcher, or dock it within a shell region that does not cover page controls. Retest scrolling and dialogs.

### 2. High — Brain writing starts below the first phone screen

`apps/web/src/components/brain/Editor.tsx:467` and `apps/web/src/components/BrainWorkspace.tsx:269` — page actions, Editor/Graph mode, Documents/Editor pane navigation, save state, breadcrumbs, document actions, metadata and formatting ribbon stack before the writing area. At 390x900 the `.tiptap` content starts at y=913. The title appears near the bottom of the initial view.

Direction: keep title and writing primary. Consolidate lower-frequency document actions/metadata behind an existing menu or disclosure; reduce duplicated navigation rows without removing features.

### 3. High — mobile Planner preserves controls by sacrificing readable content

`apps/web/src/components/planner/TodayView.tsx:298`, `apps/web/src/components/planner/TodayView.tsx:337`, `apps/web/src/components/planner/TodayTasks.tsx:347` — important task/time-block names truncate heavily on phones, including a linked-task chip reduced to “T…”. Repeated date headings and wrapped toolbars occupy much of the first viewport before the schedule. Week view has narrow labels and tall sparse cells on desktop.

Direction: give task names a full row and let the essential name wrap. Put secondary metadata/actions on a separate row. Make one date heading authoritative and adjust the information density of week/day views independently.

### 4. High — specific accent text combinations fail normal-text contrast

`apps/web/src/components/planner/TodayView.tsx:111` — `bg-accent text-white` gives the 12px “+ Time Block” label approximately **3.15:1 in dark mode**, below the normal-text 4.5:1 baseline.

`apps/web/src/components/planner/PlannerMatrix.tsx:233` — the small white TODAY badge has the same approximately **3.15:1** dark-mode combination.

`apps/web/src/components/Sidebar.tsx:213` — active count badge text on its tint measures approximately **3.99:1 light / 4.10:1 dark**. This repeats across sections. The 11px mobile workspace initial measures about 4.46:1 in light mode and is a smaller, near-threshold issue.

Direction: use the theme-aware on-accent text token for filled controls and a stronger foreground token for tinted count badges. Verify each actual composed state. The rest of the sampled primary/body text was generally readable; this is not a claim that light mode is universally broken.

### 5. Medium — Inbox changes the whole navigation shell

`apps/web/src/styles/inbox.css:136` — Inbox changes the sidebar from **248px to 328px**. `inbox.css:151` increases its navigation text from **14px to 16px**. Other overrides enlarge the logo, spacing, account area and assistant launcher. The content edge shifts when navigating into Inbox.

Direction: keep a single shared shell width, type scale and launcher treatment. Let Inbox's own content carry its distinctive empty state and layout.

### 6. High accessibility issue — Planner icon controls lack names

`apps/web/src/components/planner/PlannerCells.tsx:30` — task completion button renders only an aria-hidden icon with no accessible name.

`apps/web/src/components/planner/PlannerMatrix.tsx:487` — category Add buttons render an unlabeled SVG and use hover-only opacity for discovery. Confirmation found four task completion buttons and four category Add buttons without names in the inspected week DOM; some Add buttons are visually hidden until hover.

Direction: add task-specific completion labels, category-specific Add labels and focus-visible discoverability. A 44px hit area alone does not address accessible naming.

### 7. Medium — product language and dialog styling are inconsistent

`apps/web/src/components/projects/ProjectOverview.tsx:106` — “Problem Statement & Technical Scope”; `ProjectOverview.tsx:196` — “Active Execution Tickets”; `ProjectOverview.tsx:309` — “Create Execution Ticket”. `apps/web/src/components/ProjectDetail.tsx:634` — “Velocity Pace”; `ProjectDetail.tsx:652` — “Directives”. `apps/web/src/components/Projects.tsx:271` — “INITIATIVES”. Tasks also instructs people to open a “directive”. These terms make an ordinary personal project feel like engineering administration.

`apps/web/src/components/habits/HabitFormModal.tsx:164` — repeated uppercase monospaced labels contrast with the sentence-case proportional labels in the Goal dialog. Both dialogs fit and behave correctly in the sampled keyboard paths, but look like separate systems.

Direction: standardize personal-workspace language and shared form typography, field rhythm, descriptions and footer actions.

### 8. Polish — flatten the hierarchy of secondary information

Dashboard repeats the same task in Today's Focus and Your top three today, with repeated Start Focus actions. Goals stacks many filters before the goal list. Projects and Brain combine many small badges, borders, monospaced labels and icons. In light mode, near-identical white surfaces flatten nested cards; dark mode separates surfaces slightly better, but has the specific accent-label failures above.

Direction: establish one dominant action per region, use fewer nesting levels and make secondary metadata quieter through placement and spacing. Avoid globally shrinking text or lowering contrast.

## What is working

- Recognizable KRAMA palette, restrained icon family, readable main headings and consistent primary actions on many pages.
- Landing has a more deliberate hierarchy than the operational screens.
- Dashboard makes the next focus task easy to identify.
- Habit completion is explicit and history cells are visible in light mode.
- Search palette has a clean focus treatment and useful grouping in both themes.
- Sampled creation dialogs fit the phone viewport and return focus after Escape.
- No global horizontal overflow in the 48 inspected views.

## Recommended order

1. Fix assistant overlap, phone Planner labels and Brain's writing-area placement.
2. Correct accent contrast and name the Planner icon controls.
3. Unify the sidebar shell, dialog typography and personal-project language.
4. Reduce repeated controls/card nesting and refine spacing using real long titles and populated data.

The largest improvement will come from the workspace and phone layouts. Further hero typography changes alone will have little effect on the overall rating.

## Reproduce

Run the local dev app on 127.0.0.1:5173, then `corepack pnpm exec playwright test --config .audit/ui-design-audit/audit.config.ts`. Captures, raw geometry/contrast candidates and confirmed findings live under `.audit/ui-design-audit/`. The audit scripts and artifacts are ignored local evidence; this Markdown report is the durable handoff. No design fixes were made in this audit.
