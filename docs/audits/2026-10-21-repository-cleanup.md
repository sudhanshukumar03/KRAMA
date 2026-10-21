# Repository cleanup

Date: 2026-10-21. Scope: confirmed unused files inside the KRAMA workspace, preserving the existing dirty checkout and index.

## Removed

- 1,383 files and 559 empty directories, totaling 130.93 MiB of logical file contents. Most were superseded generated screenshots, browser recordings/traces, disposable test output and an obsolete copied Vite preview build.
- Two unreferenced legacy artwork files: `docs/screenshots/krama-os.jpg` and `krama-os-preview.png`. Current README screenshots and the documented portfolio showcase remain.
- Five unused landing-film VTT exports. The silent player uses its inline accessible transcript and does not load caption tracks. The encoder and media README no longer generate/document unused VTT files.

Every deleted file was selected in a manifest, hashed, checked against the reviewed version and constrained to the resolved workspace path. Files were deleted individually with native PowerShell; only verified empty directories were removed afterward. No recursive deletion was used. Private path/hash/removal records are in `.audit/cleanup-2026-10-21/`.

## Retained and checked

- The source graph checked 473 source/config/test files from runtime, test, script, package and developer entry points; no orphaned modules were found.
- All 47 required public assets match their pre-cleanup hashes. These include every curated wallpaper, both theme logos, responsive workspace captures, all four video/poster compositions and their MP4/WebM fallbacks.
- Environment files, migrations, installed dependencies, developer configuration, source/backup snapshots, current qualification records, brand deliverables and raw media/tooling needed to reproduce the intro remain.
- Git worktrees and the files used by the one-shot Gemini quota-reset task remain. Main and provider settings are unchanged; R2 stays Coming soon.

## Verification and existing PR follow-up

Root test/config types, client production build and original source/asset budgets passed. Landing verification across Chromium, Firefox and WebKit passed 53 checks with seven existing Windows WebKit media skips. Media-generator syntax was checked without generating cache files.

The preceding PR run exposed a font-dependent headline width change and a restart test depending on aggregate console-log counts. A new font-swap case reproduced the width defect before the fix (5.98px change); the headline now reserves a normal-font footprint while still allowing intrinsic growth for user text-spacing overrides. The original width/contrast assertions and the new font case pass.

Restart verification now associates the Socket.IO authentication acknowledgement with its Engine.IO connection over polling or WSS, requires a fresh authenticated/upgraded socket after reload, and verifies the committed task event arrives on that new socket. This replaces ambiguous console counts with protocol and event-delivery evidence; no timeout or meaningful recovery requirement was relaxed. All 26 isolated HTTPS checks passed, including restart recovery, session refresh, WSS delivery, backup import and both themes. Remote CI must still qualify the updated PR head.
