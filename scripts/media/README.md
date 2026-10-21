# KRAMA workflow film

The landing page uses a 20-second recording of an actual KRAMA browser workflow with synthetic records. It replaces the screenshot slideshow. The edit follows one task: capture it in Inbox, choose Do today, create a linked 25-minute Planner block, then open its separate Focus tab and start the timer.

Four compositions cover desktop/mobile and light/dark. There is no soundtrack, opening title card, closing CTA, control strip or visible duration caption. The existing player loads near the viewport, autoplays silently when visible, pauses offscreen, respects manual pause and reduced motion, and releases media on route exit. Playback is 1x; the edit itself is 20 seconds. The screen-reader description follows the recorded actions.

## Reproduce

Run the local app at http://127.0.0.1:5173, then from the repository root:

```powershell
corepack pnpm exec playwright test --config scripts/media/capture.config.ts
python scripts/media/build-intro.py
```

The capture script intercepts every application API call using `example-workspace.ts`. It asserts that task creation, scheduling, linked time-block creation, the new Focus tab and the ticking countdown actually occur. No real account records are read or changed. The same fixture generates the product screenshots and clean Brain editor detail crops.

Requires Playwright Chromium and FFmpeg with libx264/libvpx. The existing project-local FFmpeg default is `.audit/landing-film/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe`; pass `--ffmpeg C:/path/to/ffmpeg.exe` to use another installation. Install that local tool if needed with `python -m pip install --target .audit/landing-film/tools --no-deps imageio-ffmpeg==0.6.0`. No runtime encoder or new frontend dependency is required.

Capture manifests and raw recordings: `.audit/workflow-film/`. Outputs: `apps/web/public/landing/film/`. Encoding makes H.264 Baseline/YUV420P fast-start MP4 and matching VP8 WebM fallbacks, 24fps, no audio. Resolutions: 1280x720 and 720x960. Each chapter is edited to 7/7/6 seconds; cuts omit route-loading gaps. Contact sheets, source intervals and SHA-256 hashes remain in the audit folder. The player provides its accessible text equivalent inline; the encoder does not generate unused caption tracks.

To re-capture only one movie, set `KRAMA_MEDIA_VARIANT=desktop-light` (or desktop-dark/mobile-light/mobile-dark); clear it before a full capture. To encode one theme, pass `--theme light` or `--theme dark`.

Verification: `corepack pnpm test:landing` builds production assets and runs the landing journeys in Chromium, Firefox and WebKit. Windows WebKit playback cases are explicitly skipped because its media backend cannot decode the files; real Safari remains a separate device check.
