# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/PlannerMatrix.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Update imports for Icons
content = content.replace(
    'import { Plus, CheckCircle2, Circle, ChevronDown, MoreVertical, CircleDot } from "lucide-react";',
    'import { Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, MoreVertical, CircleDot, Target, Clock, Layers } from "lucide-react";'
)

# 2. Update Categories Header
content = content.replace(
    '''            <div className="p-3 flex flex-col justify-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border">
              Categories
            </div>''',
    '''            <div className="p-3 flex flex-col justify-start text-[11px] font-bold uppercase tracking-wider text-foreground border-r border-border">
              <div className="flex items-center gap-1.5">
                <ChevronUp size={13} className="text-muted-foreground" />
                CATEGORIES
              </div>
            </div>'''
)

# 3. Remove ALL DAY / HOLIDAYS row completely
# The row starts with {/* ALL DAY / HOLIDAYS */} and ends before {/* ROUTINES (Sub-rows) */}
import re
content = re.sub(
    r'\{\/\* ALL DAY \/ HOLIDAYS \*\/}.*?(?=\{\/\* ROUTINES \(Sub-rows\) \*\/})',
    '',
    content,
    flags=re.DOTALL
)

# 4. Modify CategoryHeader to use icon
content = content.replace(
    '''function CategoryHeader({ label, subtitle, onToggle }: { label: string; subtitle: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-3 flex flex-col text-left hover:bg-muted/10 transition-colors"
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
        <ChevronDown size={13} className="text-muted-foreground" />
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground font-medium mt-0.5 ml-4">
        {subtitle}
      </div>
    </button>
  );
}''',
    '''function CategoryHeader({ label, subtitle, icon, onToggle }: { label: string; subtitle: string; icon?: React.ReactNode; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-3 flex flex-col text-left hover:bg-muted/10 transition-colors"
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
        {icon || <ChevronDown size={13} className="text-muted-foreground" />}
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground font-medium mt-0.5 ml-5">
        {subtitle}
      </div>
    </button>
  );
}'''
)

# 5. Modify MatrixRow to accept icon
content = content.replace(
    '''function MatrixRow({
  label,
  subtitle,
  isExpanded,
  onToggle,
  flexClass,
  children,
}: {
  label: string;
  subtitle: string;
  isExpanded: boolean;
  onToggle: () => void;
  flexClass: string;
  children: React.ReactNode;
}) {
  if (!isExpanded) {
    return (
      <div className="border-b border-border w-full flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-3 flex items-center text-left hover:bg-muted/10 transition-colors"
        >
          <div className="w-[148px] flex items-center text-[11px] font-bold uppercase tracking-wider text-foreground gap-1.5 shrink-0">
            <ChevronDown size={13} className="-rotate-90 text-muted-foreground" />
            {label}
          </div>''',
    '''function MatrixRow({
  label,
  subtitle,
  icon,
  isExpanded,
  onToggle,
  flexClass,
  children,
}: {
  label: string;
  subtitle: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  flexClass: string;
  children: React.ReactNode;
}) {
  if (!isExpanded) {
    return (
      <div className="border-b border-border w-full flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-3 flex items-center text-left hover:bg-muted/10 transition-colors"
        >
          <div className="w-[148px] flex items-center text-[11px] font-bold uppercase tracking-wider text-foreground gap-1.5 shrink-0">
            {icon || <ChevronDown size={13} className="-rotate-90 text-muted-foreground" />}
            {label}
          </div>'''
)

# 6. Pass icons to MatrixRows
content = content.replace(
    '<CategoryHeader label="Routines"',
    '<CategoryHeader icon={<Target size={13} className="text-purple-500" />} label="Routines"'
)
content = content.replace(
    '<MatrixRow \n              label="Routines"',
    '<MatrixRow \n              icon={<Target size={13} className="text-purple-500" />}\n              label="Routines"'
)

content = content.replace(
    '<CategoryHeader label="Tasks"',
    '<CategoryHeader icon={<CheckCircle2 size={13} className="text-purple-500" />} label="Tasks"'
)
content = content.replace(
    '<MatrixRow \n              label="Tasks"',
    '<MatrixRow \n              icon={<CheckCircle2 size={13} className="text-purple-500" />}\n              label="Tasks"'
)

content = content.replace(
    '<CategoryHeader label="Time Blocks"',
    '<CategoryHeader icon={<Clock size={13} className="text-slate-500" />} label="Time Blocks"'
)
content = content.replace(
    '<MatrixRow \n              label="Time Blocks"',
    '<MatrixRow \n              icon={<Clock size={13} className="text-slate-500" />}\n              label="Time Blocks"'
)

content = content.replace(
    '<CategoryHeader label="Projects / Milestones"',
    '<CategoryHeader icon={<Layers size={13} className="text-slate-500" />} label="Projects / Milestones"'
)
content = content.replace(
    '<MatrixRow \n              label="Projects / Milestones"',
    '<MatrixRow \n              icon={<Layers size={13} className="text-slate-500" />}\n              label="Projects / Milestones"'
)

# Replace overflow-y-auto with overflow-hidden for the matrix body to absolutely disable scrolling
content = content.replace(
    'className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col hide-scrollbar"',
    'className="flex-1 min-h-0 overflow-hidden flex flex-col"'
)

# Allow Tasks and TimeBlocks to just be flex-1 min-h-0 so they perfectly share remaining space
content = content.replace('flexClass="flex-1 min-h-[40px]"', 'flexClass="flex-1 min-h-0"')


with codecs.open('apps/web/src/components/planner/PlannerMatrix.tsx', 'w', 'utf-8') as f:
    f.write(content)
