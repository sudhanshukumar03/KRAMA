# Frontend design

The [shared design guide](../../DESIGN.md) defines Krama's visual language. This file explains how to apply it in the frontend without maintaining a second palette or typography specification.

## Sources to use

Theme values are defined in [theme.css](src/styles/theme.css). Tailwind mappings and shared component styles are in [index.css](src/index.css). Theme preference and the root `.dark` class are managed in [theme.ts](src/lib/theme.ts).

Use the [interface guide](../../docs/design/interface-guide.md) when composing a screen, and the [theme token reference](../../docs/design/theme-tokens.md) when choosing a color role. Check the stylesheet before copying a numeric value from documentation.

## Feature structure

Keep a screen's queries and mutations close to its feature. Extract presentation components when they clarify responsibility, and pass them explicit data and callbacks. Shared controls belong in `components/ui`; a control used by one feature belongs beside that feature.

Brain needs a readable writing column and quiet metadata. Boards, planner views, and reporting screens can be denser, but their headings, actions, grouping, and numeric units must remain clear.

## Interaction and recovery

Use visible labels and accessible names. Dialogs should manage focus and return it to the control that opened them. Keyboard users need an alternative to dragging. Mobile layouts should preserve usable controls and scrolling instead of shrinking every desktop element.

Show loading, empty, failure, and stale-data states deliberately. Keep an edited draft when a write fails or a background refetch arrives. Reduced-motion preferences should disable nonessential movement while preserving feedback about what changed.
