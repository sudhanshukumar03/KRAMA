# Token Table

The color system for KRAMA OS is completely tokenized. Do not use raw tailwind palette utilities (like `bg-blue-500`) or `dark:` variants. Instead, use these semantic tokens.

## Surfaces & Canvas
Use these for backgrounds of pages, cards, and elevated UI elements.

| Token | Light Value | Dark Value | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#FAFAFA` (oklch 0.98 0 0) | `#0E0F12` (oklch 0.18 0.01 262) | Main app background, underneath everything. |
| `--bg-subtle` | `#F4F4F5` (oklch 0.96 0 0) | `#131519` (oklch 0.22 0.01 262) | Secondary backgrounds, sidebars, slight indents. |
| `--surface-1` | `#FFFFFF` (oklch 1 0 0) | `#17191F` (oklch 0.25 0.01 262) | Default cards, main content areas, buttons. |
| `--surface-2` | `#FFFFFF` (oklch 1 0 0) | `#1E2128` (oklch 0.28 0.01 262) | Elevated cards, hovered surfaces. |
| `--surface-3` | `#FFFFFF` (oklch 1 0 0) | `#262A33` (oklch 0.32 0.01 262) | Highly elevated elements (popovers, tooltips, modals). |
| `--surface-overlay` | `#FFFFFF` @ 80% | `#17191F` @ 80% | Glassmorphic overlays, modal backdrops. |

## Text
Use these for typography.

| Token | Light Value | Dark Value | Usage |
| :--- | :--- | :--- | :--- |
| `--text-primary` | `#18181B` (oklch 0.2 0 0) | `#E8EAED` (oklch 0.95 0.01 262) | Standard body text, headings. |
| `--text-secondary` | `#52525B` (oklch 0.4 0 0) | `#A8ADB7` (oklch 0.75 0.01 262) | Subtitles, secondary information. |
| `--text-muted` | `#A1A1AA` (oklch 0.65 0 0) | `#6E747F` (oklch 0.55 0.01 262) | Disabled text, placeholders, very low priority info. |
| `--text-on-accent` | `#FFFFFF` (oklch 1 0 0) | `#FFFFFF` (oklch 1 0 0) | Text appearing inside primary accent buttons. |
| `--text-inverse` | `#FAFAFA` (oklch 0.98 0 0) | `#0E0F12` (oklch 0.18 0.01 262) | Text that needs to strictly contrast with the current theme. |

## Borders
Use these for structural lines. In dark mode, these are white with low opacity (alpha) instead of solid grays.

| Token | Light Value | Dark Value | Usage |
| :--- | :--- | :--- | :--- |
| `--border-subtle` | Black @ 4% | White @ 5% | Very subtle dividers, inner card lines. |
| `--border-default` | Black @ 8% | White @ 10% | Standard borders around cards, inputs. |
| `--border-strong` | Black @ 16% | White @ 20% | High contrast borders, active inputs. |
| `--ring` | Primary Accent | Primary Accent | Focus rings (`focus-visible:ring-ring`). |

## Interactive & State
Use these for interactive elements and state washes.

| Token | Light Value | Dark Value | Usage |
| :--- | :--- | :--- | :--- |
| `--accent` | `#2563EB` | `#60A5FA` (desaturated/lightened) | Primary brand color, primary buttons. |
| `--accent-hover` | `#1D4ED8` | `#93C5FD` | Primary brand color hovered. |
| `--accent-active` | `#1E40AF` | `#BFDBFE` | Primary brand color active/pressed. |
| `--accent-subtle` | Accent @ 10% | Accent @ 15% | Subtle tinted background for selected items. |
| `--accent-fg` | `#2563EB` | `#60A5FA` | Text color matching the accent. |
| `--state-hover` | Black @ 4% | White @ 6% | Universal hover wash over surfaces. |
| `--state-active` | Black @ 8% | White @ 10% | Universal active/pressed wash over surfaces. |
| `--state-selected`| Black @ 6% | White @ 8% | Universal selected wash. |
| `--disabled-bg` | Black @ 5% | White @ 5% | Background for disabled inputs/buttons. |
| `--disabled-fg` | `#A1A1AA` | `#6E747F` | Foreground for disabled text. |

## Semantic Status
Use these for alerts, badges, and validation states.

| Token | Light Value | Dark Value | Usage |
| :--- | :--- | :--- | :--- |
| `--success-fg` | Green | Green (lightened) | Success text/icons. |
| `--success-bg` | Green @ 12% | Green @ 15% | Success backgrounds. |
| `--success-border`| Green @ 20% | Green @ 20% | Success borders. |
| `--warning-*` | Orange/Yellow | Orange/Yellow | Warning states. |
| `--danger-*` | Red | Red (lightened) | Error/Danger states. |
| `--info-*` | Blue | Blue (lightened) | Informational states. |

## Domain Tokens
Use these strictly for specific KRAMA OS features to ensure visual cohesion across both themes.

| Feature Area | Tokens |
| :--- | :--- |
| **Planner Matrix** | `--cat-routines`, `--cat-routines-bg`, `--cat-tasks`, `--cat-tasks-bg`, `--cat-timeblocks`, `--cat-timeblocks-bg`, `--cat-projects`, `--cat-projects-bg` |
| **Charts (Recharts)** | `--chart-1` through `--chart-8` |
| **Habit Heatmap** | `--heat-0` (empty) through `--heat-4` (max intensity) |
| **Knowledge Graph** | `--graph-bg`, `--graph-node`, `--graph-node-active`, `--graph-edge`, `--graph-label` |

## Misc

| Token | Light Value | Dark Value | Usage |
| :--- | :--- | :--- | :--- |
| `--shadow-color` | `0 0 0` | `0 0 0` | Shadow color (opacity scales automatically). |
