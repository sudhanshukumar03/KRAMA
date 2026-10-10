// Anonymous/global keys are deliberately not imported into an authenticated account.
export function focusStorageKey(userId: string | undefined, preference: string) {
  return `krama.focus.${userId ?? 'anonymous'}.${preference}`;
}
