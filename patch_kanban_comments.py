import re

with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

target1 = "  const [newSubtask, setNewSubtask] = useState('');"
replacement1 = "  const [newSubtask, setNewSubtask] = useState('');\n  const [newComment, setNewComment] = useState('');\n  const [isSubmittingComment, setIsSubmittingComment] = useState(false);\n\n  const handleAddComment = async () => {\n    if (!newComment.trim()) return;\n    try {\n      setIsSubmittingComment(true);\n      await api.tasks.addComment(issue!.id, newComment.trim());\n      setNewComment('');\n      queryClient.invalidateQueries({ queryKey: ['issues'] });\n    } catch (e: any) {\n      toast.error(e.message || 'Failed to add comment');\n    } finally {\n      setIsSubmittingComment(false);\n    }\n  };"

if 'newComment' not in text:
    text = text.replace(target1, replacement1)

target2 = ''' <div className="pt-4 border-t border-border flex justify-end gap-3 shrink-0">
 <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>'''

replacement2 = ''' {/* Comments Section */}
 <div className="pt-6 border-t border-border">
   <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments</h4>
   <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
     {(!issue.comments || issue.comments.length === 0) ? (
       <p className="text-xs text-muted text-center py-4">No comments yet. Start the discussion!</p>
     ) : (
       (issue.comments as any[]).map((c: any) => (
         <div key={c.id} className="flex gap-3">
           <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
             {c.user?.image ? <img src={c.user.image} alt={c.user.name} className="w-full h-full object-cover" /> : (c.user?.name?.[0] || 'U')}
           </div>
           <div className="flex-1 bg-surface-hover rounded-xl p-3 border border-border">
             <div className="flex items-center justify-between mb-1">
               <span className="text-xs font-semibold text-primary">{c.user?.name || 'Unknown User'}</span>
               <span className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleString()}</span>
             </div>
             <p className="text-sm text-secondary whitespace-pre-wrap">{c.content}</p>
           </div>
         </div>
       ))
     )}
   </div>
   <div className="flex gap-2">
     <input
       type="text"
       value={newComment}
       onChange={e => setNewComment(e.target.value)}
       placeholder="Add a comment..."
       className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-blue-500 text-primary"
       onKeyDown={e => {
         if (e.key === 'Enter') {
           e.preventDefault();
           handleAddComment();
         }
       }}
     />
     <BaseButton type="button" onClick={handleAddComment} disabled={!newComment.trim() || isSubmittingComment}>
       Send
     </BaseButton>
   </div>
 </div>

 <div className="pt-4 mt-6 border-t border-border flex justify-end gap-3 shrink-0">
 <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>'''

if 'MessageSquare' not in text:
    text = text.replace(target2, replacement2)

with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
    f.write(text)
