import { useCallback, useEffect, useRef, useState } from 'react';

const modalStack: HTMLDivElement[] = [];

/**
 * Accessibility helper for modal dialogs. While `open`:
 *  - closes the dialog on Escape,
 *  - moves focus into the dialog on open,
 *  - traps Tab / Shift+Tab focus within the dialog,
 *  - restores focus to the previously-focused element on close.
 *
 * Attach the returned ref to the dialog panel element (the one carrying
 * role="dialog" aria-modal="true").
 */
export function useModalA11y(open: boolean, onClose: () => void) {
  // Loading/error panels may be replaced while the dialog remains open. Track
  // the actual node so focus and the modal stack follow the replacement panel.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setPanel(node), []);
  const wasOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  // Capture the opener before React commits child autoFocus inputs. Keep that
  // opener when a loading panel is replaced or the dialog rerenders.
  if (open && !wasOpen.current && typeof document !== 'undefined') returnFocus.current = document.activeElement as HTMLElement | null;
  wasOpen.current = open;
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (!panel) return;
    modalStack.push(panel);
    if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;

    const getFocusable = (): HTMLElement[] => {
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), summary, textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden')
        .sort((a, b) => (a.tabIndex || Number.MAX_SAFE_INTEGER) - (b.tabIndex || Number.MAX_SAFE_INTEGER));
    };

    // Move focus into the dialog on the next tick (after it mounts).
    const focusTimer = window.setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) focusable[0].focus();
      else panel.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== panel) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      // WebKit's native tab order can skip controls and leave a dialog before
      // reaching our last candidate. Handle the whole cycle consistently.
      e.preventDefault();
      if (focusable.length === 0) {
        panel.focus();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const index = active ? focusable.indexOf(active) : -1;
      const next = index < 0 ? (e.shiftKey ? focusable.length - 1 : 0)
        : (index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      focusable[next].focus();
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      const index = modalStack.indexOf(panel);
      if (index >= 0) modalStack.splice(index, 1);
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, [open, panel]);

  return containerRef;
}
