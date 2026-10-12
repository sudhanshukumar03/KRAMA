# Theme token reference

Krama's theme values are defined in [theme.css](../../apps/web/src/styles/theme.css). [index.css](../../apps/web/src/index.css) maps them into Tailwind utilities and shared styles. [theme.ts](../../apps/web/src/lib/theme.ts) resolves light, dark, or system preferences and applies the root `.dark` class.

The tables below reproduce the stylesheet values at this documentation revision. They are a reference, not a second configuration source. Update them when the stylesheet changes. Color roles describe intent; individual screens still need contrast and state checks.

## Surfaces

These roles separate the page canvas, ordinary content and floating layers.

| Token | Light | Dark |
| --- | --- | --- |
| `--bg-base` | `oklch(0.98 0 0)` | `oklch(0.18 0.01 262)` |
| `--bg-subtle` | `oklch(0.96 0 0)` | `oklch(0.22 0.01 262)` |
| `--surface-1` | `oklch(1 0 0)` | `oklch(0.25 0.01 262)` |
| `--surface-2` | `oklch(1 0 0)` | `oklch(0.28 0.01 262)` |
| `--surface-3` | `oklch(1 0 0)` | `oklch(0.32 0.01 262)` |
| `--surface-overlay` | `oklch(1 0 0 / 0.8)` | `oklch(0.25 0.01 262 / 0.8)` |

## Text

Use text roles according to importance and background, including text on accent-filled controls.

| Token | Light | Dark |
| --- | --- | --- |
| `--text-primary` | `oklch(0.20 0.02 262)` | `oklch(0.98 0.01 262)` |
| `--text-secondary` | `oklch(0.42 0.03 262)` | `oklch(0.82 0.02 262)` |
| `--text-muted` | `oklch(0.52 0.025 262)` | `oklch(0.66 0.02 262)` |
| `--text-on-accent` | `oklch(1 0 0)` | `oklch(0.18 0.01 262)` |
| `--text-inverse` | `oklch(0.98 0.01 262)` | `oklch(0.18 0.01 262)` |

## Borders and focus

Borders define structure. Focus rings identify the currently focused control.

| Token | Light | Dark |
| --- | --- | --- |
| `--border-subtle` | `oklch(0 0 0 / 0.04)` | `oklch(1 0 0 / 0.05)` |
| `--border-default` | `oklch(0 0 0 / 0.08)` | `oklch(1 0 0 / 0.1)` |
| `--border-strong` | `oklch(0 0 0 / 0.16)` | `oklch(1 0 0 / 0.2)` |
| `--ring` | `oklch(0.62 0.17 262)` | `oklch(0.72 0.15 262)` |

## Interaction states

Accent roles identify primary and active actions. State washes and disabled roles describe control state.

| Token | Light | Dark |
| --- | --- | --- |
| `--accent` | `oklch(0.55 0.17 262)` | `oklch(0.72 0.15 262)` |
| `--accent-hover` | `oklch(0.50 0.17 262)` | `oklch(0.78 0.15 262)` |
| `--accent-active` | `oklch(0.48 0.17 262)` | `oklch(0.85 0.15 262)` |
| `--accent-subtle` | `oklch(0.62 0.17 262 / 0.1)` | `oklch(0.72 0.15 262 / 0.15)` |
| `--accent-fg` | `oklch(0.55 0.17 262)` | `oklch(0.72 0.15 262)` |
| `--state-hover` | `oklch(0 0 0 / 0.04)` | `oklch(1 0 0 / 0.06)` |
| `--state-active` | `oklch(0 0 0 / 0.08)` | `oklch(1 0 0 / 0.1)` |
| `--state-selected` | `oklch(0 0 0 / 0.06)` | `oklch(1 0 0 / 0.08)` |
| `--disabled-bg` | `oklch(0 0 0 / 0.05)` | `oklch(1 0 0 / 0.05)` |
| `--disabled-fg` | `oklch(0.65 0.02 262)` | `oklch(0.52 0.015 262)` |

## Status

Status colors need labels or icons so meaning remains available without color.

| Token | Light | Dark |
| --- | --- | --- |
| `--success-fg` | `oklch(0.6 0.15 145)` | `oklch(0.8 0.1 145)` |
| `--success-bg` | `oklch(0.6 0.15 145 / 0.12)` | `oklch(0.8 0.1 145 / 0.15)` |
| `--success-border` | `oklch(0.6 0.15 145 / 0.2)` | `oklch(0.8 0.1 145 / 0.2)` |
| `--warning-fg` | `oklch(0.65 0.15 65)` | `oklch(0.85 0.1 65)` |
| `--warning-bg` | `oklch(0.65 0.15 65 / 0.12)` | `oklch(0.85 0.1 65 / 0.15)` |
| `--warning-border` | `oklch(0.65 0.15 65 / 0.2)` | `oklch(0.85 0.1 65 / 0.2)` |
| `--danger-fg` | `oklch(0.6 0.2 25)` | `oklch(0.8 0.12 25)` |
| `--danger-bg` | `oklch(0.6 0.2 25 / 0.12)` | `oklch(0.8 0.12 25 / 0.15)` |
| `--danger-border` | `oklch(0.6 0.2 25 / 0.2)` | `oklch(0.8 0.12 25 / 0.2)` |
| `--info-fg` | `oklch(0.6 0.15 240)` | `oklch(0.8 0.1 240)` |
| `--info-bg` | `oklch(0.6 0.15 240 / 0.12)` | `oklch(0.8 0.1 240 / 0.15)` |
| `--info-border` | `oklch(0.6 0.15 240 / 0.2)` | `oklch(0.8 0.1 240 / 0.2)` |

