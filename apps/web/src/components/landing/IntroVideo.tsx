import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import '../../styles/landing-film.css';

const FILM_ROOT = '/landing/film/krama-intro';
const PLAYBACK_RATE = 1;
const TRANSCRIPT = [
  ['Capture the thought.', 'In an example workspace, type “Write the case study opening” in Quick Capture and save it to Inbox. Choose Do today.'],
  ['Make room for the work.', 'In Planner, create a 25-minute time block from 16:00 to 16:25, linked to that same task.'],
  ['One task. Your full attention.', 'Open the task in its own Focus tab. Use the plan and start the countdown. The original Planner stays available.'],
];
export function IntroVideo({ theme }: { theme: 'light' | 'dark' }) {
  const video = useRef<HTMLVideoElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const mediaTheme = useRef(theme);
  const pendingAppearance = useRef<{ position: number; resume: boolean; complete: boolean } | null>(null);
  const sourcePaths = useRef<string[]>([]);
  const sourceIndex = useRef(0);
  const prepared = useRef(false);
  const mounted = useRef(false);
  const inView = useRef(false);
  const reducedMotion = useRef(false);
  const manuallyPaused = useRef(false);
  const finished = useRef(false);
  const wanted = useRef(false);
  const playIntent = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [notice, setNotice] = useState('');

  function visible() {
    if (document.visibilityState === 'hidden') return false;
    const bounds = video.current?.getBoundingClientRect();
    // Manual actions must use the current geometry, not a potentially stale
    // observer entry after keyboard focus has scrolled a control into view.
    return Boolean(bounds && bounds.bottom > 80 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth);
  }
  function preparePoster() {
    const shape = window.matchMedia('(max-width: 600px)').matches ? 'portrait' : 'landscape';
    const suffix = mediaTheme.current === 'light' ? '-light' : '';
    if (video.current && !video.current.hasAttribute('poster')) video.current.poster = `${FILM_ROOT}-${shape}${suffix}-poster.jpg`;
    return shape;
  }
  function loadSource() {
    const media = video.current;
    if (!media) return;
    setFailed(false); setEnded(false);
    media.defaultPlaybackRate = PLAYBACK_RATE;
    media.src = sourcePaths.current[sourceIndex.current];
    media.load();
    media.playbackRate = PLAYBACK_RATE;
  }
  function prepareSource() {
    const media = video.current;
    if (!media || prepared.current) return;
    prepared.current = true;
    const shape = preparePoster();
    const mp4Supported = media.canPlayType('video/mp4; codecs="avc1.42E01F"');
    const suffix = mediaTheme.current === 'light' ? '-light' : '';
    sourcePaths.current = (mp4Supported ? ['mp4', 'webm'] : ['webm', 'mp4']).map(format => `${FILM_ROOT}-${shape}${suffix}.${format}`);
    sourceIndex.current = 0;
    media.muted = true;
    media.defaultMuted = true;
    media.preload = 'auto';
    loadSource();
  }
  function requestPlay() {
    if (!mounted.current || !visible()) return;
    prepareSource();
    const media = video.current;
    if (!media) return;
    wanted.current = true;
    const intent = ++playIntent.current;
    setNotice(''); setLoading(media.readyState < 3);
    void media.play().catch((error: unknown) => {
      if (intent !== playIntent.current || !mounted.current) return;
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'AbortError' || name === 'NotSupportedError') return;
      // Do not keep fighting browser autoplay restrictions on every scroll.
      manuallyPaused.current = true; wanted.current = false;
      setLoading(false); setNotice('Press Play to start the introduction.');
    });
  }
  function pause(manual = true) {
    if (manual) { manuallyPaused.current = true; wanted.current = false; }
    invalidatePlayback();
    video.current?.pause(); setLoading(false);
  }
  function invalidatePlayback() {
    ++playIntent.current;
  }
  function syncPlayback() {
    if (!visible() || !inView.current) { pause(false); return; }
    if (!manuallyPaused.current && !reducedMotion.current && !finished.current && !video.current?.error) requestPlay();
  }
  function onMediaError() {
    if (!prepared.current || !mounted.current) return;
    if (++sourceIndex.current < sourcePaths.current.length) {
      loadSource();
      if (wanted.current && !manuallyPaused.current) requestPlay();
      return;
    }
    video.current?.pause(); setFailed(true); setLoading(false); setPlaying(false);
  }
  function togglePlayback() {
    const media = video.current;
    if (!media) return;
    if (media.paused) {
      manuallyPaused.current = false;
      finished.current = false; setEnded(false);
      if (media.ended) media.currentTime = 0;
      if (!visible()) media.scrollIntoView({ block: 'center', behavior: 'instant' });
      requestPlay();
    } else pause();
  }
  useEffect(() => {
    mounted.current = true;
    const media = video.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = preference.matches;
    const preferenceChanged = () => {
      reducedMotion.current = preference.matches;
      if (preference.matches) pause(false); else syncPlayback();
    };
    // Media is prepared near the section. Only actual viewport visibility
    // starts playback; the page never scrolls or moves keyboard focus for it.
    const nearby = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) { preparePoster(); if (!reducedMotion.current) prepareSource(); }
    }, { rootMargin: '480px 0px' });
    const viewport = new IntersectionObserver(entries => {
      inView.current = Boolean(entries[0]?.isIntersecting && entries[0].intersectionRatio >= .2);
      syncPlayback();
    }, { threshold: [0, .2], rootMargin: '-80px 0px 0px' });
    if (media) { nearby.observe(media); viewport.observe(media); }
    preference.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      mounted.current = false; prepared.current = false; invalidatePlayback();
      media?.pause(); media?.removeAttribute('src'); media?.load();
      nearby.disconnect(); viewport.disconnect();
      preference.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, []);

  useEffect(() => {
    if (mediaTheme.current === theme) return;
    mediaTheme.current = theme;
    const media = video.current;
    if (!media) return;
    const snapshot = pendingAppearance.current ?? {
      position: media.currentTime, resume: !media.paused,
      complete: finished.current,
    };
    pendingAppearance.current = snapshot;
    const { position, resume, complete } = snapshot;
    const hadPoster = media.hasAttribute('poster');
    const hadSource = prepared.current;
    pause(false);
    prepared.current = false;
    media.removeAttribute('poster');
    if (hadPoster) preparePoster();
    if (!hadSource) { pendingAppearance.current = null; return; }
    const restorePlayback = () => {
      media.currentTime = Math.min(position, Number.isFinite(media.duration) ? media.duration : position);
      setEnded(complete);
      pendingAppearance.current = null;
      if (resume && !complete && !manuallyPaused.current) requestPlay();
    };
    media.addEventListener('loadedmetadata', restorePlayback, { once: true });
    prepareSource();
    return () => media.removeEventListener('loadedmetadata', restorePlayback);
  }, [theme]);

  return (
    <section id="intro" className="landing-container landing-intro-film" aria-labelledby="landing-film-title">
      <h2 id="landing-film-title" className="sr-only">A clearer way forward.</h2>
      <div className="landing-film-frame">
        <div ref={player} className="landing-film-player" aria-busy={loading}>
          <div className="landing-film-media">
            <video ref={video} preload="none" muted playsInline aria-label="KRAMA visual introduction" aria-describedby="landing-film-transcript"
              onPlay={() => { if (!visible()) pause(false); else { setPlaying(true); setEnded(false); } }}
              onPlaying={() => { setPlaying(true); setLoading(false); }}
              onPause={() => setPlaying(false)}
              onWaiting={() => { if (wanted.current && visible()) setLoading(true); }}
              onCanPlay={() => setLoading(false)}
              onEnded={() => { finished.current = true; wanted.current = false; setPlaying(false); setEnded(true); }}
              onError={onMediaError}
            />
            {!failed && <button type="button" className="landing-film-play" data-playing={playing} aria-label={playing ? 'Pause video' : ended ? 'Replay video' : 'Play video'} onClick={togglePlayback}>{!playing && <span>{ended ? <RotateCcw size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}</span>}</button>}
            {loading && !failed && <p className="landing-film-loading" role="status">Loading introduction...</p>}
            {failed && <div className="landing-film-error" role="alert"><p>The introduction could not load.</p><p>Capture a thought, plan your work, keep notes in Brain, and give one task your attention.</p><button type="button" className="landing-button" onClick={() => { sourceIndex.current = 0; manuallyPaused.current = false; loadSource(); requestPlay(); requestAnimationFrame(() => player.current?.querySelector<HTMLButtonElement>('.landing-film-play')?.focus()); }}>Try video again <RotateCcw size={16} aria-hidden="true" /></button></div>}
          </div>
        </div>
        {notice && <p className="landing-film-notice" role="status">{notice}</p>}
        <div id="landing-film-transcript" className="sr-only">{TRANSCRIPT.map(([title, body]) => <p key={title}>{title} {body}</p>)}</div>
      </div>
    </section>
  );
}
