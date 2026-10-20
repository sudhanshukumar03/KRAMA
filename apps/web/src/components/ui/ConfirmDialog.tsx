import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { BaseButton } from './BaseButton';
import './primitives.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Safe action receives initial focus; Escape/backdrop preserve the user's work. */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', pending = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const id = useId();
  const cancel = () => { if (!pending) onCancel(); };
  const panel = useModalA11y(open, cancel);
  if (!open) return null;
  return createPortal(
    <div className="krama-confirm-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) cancel(); }}>
      <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={pending} className="krama-confirm-panel">
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-description`}>{description}</p>
        <div className="krama-confirm-actions">
          <BaseButton variant="secondary" disabled={pending} onClick={cancel}>{cancelLabel}</BaseButton>
          <BaseButton variant="danger" isLoading={pending} onClick={onConfirm}>{confirmLabel}</BaseButton>
        </div>
      </div>
    </div>, document.body,
  );
}
