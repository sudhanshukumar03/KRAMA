type GoalNode = { id: string; parentGoalId: string | null };

/** Keep the flat API collection while giving every node its complete subtree. */
export function attachGoalDescendants<T extends GoalNode>(goals: T[]): Array<T & { childGoals: Array<T & { childGoals: unknown[] }> }> {
  type Tree = T & { childGoals: Tree[] };
  const nodes = new Map<string, Tree>(goals.map(goal => [goal.id, { ...goal, childGoals: [] }]));
  for (const node of nodes.values()) {
    const ancestors = new Set([node.id]);
    let parent = node.parentGoalId ? nodes.get(node.parentGoalId) : undefined;
    let cursor = parent;
    while (cursor) {
      if (ancestors.has(cursor.id)) { parent = undefined; break; }
      ancestors.add(cursor.id);
      cursor = cursor.parentGoalId ? nodes.get(cursor.parentGoalId) : undefined;
    }
    if (parent) parent.childGoals.push(node);
  }
  return [...nodes.values()];
}