## Planner categories

These colors distinguish routine, task, time-block and project categories.

| Token | Light | Dark |
| --- | --- | --- |
| `--cat-routines` | `oklch(0.6 0.15 180)` | `oklch(0.8 0.1 180)` |
| `--cat-routines-bg` | `oklch(0.6 0.15 180 / 0.12)` | `oklch(0.8 0.1 180 / 0.15)` |
| `--cat-tasks` | `oklch(0.62 0.17 262)` | `oklch(0.72 0.15 262)` |
| `--cat-tasks-bg` | `oklch(0.62 0.17 262 / 0.12)` | `oklch(0.72 0.15 262 / 0.15)` |
| `--cat-timeblocks` | `oklch(0.6 0.15 300)` | `oklch(0.8 0.1 300)` |
| `--cat-timeblocks-bg` | `oklch(0.6 0.15 300 / 0.12)` | `oklch(0.8 0.1 300 / 0.15)` |
| `--cat-projects` | `oklch(0.65 0.15 45)` | `oklch(0.8 0.1 45)` |
| `--cat-projects-bg` | `oklch(0.65 0.15 45 / 0.12)` | `oklch(0.8 0.1 45 / 0.15)` |

## Charts

Chart series use these roles instead of colors copied into individual components.

| Token | Light | Dark |
| --- | --- | --- |
| `--chart-1` | `oklch(0.62 0.17 262)` | `oklch(0.72 0.15 262)` |
| `--chart-2` | `oklch(0.6 0.15 180)` | `oklch(0.8 0.1 180)` |
| `--chart-3` | `oklch(0.6 0.15 300)` | `oklch(0.8 0.1 300)` |
| `--chart-4` | `oklch(0.65 0.15 45)` | `oklch(0.8 0.1 45)` |
| `--chart-5` | `oklch(0.6 0.2 25)` | `oklch(0.8 0.12 25)` |
| `--chart-6` | `oklch(0.65 0.15 100)` | `oklch(0.8 0.1 100)` |
| `--chart-7` | `oklch(0.6 0.1 200)` | `oklch(0.75 0.08 200)` |
| `--chart-8` | `oklch(0.5 0.1 340)` | `oklch(0.75 0.1 340)` |

## Habit heatmap

The heat scale progresses from an empty cell to higher activity intensity.

| Token | Light | Dark |
| --- | --- | --- |
| `--heat-0` | `oklch(0.96 0 0)` | `oklch(0.22 0.01 262)` |
| `--heat-1` | `oklch(0.85 0.1 145)` | `oklch(0.4 0.08 145)` |
| `--heat-2` | `oklch(0.75 0.15 145)` | `oklch(0.55 0.1 145)` |
| `--heat-3` | `oklch(0.65 0.2 145)` | `oklch(0.7 0.12 145)` |
| `--heat-4` | `oklch(0.55 0.2 145)` | `oklch(0.85 0.1 145)` |

## Knowledge graph

Graph roles cover the canvas, nodes, selected nodes, edges and labels.

| Token | Light | Dark |
| --- | --- | --- |
| `--graph-bg` | `oklch(0.98 0 0)` | `oklch(0.18 0.01 262)` |
| `--graph-node` | `oklch(0.62 0.17 262)` | `oklch(0.72 0.15 262)` |
| `--graph-node-active` | `oklch(0.6 0.2 25)` | `oklch(0.8 0.12 25)` |
| `--graph-edge` | `oklch(0 0 0 / 0.15)` | `oklch(1 0 0 / 0.15)` |
| `--graph-label` | `oklch(0.2 0 0)` | `oklch(0.95 0.01 262)` |

## Other values

Shadow color supports the shared elevation styles.

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-color` | `0 0 0` | `0 0 0` |

## Using the tokens

Prefer the mapped semantic utilities or CSS variables appropriate to the role. Theme-aware values also matter for SVG, chart, graph, and JavaScript consumers. Test a theme change after the feature has mounted so a color captured only at initial render does not remain stale.

Use the theme's foreground-on-accent role for filled primary controls, and verify the result in both themes. Keep status labels, visible focus, and disabled-state feedback independent of color alone. See the [interface guide](interface-guide.md) for the accessibility and composition requirements.
