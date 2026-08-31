with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

target = '''<BaseButton onClick={() => handleCreateIssue("TODO")}>
   <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" /> New Directive
   </BaseButton>
   </div>'''
replacement = '''<div className="flex items-center gap-2">
   <button onClick={() => {
     api.tasks.rebalance().then(() => {
       toast.success('Task sort orders rebalanced!');
       queryClient.invalidateQueries({ queryKey: ['issues'] });
     });
   }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
     Rebalance Sort
   </button>
   <BaseButton onClick={() => handleCreateIssue("TODO")}>
   <Plus className="w-4 h-4 mr-1.5 stroke-[1.5]" /> New Directive
   </BaseButton>
   </div>
   </div>'''

if 'Rebalance Sort' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
        f.write(text)
