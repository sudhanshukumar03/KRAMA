import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, TrendingUp, BookOpen, AlertCircle, Plus, Star, Link as LinkIcon } from 'lucide-react';
import { skillsApi } from '../api/skills';
import { toast } from 'sonner';

export function SkillsModule() {
 const [isAdding, setIsAdding] = useState(false);
 const [newSkill, setNewSkill] = useState({ name: '', targetLevel: 5, category: '' });
 const queryClient = useQueryClient();
 const createMutation = useMutation({
 mutationFn: (data: any) => skillsApi.create(data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['skills-overview'] });
 setIsAdding(false);
 setNewSkill({ name: '', targetLevel: 5, category: '' });
 toast.success('Skill added successfully');
 },
 onError: (err: any) => {
 toast.error('Failed to create skill: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
 }
 });

 const { data: overview, isLoading } = useQuery({
 queryKey: ['skills-overview'],
 queryFn: skillsApi.getOverview,
 });

 if (isLoading) {
 return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
 }

 const { metrics, skills, topGaps } = overview || { metrics: null, skills: [], topGaps: [] };

 return (
 <>
 {isAdding && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
 <div className="bg-surface p-6 rounded-xl w-full max-w-md shadow-xl border border-border">
 <h2 className="text-xl font-bold mb-4">Add New Skill</h2>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium mb-1">Skill Name</label>
 <input type="text" value={newSkill.name} onChange={e => setNewSkill({...newSkill, name: e.target.value})} className="w-full p-2 border rounded-md bg-surface-hover border-border" placeholder="e.g. React, Negotiation..." />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Category (Optional)</label>
 <input type="text" value={newSkill.category} onChange={e => setNewSkill({...newSkill, category: e.target.value})} className="w-full p-2 border rounded-md bg-surface-hover border-border" placeholder="e.g. Frontend, Soft Skills..." />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Target Level (1-10)</label>
 <input type="number" min="1" max="10" value={newSkill.targetLevel} onChange={e => setNewSkill({...newSkill, targetLevel: parseInt(e.target.value)})} className="w-full p-2 border rounded-md bg-surface-hover border-border" />
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-secondary hover:bg-surface-hover rounded-md transition-colors">Cancel</button>
 <button onClick={() => createMutation.mutate(newSkill)} disabled={!newSkill.name || createMutation.isPending} className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors">
 {createMutation.isPending ? 'Saving...' : 'Save Skill'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="flex-1 overflow-y-auto bg-canvas">
 <div className="p-8 max-w-7xl mx-auto space-y-8">
 
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-primary">Skills</h1>
 <p className="text-secondary mt-1">Track and develop your capabilities across your workspace.</p>
 </div>
 <button onClick={() => setIsAdding(true)} className="flex items-center justify-center px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
 <Plus className="w-4 h-4 mr-2" />
 Add Skill
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-6 pb-2 flex flex-row items-center justify-between">
 <h3 className="text-sm font-medium text-secondary">Total Skills</h3>
 <BookOpen className="h-4 w-4 text-muted-foreground text-accent" />
 </div>
 <div className="p-6">
 <div className="text-2xl font-bold">{metrics?.totalSkills || 0}</div>
 <p className="text-xs text-muted-foreground mt-1">Active tracked skills</p>
 </div>
 </div>
 
 <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-6 pb-2 flex flex-row items-center justify-between">
 <h3 className="text-sm font-medium text-secondary">Average Level</h3>
 <Star className="h-4 w-4 text-muted-foreground text-warning" />
 </div>
 <div className="p-6">
 <div className="text-2xl font-bold">{metrics?.averageLevel || 0}<span className="text-lg text-muted">/10</span></div>
 <p className="text-xs text-muted-foreground mt-1">Across all skills</p>
 </div>
 </div>

 <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-6 pb-2 flex flex-row items-center justify-between">
 <h3 className="text-sm font-medium text-secondary">In Progress</h3>
 <TrendingUp className="h-4 w-4 text-muted-foreground text-success" />
 </div>
 <div className="p-6">
 <div className="text-2xl font-bold">{metrics?.inProgress || 0}</div>
 <p className="text-xs text-muted-foreground mt-1">Skills currently developing</p>
 </div>
 </div>

 <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-6 pb-2 flex flex-row items-center justify-between">
 <h3 className="text-sm font-medium text-secondary">Goal Progress</h3>
 <Target className="h-4 w-4 text-muted-foreground text-[var(--cat-routines)]" />
 </div>
 <div className="p-6">
 {metrics?.goalProgress ? (
 <>
 <div className="w-full bg-surface-hover rounded-full overflow-hidden mt-2"><div className="bg-accent h-full" style={{ width: `${(metrics.goalProgress.current / metrics.goalProgress.target) * 100}%` }}></div></div>
 <div className="w-full bg-surface-hover rounded-full overflow-hidden mt-2"><div className="bg-accent h-full" style={{ width: `${(metrics.goalProgress.current / metrics.goalProgress.target) * 100}%` }}></div></div>
 </>
 ) : (
 <div className="text-sm text-secondary">No skill goal set</div>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-6 border-b border-border">
 <h3 className="text-lg font-semibold text-primary">Skill Inventory</h3>
 </div>
 <div className="p-6">
 {skills.length === 0 ? (
 <div className="text-center py-8 text-secondary">No skills added yet.</div>
 ) : (
 <div className="space-y-4">
 {skills.map((skill: any) => (
 <div key={skill.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface shadow-sm">
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <h3 className="font-semibold text-primary">{skill.name}</h3>
 {skill.status === 'COMPLETED' ? (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-tint text-success border-transparent">Mastered</span>
 ) : skill.status === 'IN_PROGRESS' ? (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-tint text-accent border-transparent">In Progress</span>
 ) : (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border text-secondary">Not Started</span>
 )}
 </div>
 
 <div className="flex items-center gap-4 mt-3">
 {skill._count?.goals > 0 && (
 <div className="flex items-center text-xs text-secondary"><Target className="w-3 h-3 mr-1"/> {skill._count.goals} Goal</div>
 )}
 {skill._count?.projects > 0 && (
 <div className="flex items-center text-xs text-secondary"><BookOpen className="w-3 h-3 mr-1"/> {skill._count.projects} Projects</div>
 )}
 {skill._count?.tasks > 0 && (
 <div className="flex items-center text-xs text-secondary"><LinkIcon className="w-3 h-3 mr-1"/> {skill._count.tasks} Tasks</div>
 )}
 {skill._count?.habits > 0 && (
 <div className="flex items-center text-xs text-secondary"><TrendingUp className="w-3 h-3 mr-1"/> {skill._count.habits} Habits</div>
 )}
 </div>
 </div>
 
 <div className="w-48 text-right">
 <div className="text-sm font-medium mb-1">Level {skill.currentLevel} / {skill.targetLevel}</div>
 <div className="w-full bg-surface-hover rounded-full overflow-hidden h-2"><div className="bg-accent h-full" style={{ width: `${(skill.currentLevel / skill.targetLevel) * 100}%` }}></div></div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-6 border-b border-border">
 <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
 <AlertCircle className="w-5 h-5 text-error" />
 Top Gaps
 </h3>
 </div>
 <div className="p-6">
 {topGaps.length === 0 ? (
 <div className="text-sm text-secondary">No skill gaps found.</div>
 ) : (
 <div className="space-y-4">
 {topGaps.map((skill: any) => (
 <div key={skill.id} className="flex justify-between items-center">
 <div className="text-sm font-medium">{skill.name}</div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-muted">Gap:</span>
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-tint text-error">-{skill.gap}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 </div>
 </div>
 </>
 );
}

