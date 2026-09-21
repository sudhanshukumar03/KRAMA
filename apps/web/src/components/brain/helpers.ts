import type { DocumentWithRelations } from '../../types/schema';

// Color definitions for tags
export const TAG_COLORS: { name: string; bg: string; text: string; border: string }[] = [
  { name: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  { name: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { name: 'purple', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  { name: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { name: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  { name: 'cyan', bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
];

export function getTagColor(colorName?: string | null) {
  const match = TAG_COLORS.find(c => c.name === colorName);
  return match || TAG_COLORS[0];
}

// Tree calculation helpers
export function getDocDepth(docId: string, pages: DocumentWithRelations[]): number {
  let depth = 1;
  let curr = pages.find(p => p.id === docId);
  while (curr && curr.parentId && depth < 10) {
    depth++;
    const pid: string = curr.parentId;
    curr = pages.find(p => p.id === pid);
  }
  return depth;
}

export function getSubtreeDepth(docId: string, pages: DocumentWithRelations[]): number {
  const children = pages.filter(p => p.parentId === docId);
  if (children.length === 0) return 1;
  let max = 1;
  for (const child of children) {
    const childDepth = getSubtreeDepth(child.id, pages);
    if (childDepth + 1 > max) max = childDepth + 1;
  }
  return max;
}

export function isDescendantOf(docId: string, potentialDescendantId: string, pages: DocumentWithRelations[]): boolean {
  if (docId === potentialDescendantId) return true;
  let curr = pages.find(p => p.id === potentialDescendantId);
  let iterations = 0;
  while (curr && curr.parentId && iterations < 10) {
    if (curr.parentId === docId) return true;
    const pid: string = curr.parentId;
    curr = pages.find(p => p.id === pid);
    iterations++;
  }
  return false;
}
