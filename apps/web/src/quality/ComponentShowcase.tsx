import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BaseButton } from '../components/ui/BaseButton';
import { TextField } from '../components/ui/TextField';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useTheme } from '../lib/theme';
import '../index.css';

/** Isolated developer entry. No API, credentials or production route dependency. */
function ComponentShowcase() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <main className="krama-workspace" style={{minHeight:'100dvh',height:'auto',padding:24,background:'var(--bg-base)',color:'var(--text-primary)'}}>
      <div style={{maxWidth:720,marginInline:'auto',display:'grid',gap:24}}>
        <header style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:16}}><h1 style={{fontSize:28,fontWeight:600}}>Component review</h1><BaseButton variant="secondary" onClick={toggleTheme}>Switch to {resolvedTheme === 'light' ? 'dark' : 'light'} mode</BaseButton></header>
        <section aria-labelledby="review-buttons" style={{display:'grid',gap:16}}><h2 id="review-buttons">Actions</h2><div style={{display:'flex',flexWrap:'wrap',gap:12}}>
          <BaseButton>Save changes</BaseButton><BaseButton variant="secondary">Cancel</BaseButton><BaseButton disabled>Unavailable</BaseButton><BaseButton isLoading>Saving changes</BaseButton>
        </div></section>
        <section aria-labelledby="review-fields" style={{display:'grid',gap:16}}><h2 id="review-fields">Fields</h2>
          <TextField label="Goal title" defaultValue="A goal with a clear next step" hint="A short title that helps you recognize the goal." />
          <TextField label="Required title" error="Enter a title before saving." aria-required="true" />
          <TextField label="Read-only value" value="Your current workspace" readOnly />
        </section>
        <section aria-labelledby="review-confirmation" style={{display:'grid',gap:16}}><h2 id="review-confirmation">Draft recovery</h2>
          <BaseButton variant="secondary" onClick={()=>setOpen(true)}>Review discard confirmation</BaseButton>
          <p role="status">{confirmed ? 'Changes discarded.' : 'Draft retained.'}</p>
        </section>
        <ConfirmDialog open={open} title="Discard unsaved changes?" description="Keep editing to preserve the draft, or discard it to continue." cancelLabel="Keep editing" confirmLabel="Discard changes" onCancel={()=>setOpen(false)} onConfirm={()=>{setConfirmed(true);setOpen(false);}} />
      </div>
    </main>
  );
}

createRoot(document.getElementById('quality-root')!).render(<ComponentShowcase />);
