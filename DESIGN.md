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
  text-on-accent: "oklch(0.18 0.01 262)"
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
    textColor: "{colors.text-on-accent}"
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

# Design guide

The active workspace composition is documented in [workspace-redesign.md](docs/design/workspace-redesign.md). It sets 28px page headings, plain page headers, a 248px navigation rail, shared search controls, and 44px interactive controls. The reference metadata above remains a historical token reference; the CSS theme and the workspace specification govern the current implementation.

Krama should make a busy workspace feel understandable. Boards and reporting screens need clear grouping and compact information; Brain needs room to read and write. Both use the same type system, color roles, controls, and interaction conventions.

The metadata above records the shared design reference. The implemented theme values live in [theme.css](apps/web/src/styles/theme.css), and the [theme token guide](docs/design/theme-tokens.md) explains their roles. Check the code when an exact value is needed.

## Color and hierarchy

Use the Iris accent for primary actions, active navigation, focus rings, and selected states. Neutral backgrounds and surfaces carry most of the screen. Success, warning, danger, and information colors have separate meanings and should be accompanied by labels or icons.

Dark mode creates depth through progressively lighter surfaces. Its borders use transparent light tones; light mode uses transparent dark tones. Reading text, secondary labels, and disabled content need distinct roles. Verify contrast in both themes rather than assuming the same value works on every background.

## Typography

Inter is the main typeface, with system fallbacks. Use tabular numbers for timers, estimates, percentages, and other values that update. Monospace text is useful for compact technical metadata, while ordinary explanations should remain in the body typeface.

| Role | Reference size and line height | Typical use |
| --- | --- | --- |
| Display | 24px / 32px, weight 700 | Page headings |
| Headline | 20px / 30px, weight 700 | Dialog and panel headings |
| Title | 18px / 28px, weight 600 | Sections and columns |
| Body | 15px / 24px, weight 400 | Descriptions and document prose |
| Caption | 13px / 20px, weight 500 | Labels and supporting information |
| Technical label | 12px / 16px, weight 600 | Status, dates and estimates |

Use emphasis sparingly. A screen should make its main action and most useful information recognizable without making every label bold or brightly colored.

## Layout and spacing

Use the shared 4px and 8px spacing rhythm. Group related fields closely and leave a clearer separation between sections. Dense screens benefit from alignment and bounded groups; a writing surface benefits from a comfortable reading width, roughly 68 characters per line.

Dashboard layouts can extend to about 1440px. Boards and document workspaces may use more of the available width. Mobile layouts should change composition, preserve touch targets, and provide deliberate scrolling where the content needs it.

## Shape and elevation

Controls and compact badges use a 4px radius. Buttons and inputs use 8px, cards use 14px, and dialogs use 16px. Avatars and appropriate pills can be fully rounded.

Resting cards use a quiet border and a small shadow. Dark elevated cards may use the existing subtle top inset highlight. Stronger elevation belongs to floating dialogs, menus, and overlays. Use shared shadow tokens so depth remains consistent across features.

## Controls

Primary buttons use the accent and the theme's foreground-on-accent role. Secondary buttons use a surface and border. Ghost controls remain quieter until interaction. Use specific labels such as Add habit, Save changes, or Move to sprint.

Inputs need visible labels, readable placeholder text, and a clear focus ring. Dialogs should separate their contents from the page, manage focus, and support a predictable close action. Category badges can use domain colors, but their text must carry the meaning.

## Motion and state

Short hover, press, and selection feedback should usually stay near 100–200ms. Larger panel transitions may take longer when the movement helps explain the change. Respect reduced-motion preferences and avoid animating essential text or metrics in a way that makes them harder to read.

Loading, empty, error, disabled, and saved states are part of the design. Explain failures in ordinary language, retain unsaved input, and show what the user can do next. A stale edit should be visible as a conflict rather than silently replacing another update.

## Applying the guide

Use the [interface guide](docs/design/interface-guide.md) for screen-level decisions and [frontend notes](apps/web/DESIGN.md) for source locations and component responsibilities. Treat accessibility and responsive behavior as checks to perform on each change, including keyboard operation, contrast, visible focus, labels, touch targets, and reduced motion.
