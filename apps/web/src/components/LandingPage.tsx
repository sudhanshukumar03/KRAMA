import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, BookOpen, CalendarDays, ChevronDown, CircleCheck, FolderKanban, Inbox, LayoutDashboard, LayoutGrid, Menu, Moon, Sun, Target, Timer, X } from 'lucide-react';
import { IntroVideo } from './landing/IntroVideo';
import { HeroTopic } from './landing/HeroTopic';
import { useTheme } from '../lib/theme';
import '../styles/landing.css';

const previews = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard, title: 'Start with what matters today.', description: 'See what needs doing, choose your priorities and start with one task.', alt: 'KRAMA dashboard with today’s priorities, quick capture, and personal projects.' },
  { id: 'planner', label: 'Planner', icon: CalendarDays, title: 'Give your work a place in the week.', description: 'Set aside time for a task and see how much room is left in your week.', alt: 'KRAMA weekly Planner showing scheduled tasks and available time.' },
  { id: 'brain', label: 'Brain', icon: BookOpen, title: 'Keep the thinking behind the work.', description: 'Save a thought while it’s fresh. Turn it into a task when you’re ready.', alt: 'KRAMA Brain Workspace with a document tree and a portfolio case study note.' },
  { id: 'focus', label: 'Focus', icon: Timer, title: 'One task. Your full attention.', description: 'Pick a task and start the timer. Your workspace stays open in another tab.', alt: 'KRAMA dedicated Focus Timer, separate from the main workspace.' },
] as const;

const workflow = [
  { kind: 'capture', label: 'Inbox', title: 'Write it down', icon: Inbox, body: 'Save a thought in Inbox. Sort it out when you’re ready.', example: 'Example: Write the case study, captured in Inbox.' },
  { kind: 'plan', label: 'Planner', title: 'Make time for it', icon: CalendarDays, body: 'Pick a task and set aside time for it in Planner.', example: 'Example: Write the case study, scheduled today from 9:00 to 9:25.' },
  { kind: 'focus', label: 'Focus', title: 'Give it your focus', icon: Timer, body: 'Open Focus from your task. The timer runs in its own tab.', example: 'Example: a 25-minute Focus timer for Write the case study.' },
] as const;

const questions = [
  { question: 'What is KRAMA?', answer: 'KRAMA brings your tasks, notes and plans into one workspace. You can jot something down, choose what to work on today and keep your longer projects and goals in view.' },
  { question: 'How is Inbox different from Tasks?', answer: 'Inbox holds the things you have just captured. When you review them, keep tasks in Tasks and notes in Brain. Choose Do today when you want to work on a task today.' },
  { question: 'Does Focus open in a separate tab?', answer: 'Yes. Start Focus from a task and the timer opens in a new tab. Your plan and notes stay open, so you can return to them whenever you need.' },
  { question: 'Can I use KRAMA on a small screen?', answer: 'Yes. Open KRAMA in your phone’s browser. The workspace adjusts to the smaller screen, and you can switch between light and dark mode.' },
];

function LandingBrand({ theme }: { theme: 'light' | 'dark' }) {
  return <img src={`/brand/krama-logo-${theme}.svg`} width="257" height="72" alt="KRAMA" className="landing-brand-image" />;
}

