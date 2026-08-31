# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

old_func = """function CategoryHeader({ label, subtitle, icon, onToggle, onAdd }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void; onAdd?: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-2 flex flex-col text-left hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
        {icon || <ChevronDown size={13} className="text-slate-500 dark:text-slate-400" />}
        {label}
      </div>
      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 ml-5">
        {subtitle}
      </div>
    </button>
  );
}"""

new_func = """function CategoryHeader({ label, subtitle, icon, onToggle, onAdd }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void; onAdd?: () => void }) {
  return (
    <div className="w-full p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors group">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-col text-left flex-1"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          {icon || <ChevronDown size={13} className="text-slate-500 dark:text-slate-400" />}
          {label}
        </div>
        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 ml-5">
          {subtitle}
        </div>
      </button>
      {onAdd && (
        <button onClick={onAdd} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      )}
    </div>
  );
}"""

content = content.replace(old_func, new_func)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
