import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import {
 Scale,
 Plus,
 Search,
 ChevronDown,
 ChevronRight,
 Trash2,
 Edit,
 Calendar,
 FolderKanban,
 X,
} from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';
import type { DecisionWithRelations } from '../types/schema';

// ─── Create / Edit Modal ────────────────────────────────────────────────────

interface DecisionFormData {
 title: string;
 metadata: string;
 rationale: string;
 options: string[];
 outcomes: string;
 createdAt: string;
 
}

const emptyForm: DecisionFormData = {
 title: '',
 metadata: '',
 rationale: '',
 options: [],
 outcomes: '',
 createdAt: new Date().toISOString().split('T')[0],
 
};

function DecisionModal({
 open,
 onClose,
 initial,
 projects,
 onSubmit,
 isSubmitting,
}: {
 open: boolean;
 onClose: () => void;
 initial: DecisionFormData;
 projects: { id: string; name: string }[];
 onSubmit: (data: DecisionFormData) => void;
 isSubmitting: boolean;
}) {
 const [form, setForm] = useState<DecisionFormData>(initial);
 const [tagInput, setTagInput] = useState('');

 // Reset form when initial changes (open for edit vs create)
 useState(() => {
 setForm(initial);
 setTagInput('');
 });

 if (!open) return null;

 const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
 e.preventDefault();
 const newTag = tagInput.trim().replace(/,$/, '');
 if (newTag && !form.options.includes(newTag)) {
 setForm(prev => ({ ...prev, options: [...prev.options, newTag] }));
 }
 setTagInput('');
 } else if (e.key === 'Backspace' && !tagInput && form.options.length > 0) {
 setForm(prev => ({ ...prev, options: prev.options.slice(0, -1) }));
 }
 };

 const removeTag = (tag: string) => {
 setForm(prev => ({ ...prev, options: prev.options.filter(t => t !== tag) }));
 };

 return (
 <div
 onClick={onClose}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div
 onClick={e => e.stopPropagation()}
 className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
 >
 {/* Modal Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-border">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
 <Scale className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">
 {initial.title ? 'Edit Decision' : 'Log Decision'}
 </h3>
 </div>
 <button
 onClick={onClose}
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Modal Body */}
 <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
 {/* Title */}
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Title <span className="text-[#DC2626]">*</span></label>
 <input
 type="text"
 value={form.title}
 onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
 placeholder="e.g. Adopt tRPC over REST for internal APIs"
 className="w-full px-3 py-2 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] placeholder:text-muted transition-all"
 />
 </div>

 {/* Context */}
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Context</label>
 <textarea
 value={form.metadata}
 onChange={e => setForm(prev => ({ ...prev, context: e.target.value }))}
 placeholder="What prompted this decision? What's the background?"
 rows={3}
 className="w-full px-3 py-2 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] placeholder:text-muted transition-all resize-none"
 />
 </div>

 {/* Reasoning */}
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Reasoning</label>
 <textarea
 value={form.rationale}
 onChange={e => setForm(prev => ({ ...prev, reasoning: e.target.value }))}
 placeholder="Why was this the best option? What trade-offs were considered?"
 rows={3}
 className="w-full px-3 py-2 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] placeholder:text-muted transition-all resize-none"
 />
 </div>

 {/* Alternatives Considered (tag input) */}
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Alternatives Considered</label>
 <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 border border-border rounded-lg bg-surface focus-within:ring-2 focus-within:ring-[#2563EB]/30 focus-within:border-[#2563EB] transition-all">
 {form.options.map(tag => (
 <span
 key={tag}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-hover border border-border text-caption text-primary font-medium"
 >
 {tag}
 <button onClick={() => removeTag(tag)} className="text-muted hover:text-[#DC2626] transition-colors">
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 <input
 type="text"
 value={tagInput}
 onChange={e => setTagInput(e.target.value)}
 onKeyDown={handleTagKeyDown}
 placeholder={form.options.length === 0 ? 'Type and press Enter or comma to add...' : ''}
 className="flex-1 min-w-[120px] text-body bg-transparent border-none outline-none placeholder:text-muted"
 />
 </div>
 </div>

 {/* Outcome */}
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Outcome</label>
 <input
 type="text"
 value={form.outcomes}
 onChange={e => setForm(prev => ({ ...prev, outcome: e.target.value }))}
 placeholder="What was decided? What action was taken?"
 className="w-full px-3 py-2 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] placeholder:text-muted transition-all"
 />
 </div>

 {/* Date + Project row */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Date</label>
 <input
 type="date"
 value={form.createdAt}
 onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
 className="w-full px-3 py-2 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
 />
 </div>
 <div>
 <label className="block text-caption font-medium text-primary mb-1.5">Linked Project</label>
 <select
 value={form.metadata}
 onChange={e => setForm(prev => ({ ...prev, metadata: e.target.value }))}
 className="w-full px-3 py-2 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
 >
 <option value="">No project</option>
 {projects.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Modal Footer */}
 <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface-hover/50 rounded-b-2xl">
 <BaseButton variant="secondary" size="sm" onClick={onClose}>
 Cancel
 </BaseButton>
 <BaseButton
 size="sm"
 onClick={() => onSubmit(form)}
 disabled={!form.title.trim()}
 isLoading={isSubmitting}
 >
 {initial.title ? 'Save Changes' : 'Log Decision'}
 </BaseButton>
 </div>
 </div>
 </div>
 );
}

// ─── Decision Card ──────────────────────────────────────────────────────────

function DecisionCard({
 decision,
 onEdit,
 onDelete,
}: {
 decision: DecisionWithRelations;
 onEdit: (d: DecisionWithRelations) => void;
 onDelete: (d: DecisionWithRelations) => void;
}) {
 const [expanded, setExpanded] = useState(false);

 const formattedDate = new Date(decision.createdAt).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });

 return (
 <div
 className={cn(
 'bg-surface border border-border rounded-xl transition-all duration-150 hover:border-[#2563EB]/40 shadow-sm group',
 expanded && 'border-[#2563EB]/30 shadow-md'
 )}
 >
 {/* Card Header – always visible */}
 <div
 className="flex items-start justify-between px-5 py-4 cursor-pointer select-none"
 onClick={() => setExpanded(!expanded)}
 >
 <div className="flex items-start gap-3 min-w-0 flex-1">
 <div className="mt-0.5 shrink-0">
 {expanded ? (
 <ChevronDown className="w-4 h-4 text-[#2563EB] stroke-[2]" />
 ) : (
 <ChevronRight className="w-4 h-4 text-muted group-hover:text-[#2563EB] stroke-[2] transition-colors" />
 )}
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="text-card text-primary mb-2 group-hover:text-[#2563EB] transition-colors truncate">
 {decision.title}
 </h3>
 <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
 <span className="inline-flex items-center gap-1 text-[10px] font-mono text-secondary">
 <Calendar className="w-3 h-3 stroke-[1.75]" />
 {formattedDate}
 </span>
 {decision.linkedProject && (
 <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#2563EB] bg-[#2563EB]/8 border border-[#2563EB]/20 px-1.5 py-0.5 rounded">
 <FolderKanban className="w-3 h-3 stroke-[1.75]" />
 {decision.linkedProject.name}
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1 shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={e => {
 e.stopPropagation();
 onEdit(decision);
 }}
 className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-[#2563EB] hover:bg-[#2563EB]/10 transition-all"
 title="Edit"
 >
 <Edit className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>
 <button
 onClick={e => {
 e.stopPropagation();
 onDelete(decision);
 }}
 className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-[#DC2626] hover:bg-red-50 transition-all"
 title="Delete"
 >
 <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>
 </div>
 </div>

 {/* Expanded Details */}
 {expanded && (
 <div className="px-5 pb-5 pt-0 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
 <div className="border-t border-border pt-4 space-y-4">
 {decision.metadata && (
 <div>
 <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1.5">Context</h4>
 <p className="text-body text-[#374151] leading-relaxed whitespace-pre-wrap">{decision.metadata as string}</p>
 </div>
 )}

 {decision.rationale && (
 <div>
 <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1.5">Reasoning</h4>
 <p className="text-body text-[#374151] leading-relaxed whitespace-pre-wrap">{decision.rationale}</p>
 </div>
 )}

 {decision.options && (decision.options as string[]).length > 0 && (
 <div>
 <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1.5">Alternatives Considered</h4>
 <div className="flex flex-wrap gap-1.5">
 {(decision.options as string[]).map((alt: string, i: number) => (
 <span
 key={i}
 className="px-2 py-0.5 rounded-md bg-surface-hover border border-border text-caption text-[#374151] font-medium"
 >
 {alt}
 </span>
 ))}
 </div>
 </div>
 )}

 {decision.outcomes && (
 <div>
 <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-1.5">Outcome</h4>
 <div className="px-3 py-2 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-body text-[#166534] font-medium">
 {decision.outcomes}
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export function DecisionLog() {
 const queryClient = useQueryClient();

 // Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [projectFilter, setProjectFilter] = useState('');

 // Modal state
 const [modalOpen, setModalOpen] = useState(false);
 const [editingDecision, setEditingDecision] = useState<DecisionWithRelations | null>(null);

 // ── Queries ──
 const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
 queryKey: ['decisions', { projectId: projectFilter || undefined, q: searchQuery || undefined }],
 queryFn: () => api.decisions.list(),
 });

 const { data: projects = [] } = useQuery({
 queryKey: ['projects'],
 queryFn: api.projects.list,
 });

 // ── Mutations ──
 const createMutation = useMutation({
 mutationFn: (data: Record<string, any>) => api.decisions.create(data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['decisions'] });
 toast.success('Decision logged successfully');
 setModalOpen(false);
 },
 onError: () => {
 toast.error('Failed to log decision');
 },
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => api.decisions.update(id, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['decisions'] });
 toast.success('Decision updated');
 setEditingDecision(null);
 setModalOpen(false);
 },
 onError: () => {
 toast.error('Failed to update decision');
 },
 });

 const deleteMutation = useMutation({
 mutationFn: (id: string) => api.decisions.delete(id),
 onSuccess: (result) => {
 queryClient.invalidateQueries({ queryKey: ['decisions'] });
 toast.success('Decision deleted', {
 action: {
 label: 'Undo',
 onClick: () => {
 api.decisions.restore(result).then(() => {
 queryClient.invalidateQueries({ queryKey: ['decisions'] });
 toast.success('Decision restored');
 });
 },
 },
 });
 },
 onError: () => {
 toast.error('Failed to delete decision');
 },
 });

 // ── Handlers ──
 const handleEdit = (decision: DecisionWithRelations) => {
 setEditingDecision(decision);
 setModalOpen(true);
 };

 const handleDelete = (decision: DecisionWithRelations) => {
 deleteMutation.mutate(decision.id);
 };

 const handleSubmit = (data: DecisionFormData) => {
 const payload = {
 title: data.title,
 metadata: data.metadata || null,
 rationale: data.rationale || null,
 options: data.options,
 outcomes: data.outcomes || null,
 createdAt: new Date(data.createdAt).toISOString(),
 };

 if (editingDecision) {
 updateMutation.mutate({ id: editingDecision.id, data: payload });
 } else {
 createMutation.mutate(payload);
 }
 };

 const modalInitial: DecisionFormData = editingDecision
 ? {
 title: editingDecision.title,
 metadata: editingDecision.metadata as string || '',
 rationale: editingDecision.rationale || '',
 options: editingDecision.options as string[] || [],
 outcomes: editingDecision.outcomes || '',
 createdAt: new Date(editingDecision.createdAt).toISOString().split('T')[0],
 }
 : { ...emptyForm, createdAt: new Date().toISOString().split('T')[0] };

 // Local client-side sort (newest first)
 const sortedDecisions = useMemo(
 () => [...decisions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
 [decisions]
 );

 // ── Loading state ──
 if (decisionsLoading) {
 return <LoadingState title="Loading Decision Log..." description="Fetching architectural decisions and rationale..." />;
 }

 return (
 <div className="p-8 max-w-7xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-20">
 {/* Page Header */}
 <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <h1 className="text-title text-primary mb-4 ">Decision Log</h1>
 <span className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
 <Scale className="w-3 h-3 stroke-[2]" /> Architectural Record
 </span>
 </div>
 <p className="text-[13px] text-secondary">
 Track technical decisions, context, and rationale for future reference.
 </p>
 </div>
  <BaseButton disabled title="Decision logging will be available in a future update">
    <Plus className="w-4 h-4 mr-1.5 stroke-[2] opacity-50" /> Log Decision (Coming Soon)
  </BaseButton>
 </div>

 {/* Search + Filter Bar */}
 <div className="flex flex-col sm:flex-row gap-3 mb-6">
 {/* Search */}
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted stroke-[2]" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search decisions..."
 className="w-full pl-10 pr-4 py-2.5 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] placeholder:text-muted transition-all shadow-sm"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 {/* Project Filter */}
 <div className="relative">
 <select
 value={projectFilter}
 onChange={e => setProjectFilter(e.target.value)}
 className="appearance-none pl-4 pr-10 py-2.5 text-body border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all shadow-sm min-w-[180px] cursor-pointer"
 >
 <option value="">All Projects</option>
 {projects.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
 </div>
 </div>

 {/* Section Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-[12px] bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
 <Scale className="w-5 h-5 stroke-[1.75]" />
 </div>
 <div>
 <h2 className="text-section text-primary mb-3 ">Recorded Decisions</h2>
 <p className="text-caption text-secondary">Expand a card to view context, reasoning, and alternatives</p>
 </div>
 </div>
 <span className="text-caption font-mono text-secondary bg-surface-hover border border-border px-2.5 py-1 rounded font-medium">
 {sortedDecisions.length} {sortedDecisions.length === 1 ? 'decision' : 'decisions'}
 </span>
 </div>

 {/* Decision Cards */}
 {sortedDecisions.length > 0 ? (
 <div className="space-y-3">
 {sortedDecisions.map(decision => (
 <DecisionCard
 key={decision.id}
 decision={decision}
 onEdit={handleEdit}
 onDelete={handleDelete}
 />
 ))}
 </div>
 ) : (
 <div className="border border-border rounded-xl bg-surface h-64 flex items-center justify-center shadow-sm">
  <EmptyState
    icon={Scale}
    description={searchQuery || projectFilter ? 'No decisions match your filters.' : 'Decision logging will be available in a future update.'}
  />
 </div>
 )}

 {/* Create / Edit Modal */}
 <DecisionModal
 key={editingDecision?.id || 'create'}
 open={modalOpen}
 onClose={() => {
 setModalOpen(false);
 setEditingDecision(null);
 }}
 initial={modalInitial}
 projects={projects.map(p => ({ id: p.id, name: p.name }))}
 onSubmit={handleSubmit}
 isSubmitting={createMutation.isPending || updateMutation.isPending}
 />
 </div>
 );
}