export function LandingPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [failedImage, setFailedImage] = useState('');
  const [loadedImage, setLoadedImage] = useState('');
  const [imageAttempt, setImageAttempt] = useState(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const mainHeading = useRef<HTMLHeadingElement>(null);
  const preview = previews[previewIndex];
  const imageKey = `${preview.id}-${resolvedTheme}-${imageAttempt}`;
  const imageLoading = loadedImage !== imageKey && failedImage !== imageKey;

  function closeMenu() {
    setMenuOpen(false);
    menuButton.current?.focus();
  }

  function navigateSection(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.focus({ preventScroll: true });
  }

  function movePreview(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % previews.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + previews.length) % previews.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = previews.length - 1;
    else return;
    event.preventDefault();
    setPreviewIndex(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="krama-landing" onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { event.preventDefault(); closeMenu(); } }}>
      <a className="landing-skip" href="#landing-main" tabIndex={0} onClick={() => mainHeading.current?.focus()}>Skip to content</a>
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <a href="#" tabIndex={0} aria-label="KRAMA home" className="landing-brand" onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0 }); }}><LandingBrand theme={resolvedTheme} /></a>
          <nav aria-label="Main navigation" className="landing-desktop-nav">
            <a href="#workspace" tabIndex={0}>Workspace</a><a href="#how-it-works" tabIndex={0}>How it works</a><a href="#questions" tabIndex={0}>Questions</a>
          </nav>
          <div className="landing-nav-actions">
            <button className="landing-icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}>
              {resolvedTheme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <Link to="/app" tabIndex={0} className="landing-button landing-button-small">Open KRAMA <ArrowRight size={16} aria-hidden="true" /></Link>
            <button ref={menuButton} className="landing-icon-button landing-menu-button" type="button" aria-expanded={menuOpen} aria-controls="landing-mobile-nav" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
          <nav id="landing-mobile-nav" aria-label="Mobile navigation" className="landing-mobile-nav" hidden={!menuOpen}>
            <a href="#workspace" tabIndex={0} onClick={() => navigateSection('workspace')}>Workspace <ArrowRight size={16} aria-hidden="true" /></a>
            <a href="#how-it-works" tabIndex={0} onClick={() => navigateSection('how-it-works')}>How it works <ArrowRight size={16} aria-hidden="true" /></a>
            <a href="#questions" tabIndex={0} onClick={() => navigateSection('questions')}>Questions <ArrowRight size={16} aria-hidden="true" /></a>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-container landing-hero" aria-labelledby="landing-main">
          <div>
            <h1 id="landing-main" tabIndex={-1} ref={mainHeading} aria-label="Make room for focus, planning and habits."><span aria-hidden="true">Make room for</span><br /><HeroTopic /></h1>
          </div>
          <div className="landing-hero-copy">
            <p>Plan your day, keep your notes close and focus on what’s next.</p>
            <a href="#workspace" tabIndex={0} className="landing-hero-link" onClick={() => navigateSection('workspace')}><LayoutGrid size={16} aria-hidden="true" />Explore the workspace <ArrowDown size={16} aria-hidden="true" /></a>
          </div>
        </section>

        <section id="workspace" tabIndex={-1} className="landing-container landing-product" aria-label="Explore KRAMA">
          <div className="landing-product-bar">
            <div role="tablist" aria-label="Workspace previews" className="landing-preview-tabs">
              {previews.map((item, index) => <button key={item.id} ref={node => { tabs.current[index] = node; }} id={`preview-tab-${item.id}`} role="tab" aria-selected={previewIndex === index} aria-controls="landing-preview-panel" tabIndex={previewIndex === index ? 0 : -1} onClick={() => setPreviewIndex(index)} onKeyDown={event => movePreview(event, index)}><item.icon size={16} aria-hidden="true" />{item.label}</button>)}
            </div>
          </div>
          <div role="tabpanel" id="landing-preview-panel" aria-labelledby={`preview-tab-${preview.id}`} aria-busy={imageLoading} tabIndex={0} className="landing-preview-panel" data-preview={preview.id}>
            {imageLoading && <span className="landing-preview-loading" role="status">Loading preview…</span>}
            {failedImage === imageKey ? <div className="landing-preview-error" role="alert"><p>The product preview could not load.</p><button className="landing-button" type="button" onClick={() => { setImageAttempt(value => value + 1); document.getElementById('landing-preview-panel')?.focus({ preventScroll: true }); }}>Try again</button></div> : <picture key={imageKey}>
              <source media="(max-width: 600px)" srcSet={`/landing/${preview.id}-mobile-${resolvedTheme}.png`} />
              <img src={`/landing/${preview.id}-desktop-${resolvedTheme}.png`} alt={preview.alt} width="1440" height="900" fetchPriority="high" onLoad={() => setLoadedImage(imageKey)} onError={() => setFailedImage(imageKey)} />
            </picture>}
          </div>
          <div className="landing-preview-caption" aria-live="polite" aria-atomic="true"><div><strong>{preview.title}</strong><p>{preview.description}</p></div></div>
        </section>

        <section id="how-it-works" tabIndex={-1} className="landing-container landing-workflow landing-section" aria-labelledby="workflow-heading">
          <div className="landing-section-heading"><h2 id="workflow-heading">From a thought to a finished task</h2></div>
          <ol className="landing-workflow-list">
            {workflow.map(step => <li key={step.kind}>
              <div className={`landing-step-visual landing-step-visual-${step.kind}`} role="img" aria-label={step.example}>
                <div className="landing-step-app"><step.icon size={17} aria-hidden="true" /><span>{step.label}</span></div>
                <div className="landing-step-scene">
                  {step.kind === 'capture' && <div className="landing-capture-example"><span className="landing-capture-mark" /><div><span className="landing-workflow-task">Write the case study</span><span className="landing-workflow-meta">Just captured</span></div></div>}
                  {step.kind === 'plan' && <div className="landing-plan-example"><div className="landing-plan-hours"><span>9:00</span><span>9:30</span></div><div className="landing-plan-block"><span className="landing-workflow-task">Write the case study</span><span className="landing-workflow-meta">9:00 – 9:25</span></div></div>}
                  {step.kind === 'focus' && <div className="landing-focus-example"><span className="landing-workflow-clock">25:00</span><span className="landing-workflow-task">Write the case study</span></div>}
                </div>
              </div>
              <h3>{step.title}</h3><p>{step.body}</p>
            </li>)}
          </ol>
        </section>

        <IntroVideo theme={resolvedTheme} />

        <section className="landing-bigger-section" aria-labelledby="workspace-heading">
          <div className="landing-container landing-bigger">
            <div className="landing-section-heading">
              <h2 id="workspace-heading">Keep your notes and plans connected</h2>
            </div>
            <div className="landing-knowledge">
              <div className="landing-knowledge-copy">
                <BookOpen size={26} strokeWidth={1.5} aria-hidden="true" />
                <h3>Find the thought you need</h3>
                <p>Use Brain for the notes you want to come back to: a meeting, something you read, or an idea for a project. When a note gives you something to do, create a task from it.</p>
              </div>
              <figure className="landing-knowledge-preview">
                <picture><source media="(max-width: 600px)" srcSet={`/landing/brain-detail-mobile-${resolvedTheme}.png`} /><img src={`/landing/brain-detail-desktop-${resolvedTheme}.png`} alt="Example portfolio note with the problem, design decisions and a next writing session." width="848" height="580" loading="lazy" /></picture>
                <figcaption>Brain Workspace</figcaption>
              </figure>
            </div>
            <div className="landing-project-story">
              <div className="landing-project-copy">
                <h3>Know what to work on next.</h3>
                <p>Keep your project’s tasks and notes in one place. See what’s done and choose what to work on next.</p>
              </div>
              <figure className="landing-project-example" aria-label="Example: a goal connected to a project and its tasks">
                <div className="landing-project-stage">
                  <div className="landing-example-goal"><Target size={18} aria-hidden="true" /><div><span>Working towards</span><p>Build a portfolio I’m proud of</p></div></div>
                  <div className="landing-example-project">
                    <div className="landing-example-project-heading"><span className="landing-example-project-icon"><FolderKanban size={22} aria-hidden="true" /></span><h4>Portfolio refresh</h4></div>
                    <ul aria-label="Example project tasks">
                      <li className="landing-example-next-task"><span className="landing-example-task-dot" aria-hidden="true" /><div><span className="landing-example-task-label">Up next</span><p>Refine the portfolio case study</p><small>45 min</small></div></li>
                      <li className="landing-example-done-task"><CircleCheck size={18} aria-hidden="true" /><div><p>Review the completed draft</p><small>Done</small></div></li>
                    </ul>
                    <div className="landing-example-note"><BookOpen size={17} aria-hidden="true" /><div><span>Linked note</span><p>Case study notes</p></div></div>
                    <div className="landing-example-project-footer"><span>1 of 2 tasks complete</span><span className="landing-example-progress" aria-hidden="true"><span /></span></div>
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </section>

        <section id="questions" tabIndex={-1} className="landing-container landing-questions landing-section" aria-labelledby="questions-heading">
          <div className="landing-questions-intro"><h2 id="questions-heading">Get to know KRAMA</h2></div>
          <div className="landing-faq-list">{questions.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
        </section>

      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-identity">
            <a href="#" className="landing-brand" aria-label="KRAMA home"><LandingBrand theme={resolvedTheme} /></a>
            <p>A personal workspace for your tasks, notes and plans.</p>
          </div>
          <nav aria-label="Footer navigation"><a href="#workspace">Workspace</a><a href="#how-it-works">How it works</a><a href="#questions">Questions</a></nav>
          <small className="landing-footer-copyright">© {new Date().getFullYear()} KRAMA</small>
        </div>
      </footer>
    </div>
  );
}
