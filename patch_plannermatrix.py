# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Modify CategoryHeader definition
old_cat_header = "function CategoryHeader({ label, subtitle, icon, onToggle }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void }) {"
new_cat_header = "function CategoryHeader({ label, subtitle, icon, onToggle, onAdd }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void; onAdd?: () => void }) {"
content = content.replace(old_cat_header, new_cat_header)

old_cat_header_ret = """      <button
        type="button"
        onClick={onToggle}
        className="w-full p-2 flex flex-col text-left hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors"
      >"""
new_cat_header_ret = """      <div className="w-full p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors group">
        <button type="button" onClick={onToggle} className="flex flex-col text-left flex-1">"""
content = content.replace(old_cat_header_ret, new_cat_header_ret)

# Now we need to add the add button and close the div
old_cat_header_end = """        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 ml-5">
          {subtitle}
        </div>
      </button>"""
new_cat_header_end = """        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 ml-5">
          {subtitle}
        </div>
        </button>
        {onAdd && (
          <button onClick={onAdd} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
        )}
      </div>"""
content = content.replace(old_cat_header_end, new_cat_header_end)

# Also PlannerMatrix needs to receive onAddMilestone
# export function PlannerMatrix({ data, days, currentDate }: PlannerMatrixProps) {
old_planner_matrix = "export function PlannerMatrix({ data, days, currentDate }: PlannerMatrixProps) {"
new_planner_matrix = "export function PlannerMatrix({ data, days, currentDate, onAddMilestone }: PlannerMatrixProps & { onAddMilestone?: () => void }) {"
content = content.replace(old_planner_matrix, new_planner_matrix)

# Add onAdd to Projects / Milestones header
old_projects_header = '<CategoryHeader icon={<Layers size={13} className="text-slate-500 dark:text-slate-400" />} label="Projects / Milestones" subtitle={`${data.projects.length} projects`} onToggle={() => handleToggle("projects")} />'
new_projects_header = '<CategoryHeader icon={<Layers size={13} className="text-slate-500 dark:text-slate-400" />} label="Projects / Milestones" subtitle={`${data.projects.length} projects`} onToggle={() => handleToggle("projects")} onAdd={onAddMilestone} />'
content = content.replace(old_projects_header, new_projects_header)


with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
