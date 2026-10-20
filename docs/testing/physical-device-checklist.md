# Physical-device release checks

Status: **not executed**. No physical device was connected during the 2026-10-19 verification. Browser emulation and accelerated clocks are recorded separately and do not replace these checks.

Record the device model, OS/version, browser/version, app build and date. Use a disposable workspace on an approved HTTPS staging deployment. A real device must trust its certificate; do not install the throwaway local test certificate as a general-purpose trusted root.

1. On Android Chrome and iOS Safari, sign in, reload and reopen the app. Confirm the session and selected workspace survive.
2. Open the actual on-screen keyboard in Inbox capture, Brain editor/search, Planner and Goal forms. Confirm the input, save action and errors remain visible, content scrolls correctly, keyboard dismissal restores usable space, and no horizontal overflow appears.
3. Check light and dark themes in portrait and landscape, including empty/loading/error states, menus and dialogs. Confirm secondary text, icons, focus indicators and disabled states are readable in normal use.
4. Use tab switching, browser back/forward and interrupted connections while editing Brain. Confirm saved content survives reload and failed drafts remain recoverable.
5. Start a Focus session, background the browser and lock/sleep the device for at least two minutes. Resume and confirm elapsed time is correct and completion is saved once. Repeat for a session that ends while locked.
6. Pause Focus before sleeping. Confirm sleep time is excluded after resume. Reload once during a running session and once during a failed-save retry.
7. Disconnect/reconnect networking during completion. Confirm the unsaved result survives and one successful retry produces exactly one history entry. Test expired-login recovery.
8. While two tabs/devices are open, change a task, habit and Planner reservation. Confirm the other active view updates after reconnect; verify no draft is overwritten silently.

Report each result as pass/fail/not run with the device details and a reproducible action sequence. These checks remain required before claiming physical-device readiness.
