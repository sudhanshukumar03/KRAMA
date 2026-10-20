# Dark-mode discovery notes

These observations were recorded before the current semantic theme work. They explain why the theme refactor was needed and are preserved as historical context. The current implementation is described in the [theme token guide](../../design/theme-tokens.md).

## Initial implementation

The review found Tailwind CSS 4 configured through the `@theme` block in `apps/web/src/index.css`. A manually defined `.dark` class overrode some colors, but the reviewed UI did not expose a theme switch. Styling also lived in shared classes such as `.krama-card` and `.krama-btn`.

Color choices were spread through feature components. A static scan found many palette utilities and raw color values, alongside 192 `dark:` variants across six files. The counts were observations of that revision and should not be used as current measurements.

| Component in the reviewed revision | Palette utility instances |
| --- | --- |
| `DailyReview.tsx` | 208 |
| `PlannerMatrix.tsx` | 152 |
| `SkillsModule.tsx` | 94 |
| `CalendarMode.tsx` | 71 |
| `PlannerHeader.tsx` | 65 |
| `TimeBlockModal.tsx` | 50 |
| `Dashboard.tsx` | 46 |

## Consumers outside ordinary CSS

The earlier graph implementation rendered through a canvas library, charts passed colors through Recharts properties, and habit visualizations used color literals. A theme refactor therefore needed to cover JavaScript and SVG consumers as well as utility classes.

The editor also needed a theme-aware prose treatment. Changing page backgrounds alone would not make document text, selections, and formatting controls readable.

## Decisions that followed

The review proposed semantic roles for surfaces, text, borders, interaction states, charts, heatmaps, and graph elements. Shared input and dialog behavior also needed attention because consistent colors could not resolve inconsistent controls.

The current sources are [theme.css](../../../apps/web/src/styles/theme.css), [index.css](../../../apps/web/src/index.css), and [theme.ts](../../../apps/web/src/lib/theme.ts). A theme switch is now present in the sidebar, and the theme hook supports light, dark, and system preferences. The old counts and removed component names remain part of this review's history.
