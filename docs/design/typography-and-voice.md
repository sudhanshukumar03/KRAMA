# Typography and voice

Keep KRAMA's existing Inter family, Iris accent and neutral palette: Paper (#FFFFFF), Slate (#11161F), Iris (#366BD3), Obsidian (#151A22), Platinum (#E7EAEE) and light Iris (#6290E7). Theme variables remain the source of truth.

The landing hero remains the single display treatment. Below it, section headings use a steady 34–48px scale, feature headings 24–30px, and paragraphs 18px with a 1.65 line height. On phones these become 30–36px, 22–26px and 16px. Headings wrap naturally within a bounded measure; paragraphs stay left aligned and under 60 characters per line.

Workspace descriptions use 15px/24px and section headings 17px/24px. Document prose, timer numerals, form labels and compact status data retain their own roles.

Write as a useful guide: name the action, explain the result, and stop. Use “task,” “note,” “project” and “goal” consistently. Replace abstract promises and technical administration language with concrete steps. Empty states tell someone how to begin; loading messages say what is loading.

Review against the existing design: the changing hero word already provides the page's distinctive visual moment. This pass improves the supporting reading rhythm and the explanation of capture → plan → Focus, using the current palette and layout. It adds no decorative labels, fonts or animation.

## Verified implementation

Section titles now wrap naturally, feature headings share the same scale, and workflow descriptions align above their supporting links. Project groups use semantic subheadings such as “Active projects” and “Project ideas.” Page introductions, empty states and loading messages explain ordinary tasks in plain language.

The FAQ closes the page with “Get to know KRAMA” as a stronger branded introduction: 40–60px on larger screens, 36–44px on phones, a tight heading line height and a separate, narrower supporting paragraph. Natural wrapping keeps “Get to know” together on phones. The questions retain their existing disclosure controls and theme colours.

The footer uses a full-width theme surface with a content-aligned inner grid. Its 128px brand lockup and short product description form one group; navigation aligns at the top, with copyright below. Phone layouts follow the same source order and give the three links equal columns. Keep the existing single app-entry button in the header.

Production build, frontend lint and root TypeScript checks passed. All 15 targeted production browser checks passed in Chromium, Firefox and WebKit, covering contrast, responsive geometry, keyboard previews, mobile navigation, FAQ and app entry. Two visual review runs captured 50 route/width/theme combinations across the landing page and seven workspace screens, plus detail views, at 320, 390, 768 and 1440px. No document overflow was found in those samples.

Screenshots and measured type sizes: `.audit/typography/`. Production results: `test-results/landing-results.json`.
