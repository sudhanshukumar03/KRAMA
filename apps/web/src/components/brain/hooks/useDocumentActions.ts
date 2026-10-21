import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../../api/client';
import { errorMessage } from '../../../lib/utils';
import type { DocumentWithRelations, DocumentType } from '../../../types/schema';
import type { DocumentSaveQueue } from '../../../lib/documentSaveQueue';
import { TAG_COLORS } from '../helpers';

export const LIFECYCLE_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'ACCEPTED', 'DEPRECATED']);
interface DocumentActionsInput {
  page: DocumentWithRelations;
  save: DocumentSaveQueue;
  onSelectDoc: (id: string) => void;
  refetchLinks: () => unknown;
}
/** Editing commands retain the same revision queue and acknowledged cache updates. */
export function useDocumentActions({ page, save, onSelectDoc, refetchLinks }: DocumentActionsInput) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page.title || '');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    setTitle(save.title);
    if (save.recovered) {
      toast.info('Recovered your unsaved draft. Review it and choose Retry save.');
    }
  }, [save]);

  const handleToggleFavorite = async () => {
    try {
      await save.updateMetadata({ isFavorite: !page.isFavorite });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(page.isFavorite ? 'Removed from favorites' : 'Marked as favorite');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDuplicate = async () => {
    try {
      await save.flush();
      const copy = await api.documents.duplicate(page.id);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (copy?.id) onSelectDoc(copy.id);
      toast.success(`Duplicated "${page.title}"`);
    } catch (err) {
      toast.error('Failed to duplicate document: ' + errorMessage(err, 'Unknown error'));
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    save.setTitle(newTitle);
  };
  const handleTitleBlur = () => { void save.flush().catch(() => {}); };

  const handleLinkProject = async (projectId: string | null) => {
    try {
      await save.updateMetadata({ projectId: projectId || null, linkedProjectId: projectId || null });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(projectId ? 'Document linked to project' : 'Document unlinked from project');
    } catch (err) {
      toast.error('Failed to update project link: ' + errorMessage(err, 'Unknown error'));
    }
  };

  const handleDocumentTypeChange = async (type: DocumentType) => {
    try {
      await save.updateMetadata({ documentType: type });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Document type updated to ${type}`);
    } catch {
      toast.error('Failed to update type');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await save.updateMetadata({ statusBadges: [...(page.statusBadges || []).filter(badge => !LIFECYCLE_STATUSES.has(badge)), status] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Lifecycle status set to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].name;
      await api.documents.addTag(page.id, newTagInput.trim(), color);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', page.id] });
      setNewTagInput('');
      setIsAddingTag(false);
      toast.success(`Tag #${newTagInput.trim()} added`);
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.documents.removeTag(page.id, tagId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', page.id] });
      toast.success('Tag removed');
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.documents.removeLink(linkId);
      refetchLinks();
      toast.success('Link removed');
    } catch {
      toast.error('Failed to remove link');
    }
  };

  const handleExport = async (format: 'md' | 'spec') => {
    try { await save.flush(); } catch { toast.error('Save your changes before exporting.'); return; }
    const filename = `${page.title || 'document'}.${format === 'spec' ? 'spec.md' : 'md'}`;
    api.documents.export(page.id, format, filename)
      .then(() => toast.success(`Exported as ${format === 'spec' ? 'Architecture Spec' : 'Markdown'}`))
      .catch(() => toast.error('Export failed'));
  };

  return { title, setTitle, newTagInput, setNewTagInput, isAddingTag, setIsAddingTag, handleToggleFavorite, handleDuplicate, handleTitleChange, handleTitleBlur, handleLinkProject, handleDocumentTypeChange, handleStatusChange, handleAddTag, handleRemoveTag, handleDeleteLink, handleExport };
}
