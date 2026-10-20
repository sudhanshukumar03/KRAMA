# Project story refinement

The project example should explain a real KRAMA relationship: a goal gives a project direction, and the project holds the next task and its supporting note.

Use the existing Inter family and Iris palette: light canvas #FAFAFA, white #FFFFFF, ink #141821, secondary #414B60, Iris #3864C8, and a quiet Iris tint derived from the existing accent token. Dark mode uses the existing navy surfaces and light text tokens.

Layout: a left-aligned product illustration occupies about three fifths of the row; a short headline and two sentences sit on the right. On phones, the explanation comes first and the illustration follows. No new interactions or animation.

    Goal context                 Know what to work on next.
      |                         Short explanation
    Project
      Highlighted next task
      Completed task
      Linked note + progress

Keep one visual emphasis: the next task. Remove the separate status badge, repeated project label, generic project description, duplicated caption, decorative copy icon, and unrelated habits aside. The tinted illustration stage separates the example from the real workspace without making it look like another dashboard panel. Preserve semantic heading levels and readable contrast; check 320px through desktop in both themes.

Validated on the production build: six responsive layout and contrast checks passed across Chromium, Firefox, and WebKit, covering 320, 390, 768, 1440, and 1920px in both themes. Build and frontend lint passed. Reviewed desktop and phone screenshots; the tint uses sRGB mixing to preserve the Iris hue against neutral surfaces. Copy precedes the illustration in document order.
