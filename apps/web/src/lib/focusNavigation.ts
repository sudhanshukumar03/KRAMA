/** Open Focus directly from the user action so the workspace stays open. */
export function openFocusTab(params?: URLSearchParams) {
  const query = params?.toString();
  window.open(query ? `/focus?${query}` : '/focus', '_blank', 'noopener,noreferrer');
}
