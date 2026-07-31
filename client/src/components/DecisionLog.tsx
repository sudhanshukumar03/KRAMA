import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import {
  Scale,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  Calendar,
  FolderKanban,
  X,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Archive,
  GitBranch
} from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';
import type { DecisionWithRelations } from '../types/schema';

// ─── Git Hash Generator ─────────────────────────────────────────────────────
const generateHash = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 7).padStart(7, '0');
};

// ─── Create / Edit Modal ────────────────────────────────────────────────────

interface DecisionFormData {
  title: string;
  context: string;
  reasoning: string;
  alternativesConsidered: string[];
  outcome: string;
  status: 'accepted' | 'rejected' | 'superseded' | 'deprecated';
  date: string;
  linkedProjectId: string;
}

const emptyForm: DecisionFormData = {
  title: '',
  context: '',
  reasoning: '',
  alternativesConsidered: [],
  outcome: '',
  status: 'accepted',
  date: new Date().toISOString().split('T')[0],
  linkedProjectId: '',
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

  useState(() => {
    setForm(initial);
    setTagInput('');
  });

  if (!open) return null;

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,$/, '');
      if (newTag && !form.alternativesConsidered.includes(newTag)) {
        setForm(prev => ({ ...prev, alternativesConsidered: [...prev.alternativesConsidered, newTag] }));
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && form.alternativesConsidered.length > 0) {
      setForm(prev => ({ ...prev, alternativesConsidered: prev.alternativesConsidered.slice(0, -1) }));
    }
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, alternativesConsidered: prev.alternativesConsidered.filter(t => t !== tag) }));
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
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
              <GitPullRequest className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-[20px] font-bold text-primary tracking-tight">
              {initial.title ? 'Amend Architecture Decision' : 'Propose Architecture Decision'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 max-h-[65vh] overflow-y-auto font-sans">
          <div>
            <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Title <span className="text-[#DC2626]">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Adopt tRPC over REST for internal APIs"
              className="w-full px-4 py-3 text-[15px] font-semibold border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] placeholder:text-muted transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Decision Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-4 py-3 text-[15px] font-semibold border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] transition-all cursor-pointer"
              >
                <option value="accepted">Accepted (Active)</option>
                <option value="rejected">Rejected</option>
                <option value="superseded">Superseded (Replaced)</option>
                <option value="deprecated">Deprecated (Retired)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Linked Project</label>
              <select
                value={form.linkedProjectId}
                onChange={e => setForm(prev => ({ ...prev, linkedProjectId: e.target.value }))}
                className="w-full px-4 py-3 text-[15px] font-semibold border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] transition-all cursor-pointer"
              >
                <option value="">No linked project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Context & Problem Statement</label>
            <textarea
              value={form.context}
              onChange={e => setForm(prev => ({ ...prev, context: e.target.value }))}
              placeholder="What prompted this decision? What's the background?"
              rows={3}
              className="w-full px-4 py-3 text-[15px] border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] placeholder:text-muted transition-all resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Reasoning & Trade-offs</label>
            <textarea
              value={form.reasoning}
              onChange={e => setForm(prev => ({ ...prev, reasoning: e.target.value }))}
              placeholder="Why was this the best option? What trade-offs were considered?"
              rows={3}
              className="w-full px-4 py-3 text-[15px] border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] placeholder:text-muted transition-all resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Alternatives Considered</label>
            <div className="flex flex-wrap items-center gap-2 min-h-[50px] px-4 py-2 border border-border rounded-xl bg-surface-hover/50 focus-within:ring-2 focus-within:ring-[#4F46E5]/30 focus-within:border-[#4F46E5] transition-all">
              {form.alternativesConsidered.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-border text-[13px] text-primary font-bold shadow-sm"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-muted hover:text-[#DC2626] transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={form.alternativesConsidered.length === 0 ? 'Type and press Enter or comma to add...' : ''}
                className="flex-1 min-w-[150px] text-[15px] bg-transparent border-none outline-none placeholder:text-muted font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Outcome & Impact</label>
            <input
              type="text"
              value={form.outcome}
              onChange={e => setForm(prev => ({ ...prev, outcome: e.target.value }))}
              placeholder="What was decided? What action was taken?"
              className="w-full px-4 py-3 text-[15px] font-semibold border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] placeholder:text-muted transition-all"
            />
          </div>
          
          <div>
            <label className="block text-[13px] font-bold text-primary mb-2 uppercase tracking-wider">Date Recorded</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
              className="w-full sm:w-1/2 px-4 py-3 text-[15px] font-mono border border-border rounded-xl bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] transition-all cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-border bg-surface-hover/50 rounded-b-2xl">
          <BaseButton variant="secondary" className="px-6 h-12 text-[15px]" onClick={onClose}>
            Cancel
          </BaseButton>
          <BaseButton
            className="px-6 h-12 text-[15px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold"
            onClick={() => onSubmit(form)}
            disabled={!form.title.trim()}
            isLoading={isSubmitting}
          >
            {initial.title ? 'Commit Changes' : 'Commit Decision'}
          </BaseButton>
        </div>
      </div>
    </div>
  );
}

