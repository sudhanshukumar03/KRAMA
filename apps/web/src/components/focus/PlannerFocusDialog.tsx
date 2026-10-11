import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { plannerResumeTime } from './runtime';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { TimeBlock } from '../../types/planner';
interface Props {
  started: boolean; onResume: () => void;
  kind: 'setup' | 'decision'; title: string; totalMinutes: number;
  next?: { type: string; durationMin: number }; block?: TimeBlock;
  blocks: TimeBlock[]; busy: boolean; error: string; canComplete: boolean;
  onConfigure: (work: number, rest: number) => void;
  onContinue: () => void; onDone: () => void;
  onExtend: (minutes: number, rescheduleBlockId?: string) => void;
  onClose: () => void; date: string;
}
export function PlannerFocusDialog(props: Props) {
  const { kind, title, totalMinutes, next, block, blocks, busy, error, onClose } = props;
  const dialog = useModalA11y(true, () => { if (!busy) onClose(); });
  const [strategy, setStrategy] = useState(totalMinutes <= 60 ? 'continuous' : 'suggested');
  const [work, setWork] = useState(totalMinutes <= 60 ? totalMinutes : 45);
  const [rest, setRest] = useState(totalMinutes <= 60 ? 0 : 5);
  const [extension, setExtension] = useState(15);
  const [moveNext, setMoveNext] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const tick = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(tick); }, []);
  const resumeAt = plannerResumeTime(props.date, now);
  const extensionEnd = block ? Math.max(new Date(block.endTime).getTime(), resumeAt ? new Date(resumeAt).getTime() : 0) + extension * 60000 : 0;
  const conflicts = blocks.filter(item => block && item.id !== block.id && !item.isExternal && new Date(item.startTime).getTime() < extensionEnd && new Date(item.endTime).getTime() > new Date(block.endTime).getTime());
  const nextBlock = conflicts.length === 1 ? conflicts[0] : undefined;
  const valid = Number.isInteger(work) && work >= 1 && work <= 1440 && Number.isInteger(rest) && rest >= 0 && rest <= 60;
  const validExtension = Number.isInteger(extension) && extension >= 1 && extension <= 240;
  return <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/70 p-4 select-text">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="planner-focus-title" data-state={busy ? 'pending' : error ? 'error' : 'idle'} className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-surface text-primary p-5 shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <h2 id="planner-focus-title" className="text-lg font-semibold">{kind === 'setup' ? 'Plan your focus time' : 'Is this task done?'}</h2>
      <p className="mt-2 font-medium break-words">{title}</p>
      <p className="mt-1 text-sm text-secondary">{totalMinutes} minutes reserved{block ? ' · ' + block.startTime.slice(11, 16) + '–' + block.endTime.slice(11, 16) : ' · Based on task estimate'}.</p>
      {kind === 'setup' && props.started ? <div className="mt-4 space-y-3"><p className="text-sm text-secondary">Your session plan is already in progress. Resume it without resetting completed sessions.</p><button type="button" onClick={props.onResume} className="min-h-11 px-4 rounded-lg bg-accent text-on-accent">Resume session plan</button></div> : kind === 'setup' ? <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); if (valid) props.onConfigure(strategy === 'continuous' ? totalMinutes : work, strategy === 'continuous' ? 0 : rest); }}>
        <label className="block text-sm">Session plan<select aria-label="Session plan" value={strategy} onChange={event => { const value = event.target.value; setStrategy(value); if (value === 'suggested') { setWork(totalMinutes <= 60 ? totalMinutes : 45); setRest(totalMinutes <= 60 ? 0 : 5); } }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface p-2"><option value="continuous">One continuous timer ({totalMinutes} min)</option><option value="suggested">Suggested sessions</option><option value="custom">Design my own</option></select></label>
        {strategy !== 'continuous' && <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Work minutes<input type="number" aria-label="Work minutes" min={1} max={1440} value={work} onChange={event => { setStrategy('custom'); setWork(Number(event.target.value)); }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface p-2" /></label>
          <label className="text-sm">Break minutes<input type="number" aria-label="Break minutes" min={0} max={60} value={rest} onChange={event => { setStrategy('custom'); setRest(Number(event.target.value)); }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface p-2" /></label>
        </div>}
        <p className="text-sm text-secondary">Work and breaks fit inside the reserved time. The final session uses the remaining minutes. Use 30 work / 0 break for two sessions in a one-hour block.</p>
        <button type="submit" disabled={busy || !valid} className="min-h-11 px-4 rounded-lg bg-accent text-on-accent disabled:opacity-50">Use this plan</button>
      </form> : <div className="mt-4 space-y-4">
        <p className="text-sm text-secondary">Your session is saved. {next ? 'Next: ' + (next.type === 'short_break' ? 'break' : 'work') + ' for ' + next.durationMin + ' minutes.' : 'Your planned time is finished.'}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={props.onDone} className="min-h-11 px-4 rounded-lg bg-accent text-on-accent disabled:opacity-50">{props.canComplete ? 'Mark task done' : 'Finish focus plan'}</button>
          {next && <button type="button" disabled={busy} onClick={props.onContinue} className="min-h-11 px-4 rounded-lg border border-border">Continue to next session</button>}
        </div>
        {!next && <div className="border-t border-border pt-4 space-y-3">
          <label className="block text-sm">Extra minutes<input aria-label="Extra minutes" type="number" min={1} max={240} value={extension} onChange={event => { setExtension(Number(event.target.value)); setMoveNext(false); }} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface p-2" /></label>
          {!block && <p className="text-sm text-secondary">Add a Planner time block to reserve extra time and check overlaps.</p>}
          {nextBlock && <label className="flex gap-3 text-sm items-start"><input type="checkbox" aria-label="Reschedule next block" checked={moveNext} onChange={event => setMoveNext(event.target.checked)} className="mt-1" /><span>Move “{nextBlock.title}” after this extension, preserving its duration. The move will be checked for further overlaps.</span></label>}
          {conflicts.length > 1 && <p role="alert" className="text-sm text-danger-fg">This extension overlaps multiple blocks. Adjust them in Planner first.</p>}
          <button type="button" disabled={busy || !block || !validExtension || conflicts.length > 1 || (!!nextBlock && !moveNext)} onClick={() => props.onExtend(extension, moveNext ? nextBlock?.id : undefined)} className="min-h-11 px-4 rounded-lg border border-border disabled:opacity-50">{nextBlock ? 'Reschedule next block and extend' : 'Extend focus time'}</button>
        </div>}
      </div>}
      <p role={error ? 'alert' : 'status'} className="min-h-6 mt-3 text-sm text-danger-fg">{busy ? 'Saving changes…' : error}</p>
      <div className="flex flex-wrap gap-4 mt-3"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 underline">Keep paused</button><Link to={'/app/planner?mode=day&date=' + props.date} className="min-h-11 inline-flex items-center underline">Open Planner</Link></div>
    </div>
  </div>;
}
