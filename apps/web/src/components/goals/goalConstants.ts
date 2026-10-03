import { Sparkles, Heart, Briefcase, Coins, BookOpen, Palette, Compass } from 'lucide-react';
import type { GoalWithRelations } from '../../types/schema';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELED';

export const LIFE_PILLARS = [
  { id: 'all', label: 'All Pillars', icon: Sparkles, color: 'text-accent-fg bg-accent-subtle border-accent/20' },
  { id: 'health', label: 'Health & Vitality', icon: Heart, color: 'text-success-fg bg-success-bg border-success-border' },
  { id: 'career', label: 'Career & Projects', icon: Briefcase, color: 'text-cat-projects bg-cat-projects-bg border-cat-projects/20' },
  { id: 'finance', label: 'Wealth & Finance', icon: Coins, color: 'text-warning-fg bg-warning-bg border-warning-border' },
  { id: 'learning', label: 'Mindset & Growth', icon: BookOpen, color: 'text-cat-tasks bg-cat-tasks-bg border-cat-tasks/20' },
  { id: 'creative', label: 'Creative & Hustle', icon: Palette, color: 'text-accent-fg bg-accent-subtle border-accent/20' },
  { id: 'lifestyle', label: 'Personal & Lifestyle', icon: Compass, color: 'text-cat-routines bg-cat-routines-bg border-cat-routines/20' },
] as const;

export type LifePillarId = typeof LIFE_PILLARS[number]['id'];

export function getPillar(pillarId?: string) {
  return LIFE_PILLARS.find((p) => p.id === pillarId) || LIFE_PILLARS[0];
}

// Rollup calculation matching backend's weighted formula
export function computeWeightedProgress(childGoals: GoalWithRelations[]): number {
  if (!childGoals || childGoals.length === 0) return 0;
  const totalWeight = childGoals.reduce((sum, c) => {
    const w = Number((c as any).metadata?.weight);
    return sum + (Number.isFinite(w) && w > 0 ? w : 1);
  }, 0) || 1;
  return Math.round(
    childGoals.reduce((sum, c) => {
      const w = Number((c as any).metadata?.weight);
      const weight = Number.isFinite(w) && w > 0 ? w : 1;
      return sum + c.progress * weight;
    }, 0) / totalWeight
  );
}
