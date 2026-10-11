# Interface guide

Krama has two main kinds of screen. Brain is a writing surface, where reading and editing need space. Boards, Planner, Goals, Habits, and reporting views organize more information at once. Their density can differ while their controls, language, and visual hierarchy remain consistent.

Use the [shared design guide](../../DESIGN.md) for the type scale and component rules, and the [theme token reference](theme-tokens.md) for color roles. This guide describes design requirements rather than claiming that every current screen already satisfies them.

## Make the next action clear

A returning user should quickly understand where they are, what information matters most, and what they can do next. Give the screen one primary focal point and a small number of supporting groups. Size, weight, alignment, spacing, and contrast should establish hierarchy even in grayscale.

Keep important summaries near the start of the page. Use a simple progression for onboarding and empty states, and a stable scanning order for dense tables and lists. Group related information with proximity or a common boundary. Avoid assigning the same visual emphasis to every label.

## Layout and responsive behavior

Use the shared spacing rhythm: 4px for small gaps, 8px for inline separation, 16px for ordinary padding, and larger steps for sections. Dense rows can use the intermediate 4px steps. Text columns should align left, and comparable numeric columns should align right.

Operational views can use a content width around 1200–1440px where useful. Document reading columns should stay around 600–750px rather than stretching with the viewport. Keep headings, toolbars, and content aligned to the same structure.

Mobile composition needs deliberate navigation, usable controls, and intentional scrolling. A board can show fewer columns at once; a form can stack its fields; a dialog may fill more of the viewport. Main actions should be reachable without shrinking their touch targets. Check layout at mobile, tablet, laptop, and desktop sizes.

## Navigation and disclosure

Group related destinations when the navigation becomes crowded. Make the active destination clear through more than a small font-weight change. Existing product routes determine what belongs in navigation; an older design proposal is not a reason to add an unfinished module.

Show the information needed to choose an item before opening its details. A task card can show title, priority, assignee, and dependency state, while its full description and discussion remain in the detail view. Goal history and document metadata can be secondary to the main progress or writing surface.

## Typography, color, and icons

Use Inter with the existing system fallbacks and the shared type scale. Keep body text at a comfortable line height. Use tabular figures for changing values such as timers and progress. Reserve uppercase monospace labels for short technical metadata.

Semantic tokens should supply surface, text, border, accent, and state colors. The accent identifies primary actions and active states; domain and status colors explain a different meaning. Status text or icons must make that meaning understandable without color alone.

Use the existing Lucide icon family consistently. Inline icons should balance with their labels; larger icons belong to navigation or a meaningful empty state. Decorative icons should not outweigh the content they accompany.

## Controls and forms

Use one main call to action per decision area, with quieter secondary and ghost controls. Destructive actions need their own wording and status treatment. Labels such as Add habit, Save changes, and Move to sprint explain more than Submit or Confirm.

A field needs a visible label. Related fields belong in a group, and validation should explain the exact problem at a useful moment, usually blur or submission. Do not discard a draft after a failed save. A conflict should explain that the record changed and provide a way to recover.

## Loading, empty, and failure states

Loading placeholders should preserve the shape of the screen. An empty state should explain what can appear there and provide the relevant first action. A failure should explain what did not complete and offer a retry when appropriate.

Distinguish a refresh failure with cached data from a screen that has never loaded. A saved-state indicator must represent a completed write. Keep local recovery and unsaved-state messages accurate about what is retained and where.

## Dense screens and charts

A metric needs a clear label, value, and relevant context. Keep the value visually stronger than its decoration. Choose chart types that answer the question: a line for a time series, a bar for comparison, and a heatmap for activity by day.

Label date ranges and duration units. Explain missing history rather than plotting it as a measured zero. Numeric table columns should align, while status cells need readable labels. Provide an accessible table or equivalent summary when the chart alone is insufficient.

## Brain and document editing

Keep the writing column calm, with a clear page title and subdued breadcrumbs. Links and mentions should sit naturally in the text. Metadata, backlinks, and related entities should be available without occupying the primary writing area.

Formatting actions need to preserve the editor selection. Autosave feedback should distinguish dirty, saving, saved, and conflicting states. A background refresh must not silently replace the user's draft.

## Motion and accessibility

Short control feedback generally takes about 100–200ms. Larger panel movement may take longer if it helps explain the change. Dragged items and displaced neighbors should move coherently. Respect `prefers-reduced-motion` and retain state feedback when nonessential movement is disabled.

Review normal text against a 4.5:1 contrast target, large text against 3:1, and essential component boundaries and indicators against 3:1. Check both themes. Interactive elements need visible focus, meaningful names, and keyboard operation; drag-only interactions need an alternative. Use semantic HTML and aim for touch targets of at least 44px on touch surfaces.

Before accepting a screen, check its hierarchy in grayscale, its keyboard path, its mobile scrolling, and its loading and failure states. These checks are part of the feature's behavior, not a cosmetic step after implementation.
