import type { DocumentWithRelations } from '../../types/schema';

// Color definitions for tags
export const TAG_COLORS: { name: string; bg: string; text: string; border: string }[] = [
  { name: 'blue', bg: 'bg-accent-subtle', text: 'text-accent-fg', border: 'border-accent/30' },
  { name: 'emerald', bg: 'bg-success-bg', text: 'text-success-fg', border: 'border-success-border' },
  { name: 'purple', bg: 'bg-cat-timeblocks-bg', text: 'text-cat-timeblocks', border: 'border-cat-timeblocks/30' },
  { name: 'amber', bg: 'bg-warning-bg', text: 'text-warning-fg', border: 'border-warning-border' },
  { name: 'rose', bg: 'bg-danger-bg', text: 'text-danger-fg', border: 'border-danger-border' },
  { name: 'cyan', bg: 'bg-cat-routines-bg', text: 'text-cat-routines', border: 'border-cat-routines/30' },
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
