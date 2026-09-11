# Dark Mode Discovery

## Tailwind Setup
- **Tailwind Major Version**: v4 (`tailwindcss@4.3.3`, `@tailwindcss/vite`).
- **Config Location**: The configuration lives in the `@theme` block inside `apps/web/src/index.css`.

## Existing Theme Mechanism
- **Theme Switcher**: Currently, `next-themes` is **not installed**.
- **Existing Implementation**: A `.dark` class is manually defined in `index.css` under `@layer base` overriding variables with raw hex codes. There is no UI to toggle it.
- **Global Stylesheet**: `apps/web/src/index.css` contains all base styling, `@theme`, and custom components (`.krama-card`, `.krama-btn`).

## Color Inventory
Found using a static analysis script running against `apps/web/src/**/*.{ts,tsx}`:

**Tailwind Palette Utilities (e.g. bg-blue-500)**
*Total instances across codebase: High.*
Top files:
- `components/DailyReview.tsx`: 208
- `components/planner/PlannerMatrix.tsx`: 152
- `components/SkillsModule.tsx`: 94
- `components/planner/CalendarMode.tsx`: 71
- `components/planner/PlannerHeader.tsx`: 65
- `components/planner/TimeBlockModal.tsx`: 50
- `components/Dashboard.tsx`: 46

**`dark:` variants**
*Total instances: 192 spread across 6 files.*
- `components/planner/PlannerMatrix.tsx`: 56
- `components/planner/PlannerHeader.tsx`: 48
- `components/SkillsModule.tsx`: 40
- `components/planner/CalendarMode.tsx`: 36
- `components/planner/CapacitySummary.tsx`: 10
- `components/KanbanBoard.tsx`: 2

**Hex / RGB / HSL / OKLCH literals in JS/TS**
*Total instances: High.*
Top files:
- `components/HabitTracker.tsx`: 74
- `components/ProjectDetail.tsx`: 71
- `components/TimelineView.tsx`: 68
- `components/KanbanBoard.tsx`: 67
- `components/CommandPalette.tsx`: 42

**`bg-white`, `bg-black`, `text-white`, `text-black`**
*Total instances: Moderate.*
Top files:
- `components/CommandPalette.tsx`: 12
- `components/DailyReview.tsx`: 12
- `components/HabitTracker.tsx`: 12
- `components/SkillsModule.tsx`: 11

## Non-CSS Color Consumers
- **Knowledge Graph**: `react-force-graph-2d` is installed and used in `KnowledgeGraph.tsx`. This renders to canvas and will need JS values.
- **Analytics Charts**: `recharts` is installed. These components pass colors as props.
- **Habit Heatmap**: `HabitTracker.tsx` has numerous hex literals, indicating SVG or Canvas usage for the heatmap/streak.
- **SVGs**: Several components have inline SVG coloring that relies on JS strings or un-tokenized Tailwind.

## Tiptap
- Tiptap is installed with `@tailwindcss/typography`.
- The prose configuration likely uses the default `prose` class, which will need to be customized via a strict `.prose-krama` definition.

## Dominant Accent Color
- Primary accent color found in `index.css`: `#2563EB` (Blue).
- Existing Category Colors: `#2563EB` (Blue), `#7C3AED` (Purple), `#16A34A` (Green), `#EA580C` (Orange), `#DC2626` (Red), `#0D9488` (Teal).

## Primitive Components
- There is a `ui/` folder, but it lacks strict, exhaustive primitives (no shared `Input`, `Dialog`, `Popover`, `Tooltip`, `Select`, `Badge`, `Toast` wrappers).
- Some structural classes exist in `index.css` (e.g. `.krama-card`, `.krama-btn`).
- **Note on Phase 4**: Because colors are heavily inlined per feature (e.g. `DailyReview.tsx` has 208 palette instances), Phase 4 will require extensive inline refactoring.
