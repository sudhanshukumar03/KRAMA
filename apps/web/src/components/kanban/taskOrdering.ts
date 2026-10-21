type OrderedTask = { id: string; status: string; position: number };

/** Insert beside an anchor using every task in the column, including hidden tasks. */
export function taskPositionForMove(
  tasks: readonly OrderedTask[],
  activeId: string,
  status: string,
  anchorId?: string,
  placement: 'before' | 'after' = 'before',
): number | null {
  const column = tasks.filter(task => task.status === status && task.id !== activeId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const anchorIndex = anchorId === undefined ? column.length : column.findIndex(task => task.id === anchorId);
  if (anchorIndex < 0) return null;
  const index = anchorIndex + (anchorId !== undefined && placement === 'after' ? 1 : 0);
  const before = column[index - 1];
  const after = column[index];
  const position = before && after ? before.position / 2 + after.position / 2
    : before ? before.position + 1000 : after ? after.position - 1000 : 1000;
  // Never substitute a colliding coordinate when float precision is exhausted.
  if (!Number.isFinite(position) || (before && position <= before.position) || (after && position >= after.position)) return null;
  return position;
}