// ─── Git-Style Timeline Node Card ───────────────────────────────────────────

const getStatusConfig = (status: string | undefined) => {
  switch (status) {
    case 'accepted': return { color: 'text-[#109868]', bg: 'bg-[#109868]/10', border: 'border-[#109868]/20', icon: CheckCircle2, label: 'ACCEPTED', diffColor: 'text-[#109868] bg-[#F0FDF4] border-[#BBF7D0]' };
    case 'rejected': return { color: 'text-[#DC2626]', bg: 'bg-[#DC2626]/10', border: 'border-[#DC2626]/20', icon: XCircle, label: 'REJECTED', diffColor: 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]' };
    case 'superseded': return { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/20', icon: GitBranch, label: 'SUPERSEDED', diffColor: 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]' };
    case 'deprecated': return { color: 'text-muted', bg: 'bg-surface-hover', border: 'border-border', icon: Archive, label: 'DEPRECATED', diffColor: 'text-muted bg-surface-hover border-border' };
    default: return { color: 'text-[#109868]', bg: 'bg-[#109868]/10', border: 'border-[#109868]/20', icon: CheckCircle2, label: 'ACCEPTED', diffColor: 'text-[#109868] bg-[#F0FDF4] border-[#BBF7D0]' };
  }
};

function DecisionTimelineCard({
  decision,
  onEdit,
  onDelete,
  isLast
}: {
  decision: DecisionWithRelations;
  onEdit: (d: DecisionWithRelations) => void;
  onDelete: (d: DecisionWithRelations) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hash = generateHash(decision.id);
  const formattedDate = new Date(decision.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const statusCfg = getStatusConfig((decision as any).status || 'accepted');
  const StatusIcon = statusCfg.icon;

  return (
    <div className="relative pl-12 sm:pl-16 md:pl-24 pb-8 group">
      {/* Git Timeline Connector Line */}
      {!isLast && (
        <div className="absolute left-[27px] sm:left-[35px] md:left-[51px] top-[40px] bottom-[-20px] w-0.5 bg-border group-hover:bg-[#4F46E5]/30 transition-colors z-0" />
      )}
      
      {/* Git Commit Node */}
      <div className="absolute left-[20px] sm:left-[28px] md:left-[44px] top-[14px] w-4 h-4 rounded-full bg-surface border-2 border-[#4F46E5] z-10 shadow-[0_0_0_4px_var(--color-canvas)] group-hover:scale-125 transition-transform" />
      
      {/* Git Hash Label */}
      <div className="absolute left-[-40px] sm:left-[-30px] md:left-[0px] top-[12px] text-[11px] font-mono font-bold text-[#4F46E5] opacity-0 md:opacity-100 hidden md:block">
        {hash}
      </div>

      <div
        className={cn(
          'bg-surface border border-border rounded-2xl transition-all duration-200 shadow-sm cursor-pointer relative z-10 hover:shadow-md',
          expanded ? 'border-[#4F46E5]/50 shadow-md ring-1 ring-[#4F46E5]/10' : 'hover:border-[#4F46E5]/30'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 select-none gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="shrink-0 bg-surface-hover border border-border rounded-lg w-8 h-8 flex items-center justify-center transition-colors group-hover:border-[#4F46E5]/30">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-[#4F46E5] stroke-[2]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-[#4F46E5] stroke-[2] transition-colors" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-bold text-primary leading-tight group-hover:text-[#4F46E5] transition-colors truncate">
                {decision.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[12px] font-mono text-secondary font-medium">
                  <Calendar className="w-3.5 h-3.5 stroke-[1.5]" /> {formattedDate}
                </span>
                <span className="text-border-muted">•</span>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border tracking-wider", statusCfg.color, statusCfg.bg, statusCfg.border)}>
                  <StatusIcon className="w-3 h-3 stroke-[2]" />
                  {statusCfg.label}
                </span>
                {decision.linkedProject && (
                  <>
                    <span className="text-border-muted">•</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#4F46E5] bg-[#4F46E5]/10 border border-[#4F46E5]/20 px-2 py-0.5 rounded shadow-2xs">
                      <FolderKanban className="w-3 h-3 stroke-[1.5]" />
                      {decision.linkedProject.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-center">
            <button
              onClick={e => { e.stopPropagation(); onEdit(decision); }}
              className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[12px] font-bold text-secondary hover:text-[#4F46E5] hover:bg-[#4F46E5]/10 border border-transparent hover:border-[#4F46E5]/20 transition-all cursor-pointer shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5 stroke-[1.5]" /> Amend
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(decision); }}
              className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[12px] font-bold text-secondary hover:text-[#DC2626] hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" /> Revert
            </button>
          </div>
        </div>

        {/* Expanded Diff-Style Details */}
        {expanded && (
          <div className="px-5 md:px-6 pb-6 pt-0 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
            <div className="border-t border-border pt-5 space-y-5">
              
              {decision.context && (
                <div className="bg-surface-hover/50 p-4 rounded-xl border border-border/80">
                  <h4 className="text-[11px] font-mono font-bold text-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Context & Problem
                  </h4>
                  <p className="text-[15px] text-primary leading-[1.6] whitespace-pre-wrap font-mono pl-3 border-l-2 border-border-muted">{decision.context}</p>
                </div>
              )}

              {decision.reasoning && (
                <div className="bg-[#4F46E5]/5 p-4 rounded-xl border border-[#4F46E5]/20">
                  <h4 className="text-[11px] font-mono font-bold text-[#4F46E5] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" /> Reasoning & Trade-offs
                  </h4>
                  <p className="text-[15px] text-primary leading-[1.6] whitespace-pre-wrap font-mono pl-3 border-l-2 border-[#4F46E5]/30">{decision.reasoning}</p>
                </div>
              )}

              {decision.alternativesConsidered && decision.alternativesConsidered.length > 0 && (
                <div className="bg-surface-hover/50 p-4 rounded-xl border border-border/80">
                  <h4 className="text-[11px] font-mono font-bold text-[#DC2626] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <span className="text-[14px] leading-none">-</span> Alternatives Rejected
                  </h4>
                  <div className="flex flex-wrap gap-2 pl-3">
                    {(decision.alternativesConsidered as string[]).map((alt: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#DC2626] font-mono font-medium line-through decoration-[#DC2626]/40 shadow-2xs">
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {decision.outcome && (
                <div className={cn("p-4 rounded-xl border", statusCfg.diffColor)}>
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="text-[14px] leading-none">+</span> Final Outcome / Action
                  </h4>
                  <p className="text-[15px] font-bold leading-[1.6] pl-3 border-l-2 border-current/30 font-sans">
                    {decision.outcome}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export function DecisionLog() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionWithRelations | null>(null);

  const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
    queryKey: ['decisions', { projectId: projectFilter || undefined, q: searchQuery || undefined }],
    queryFn: () => api.decisions.list({ projectId: projectFilter || undefined, q: searchQuery || undefined }),
  });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.decisions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      toast.success('Architecture decision committed.');
      setModalOpen(false);
    },
    onError: () => { toast.error('Failed to log decision'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => api.decisions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      toast.success('Architecture decision amended.');
      setEditingDecision(null);
      setModalOpen(false);
    },
    onError: () => { toast.error('Failed to amend decision'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.decisions.delete(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      toast.success('Decision reverted.', {
        action: {
          label: 'Undo Revert',
          onClick: () => {
            api.decisions.restore(result.snapshot).then(() => {
              queryClient.invalidateQueries({ queryKey: ['decisions'] });
              toast.success('Decision restored.');
            });
          },
        },
      });
    },
  });

  const handleCreate = () => { setEditingDecision(null); setModalOpen(true); };
  const handleEdit = (decision: DecisionWithRelations) => { setEditingDecision(decision); setModalOpen(true); };
  const handleDelete = (decision: DecisionWithRelations) => { deleteMutation.mutate(decision.id); };

  const handleSubmit = (data: DecisionFormData) => {
    const payload = {
      title: data.title,
      context: data.context || null,
      reasoning: data.reasoning || null,
      alternativesConsidered: data.alternativesConsidered,
      outcome: data.outcome || null,
      status: data.status,
      date: new Date(data.date).toISOString(),
      linkedProjectId: data.linkedProjectId || null,
    };
    if (editingDecision) updateMutation.mutate({ id: editingDecision.id, data: payload });
    else createMutation.mutate(payload);
  };

  const modalInitial: DecisionFormData = editingDecision
    ? {
        title: editingDecision.title,
        context: editingDecision.context || '',
        reasoning: editingDecision.reasoning || '',
        alternativesConsidered: editingDecision.alternativesConsidered || [],
        outcome: editingDecision.outcome || '',
        status: (editingDecision as any).status || 'accepted',
        date: new Date(editingDecision.date).toISOString().split('T')[0],
        linkedProjectId: editingDecision.linkedProjectId || '',
      }
    : { ...emptyForm, date: new Date().toISOString().split('T')[0] };

  const sortedDecisions = useMemo(() => [...decisions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [decisions]);

  if (decisionsLoading) return <LoadingState title="Loading Architecture Log..." description="Fetching decision history and git-style timeline..." />;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-24 font-sans text-primary">
      
      {/* Page Header (God-Level UI: Indigo Decisions Identity) */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8 bg-surface p-8 rounded-2xl shadow-sm border-l-4 border-l-[#4F46E5] relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#4F46E5]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-md border border-[#4F46E5]/20">
            <GitCommit className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-title font-bold tracking-tight text-primary leading-none">Architecture Decision Log</h1>
              <span className="bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-2xs">
                <Scale className="w-3.5 h-3.5 stroke-[2]" /> Git History
              </span>
            </div>
            <p className="text-body text-secondary max-w-2xl mt-3">
              An immutable ledger of critical architecture choices, trade-offs, and outcomes. Designed for engineering context preservation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 relative z-10 mt-4 sm:mt-0">
          <BaseButton onClick={handleCreate} className="h-12 px-6 text-[16px] font-bold bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-md">
            <GitPullRequest className="w-5 h-5 mr-2 stroke-[1.5]" /> Commit Decision
          </BaseButton>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted stroke-[1.5] group-focus-within:text-[#4F46E5] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search commits and context..."
            className="w-full pl-12 pr-4 py-3.5 text-[15px] font-medium border border-border rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] placeholder:text-muted transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="appearance-none pl-4 pr-12 py-3.5 text-[15px] font-bold border border-border rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] transition-all shadow-sm min-w-[220px] cursor-pointer"
          >
            <option value="">All Repositories</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none stroke-[1.5]" />
        </div>
      </div>

      {/* Timeline Container */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border pl-12 sm:pl-16 md:pl-24">
          <h2 className="text-[20px] font-bold text-primary flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#4F46E5] stroke-[1.5]" /> main branch history
          </h2>
          <span className="text-[13px] font-mono text-secondary bg-surface-hover border border-border px-3 py-1.5 rounded-lg font-bold shadow-2xs">
            {sortedDecisions.length} commits
          </span>
        </div>

        {sortedDecisions.length > 0 ? (
          <div className="relative pt-2">
            {sortedDecisions.map((decision, index) => (
              <DecisionTimelineCard
                key={decision.id}
                decision={decision}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLast={index === sortedDecisions.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-2xl bg-surface h-72 flex items-center justify-center shadow-sm mx-4 sm:mx-12 lg:mx-24">
            <EmptyState
              icon={GitCommit}
              description={searchQuery || projectFilter ? 'No commits match your filters.' : 'Repository is empty. Make your first architectural commit.'}
              actionLabel={!searchQuery && !projectFilter ? 'Commit Decision' : undefined}
              onAction={!searchQuery && !projectFilter ? handleCreate : undefined}
            />
          </div>
        )}
      </div>

      <DecisionModal
        key={editingDecision?.id || 'create'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalInitial}
        projects={projects}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
