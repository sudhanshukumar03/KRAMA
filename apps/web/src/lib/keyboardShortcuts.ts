/** Shared ownership rules for app/page shortcuts. Dialog controls own their keys. */
export function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]'));
}

export function hasOpenModal() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"], dialog[open]'))
    .some(panel => panel.getClientRects().length > 0 && getComputedStyle(panel).visibility !== 'hidden');
}

export function canHandlePageShortcut(event: KeyboardEvent) {
  return !event.defaultPrevented && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey
    && !isTypingTarget(event.target) && !hasOpenModal();
}
