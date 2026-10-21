import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface PreviewDialogProps {
  title: string;
  alt: string;
  desktopSrc: string;
  mobileSrc: string;
  onClose: () => void;
}

/** Keep screenshots readable without making the public page longer. */
export function PreviewDialog({ title, alt, desktopSrc, mobileSrc, onClose }: PreviewDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const containFocus = useModalA11y(true, onClose);
  const id = useId();
  const [fit, setFit] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; failed: boolean } | null>(null);
  const imageKey = `${desktopSrc}-${mobileSrc}-${attempt}`;
  const loaded = settled?.key === imageKey;
  const failed = loaded && settled.failed;
  const retryQuery = attempt ? `?retry=${attempt}` : '';

  useEffect(() => {
    const panel = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The native top layer makes the page inert; the shared hook wraps Tab order.
    panel.showModal();
    return () => {
      panel.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialog} className="landing-preview-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <div ref={containFocus} className="landing-preview-dialog-layout">
        <header className="landing-preview-dialog-header">
          <h2 id={`${id}-title`}>{title}</h2>
          <button type="button" className="landing-icon-button" aria-label="Close preview" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="landing-preview-dialog-tools">
          <div className="landing-preview-sizes" role="group" aria-label="Preview size">
            <button type="button" aria-pressed={fit} onClick={() => setFit(true)}>Fit preview</button>
            <button type="button" aria-pressed={!fit} onClick={() => setFit(false)}>Actual size</button>
          </div>
          <p id={`${id}-help`}>{fit ? 'The whole screenshot fits in the viewer.' : 'Scroll to explore the screenshot at its original size.'}</p>
        </div>
        <div className="landing-preview-dialog-canvas" data-fit={fit} role="region" aria-label={`${title} image`} tabIndex={0} aria-busy={!loaded}>
          {!loaded && <p className="landing-preview-dialog-message" role="status">Loading preview...</p>}
          {failed ? <div className="landing-preview-dialog-message" role="alert"><p>The preview could not load.</p><button type="button" className="landing-button" onClick={() => { setAttempt(value => value + 1); dialog.current?.querySelector<HTMLElement>('.landing-preview-dialog-canvas')?.focus(); }}>Try again</button></div> :
            <picture key={imageKey}>
              <source media="(max-width: 600px)" srcSet={`${mobileSrc}${retryQuery}`} />
              <img src={`${desktopSrc}${retryQuery}`} alt={alt} onLoad={() => setSettled({ key: imageKey, failed: false })} onError={() => setSettled({ key: imageKey, failed: true })} />
            </picture>}
        </div>
      </div>
    </dialog>
  );
}
