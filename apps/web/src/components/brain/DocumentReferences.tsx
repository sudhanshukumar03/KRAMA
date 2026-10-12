import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CheckSquare, ChevronDown, FileText, FolderKanban, Link2, X } from 'lucide-react';
import type { DocumentWithRelations, EntityLink, IssueWithRelations, ProjectWithRelations } from '../../types/schema';
import { cn } from '../../lib/utils';
import { BaseButton } from '../ui/BaseButton';

interface Props {
  page: DocumentWithRelations;
  pages: DocumentWithRelations[];
  projects: ProjectWithRelations[];
  tasks: IssueWithRelations[];
  links?: { incoming: EntityLink[]; outgoing: EntityLink[] };
  onSelectDoc: (id: string) => void;
  onAddLink: () => void;
  onDeleteLink: (id: string) => Promise<void>;
}

/** Resolve both ends of a reference without coupling document saves to navigation. */
export function DocumentReferences({ page, pages, projects, tasks, links, onSelectDoc, onAddLink, onDeleteLink }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const incoming = links?.incoming ?? [];
  const outgoing = links?.outgoing ?? [];
  const entity = (type: EntityLink['targetType'], id: string) => {
    const task = type === 'TASK' ? tasks.find(item => item.id === id) : undefined;
    const label = type === 'DOCUMENT' ? pages.find(item => item.id === id)?.title
      : type === 'PROJECT' ? projects.find(item => item.id === id)?.name : task?.title;
    return { label: label || type + ' #' + id.slice(0, 8), status: task?.status };
  };
  const visit = (type: EntityLink['targetType'], id: string) => {
    if (type === 'DOCUMENT') onSelectDoc(id);
    else if (type === 'PROJECT') navigate('/app/projects/' + encodeURIComponent(id));
    else navigate('/app/board?task=' + encodeURIComponent(id));
  };
  return <div className="pt-6 border-t border-border font-mono text-caption mb-12">
    <div className="flex items-center justify-between mb-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="min-h-11 flex items-center gap-2 font-bold uppercase tracking-wider text-secondary hover:text-primary">
        <Link2 className="w-4 h-4 text-accent-fg" aria-hidden="true" />References & Backlinks
        <span className="text-badge px-1.5 py-0.5 rounded-full bg-surface-hover border border-border text-muted">{incoming.length + outgoing.length}</span>
        <ChevronDown aria-hidden="true" className={cn('w-3.5 h-3.5 transition-transform text-muted', !open && '-rotate-90')} />
      </button>
      <BaseButton onClick={onAddLink} className="text-caption py-1 px-2.5">+ Link Item</BaseButton>
    </div>
    {page.linkedProject && <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent-subtle border border-accent/20 mb-3 text-[12px] font-sans">
      <div className="flex items-center gap-2"><FolderKanban aria-hidden="true" className="w-3.5 h-3.5 text-accent-fg" /><span className="text-secondary text-caption font-mono">LINKED PROJECT:</span><span className="font-semibold text-primary">{page.linkedProject.name}</span></div>
      <button type="button" onClick={() => visit('PROJECT', page.linkedProject!.id)} className="min-h-11 text-accent-fg font-bold flex items-center gap-1">View Project<ArrowUpRight aria-hidden="true" className="w-3 h-3" /></button>
    </div>}
    {open && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
      {(['incoming', 'outgoing'] as const).map(direction => {
        const rows = direction === 'incoming' ? incoming : outgoing;
        return <section key={direction} className="p-4 rounded-xl border border-border bg-surface">
          <h3 className="text-caption font-bold text-secondary uppercase tracking-wider block mb-2">{direction === 'incoming' ? 'Incoming Backlinks' : 'Outgoing References'} ({rows.length})</h3>
          {!rows.length ? <p className="text-muted text-[12px] italic">{direction === 'incoming' ? 'No documents currently reference this page.' : 'No outgoing entity links added yet.'}</p> : <div className="space-y-1.5">
            {rows.map(link => {
              const type = direction === 'incoming' ? link.sourceType : link.targetType;
              const id = direction === 'incoming' ? link.sourceId : link.targetId;
              const info = entity(type, id);
              const Icon = type === 'DOCUMENT' ? FileText : type === 'PROJECT' ? FolderKanban : CheckSquare;
              return <div key={link.id} className="flex items-center justify-between rounded-lg bg-surface-hover/50 hover:bg-accent-subtle transition-colors">
                <button type="button" aria-label={'Open ' + type.toLowerCase() + ' ' + info.label} onClick={() => visit(type, id)} className="min-h-11 flex items-center gap-2 min-w-0 flex-1 text-left p-2">
                  <Icon aria-hidden="true" className="w-3.5 h-3.5 text-accent-fg shrink-0" />
                  <span className="font-sans font-medium text-primary text-[13px] truncate">{info.label}</span>
                  <span className="text-badge text-secondary ml-auto">{direction === 'incoming' ? link.linkType : info.status || type}</span>
                </button>
                {direction === 'outgoing' && <button type="button" aria-label={'Remove reference to ' + info.label} onClick={() => void onDeleteLink(link.id)} className="min-h-11 min-w-11 grid place-items-center text-muted hover:text-danger-fg" title="Remove reference"><X aria-hidden="true" className="w-3.5 h-3.5" /></button>}
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>}
  </div>;
}
