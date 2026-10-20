# Inbox reference correction — 17 October 2026

Corrected the previous compact approximation to follow the supplied reference's measured desktop composition. At 1586×992 the Inbox now uses a 10px frame, 328px sidebar, main content at x400, and an empty panel at approximately y194 measuring 1130×520px. Browser checks enforce those bounds within three pixels.

Increased the heading/supporting type, capture-button size and chip spacing. Rebuilt the tray illustration with shaded surfaces, layered paper, a raised rim and orbit marks. The four labels now read A task, An idea, A plan and A note. A plan opens the existing Task capture flow; Link remains available in the capture dialog. The helper uses a capture-icon button, avoiding an incorrect claim that the search shortcut opens capture.

Krama's theme palette is unchanged. Larger navigation, logo, footer and AI-launcher dimensions are scoped to the Inbox route at desktop widths. Planner and other pages retain their existing widths. Empty-state heading semantics were corrected to h2. Existing capture/save/file/schedule payloads are retained.

Evidence: `.audit/inbox-correction-results.json`, `.audit/inbox-correction-scope-results.json` and `.audit/inbox-correction-workflows-results.json`. Reference preview: `.audit/inbox-corrected-dark.png`; mobile preview: `.audit/inbox-corrected-mobile.png`.

Frontend TypeScript, lint and production build passed. Existing Docker services and the local frontend/API/worker were started again; the latest source is available at http://127.0.0.1:5173/app/inbox. No application data was reset.

Final checks: 51/51 Inbox visual/keyboard/state cases across Chromium, Firefox and WebKit; 3/3 Inbox-to-Planner-to-Inbox navigation cases confirming 328px versus 280px sidebars after the existing transition settles; 14/14 existing personal-workspace workflow cases on the production bundle. No final-run retries or skips. The scope test initially measured during the 200ms width transition; it now waits for the settled width rather than taking a premature geometry snapshot.
