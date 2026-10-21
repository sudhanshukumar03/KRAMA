import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarChart2, CalendarDays, Timer } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const topics = [
  { word: 'focus', icon: Timer },
  { word: 'planning', icon: CalendarDays },
  { word: 'habits', icon: BarChart2 },
];
const HOLD_MS = 3200;

/** One quiet headline moment; a stable heading name avoids repeated announcements. */
export function HeroTopic() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden');
  const control = useRef<HTMLButtonElement>(null);
  const current = topics[index];
  const previous = topics[(index + topics.length - 1) % topics.length];
  const running = !reducedMotion && !paused && inView && pageVisible;

  useEffect(() => {
    const observer = new IntersectionObserver(entries => setInView(entries[0].isIntersecting), { rootMargin: '-72px 0px 0px', threshold: 0 });
    if (control.current) observer.observe(control.current);
    const visibilityChanged = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibilityChanged); };
  }, []);

  useLayoutEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setAdvanced(true);
      setIndex(value => (value + 1) % topics.length);
    }, HOLD_MS);
    return () => window.clearInterval(interval);
  }, [running]);

  return (
    <button ref={control} type="button" className="landing-hero-topic" data-topic={current.word} data-paused={paused || reducedMotion} data-running={running}
      aria-label={reducedMotion ? 'Show next headline topic' : paused ? 'Resume headline animation' : 'Pause headline animation'}
      title={reducedMotion ? 'Show next topic' : paused ? 'Resume changing words' : 'Pause changing words'}
      onClick={() => {
        if (reducedMotion) { setAdvanced(false); setIndex(value => (value + 1) % topics.length); }
        else setPaused(value => !value);
      }}>
      <span className="landing-topic-measure" aria-hidden="true"><CalendarDays />planning</span>
      {advanced && <span key={`previous-${index}`} className="landing-topic-word landing-topic-leave" data-topic={previous.word} aria-hidden="true"><previous.icon />{previous.word}</span>}
      <span key={index} className={`landing-topic-word${advanced ? ' landing-topic-enter' : ''}`} data-topic={current.word} aria-hidden="true"><current.icon />{current.word}</span>
    </button>
  );
}
