# -*- coding: utf-8 -*-
import os

file_path = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove internal scroll on body
code = code.replace(
    'className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col hide-scrollbar"',
    'className="flex flex-col w-full"'
)

# 2. Fix the overflow hidden on the container
code = code.replace(
    'className="overflow-hidden bg-white flex flex-col w-full h-full border-none"',
    'className="bg-white flex flex-col w-full border-none rounded-xl"'
)
code = code.replace(
    'className="w-full flex flex-col flex-1 min-h-0"',
    'className="w-full flex flex-col"'
)

# 3. Change Tasks from circular check to square check
code = code.replace(
    'className={"flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border transition-colors "',
    'className={"flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border transition-colors "'
)
code = code.replace(
    '<svg viewBox="0 0 14 14" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">',
    '<svg viewBox="0 0 14 14" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">'
)
# Wait, they are already rounded-[3px]. The user didn't like them? 
# Maybe they are overlapping or something.

# 4. Remove internal scrolling in Time Blocks and Tasks grid cells
code = code.replace(
    'className="border-r border-border last:border-r-0 p-2 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar"',
    'className="border-r border-border last:border-r-0 p-2 flex flex-col gap-1.5"'
)
code = code.replace(
    'className="border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar"',
    'className="border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1.5"'
)

# 5. Fix Time Block Styling
# Original: \w-full text-left rounded-lg p-2 border-l-4 border-t border-r border-b shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 \ \\
# New: \w-full text-left rounded p-1.5 transition-all hover:opacity-80 cursor-pointer flex flex-col gap-0.5 \\ (Remove borders)
# Also redefine BLOCK_COLORS to be text-colored backgrounds
new_block_colors = '''const BLOCK_COLORS: Record<string, string> = {
  MEETING:  "bg-purple-50 text-purple-600",
  PERSONAL: "bg-orange-50 text-orange-600",
  STUDY:    "bg-emerald-50 text-emerald-600",
  WORK:     "bg-blue-50 text-blue-600",
  HEALTH:   "bg-rose-50 text-rose-600",
  ADMIN:    "bg-gray-50 text-gray-600",
  OTHER:    "bg-slate-50 text-slate-600",
};'''

old_block_colors = '''const BLOCK_COLORS: Record<string, string> = {
  MEETING:  "bg-purple-50 border-purple-200 text-purple-800",
  PERSONAL: "bg-orange-50 border-orange-200 text-orange-800",
  STUDY:    "bg-emerald-50 border-emerald-200 text-emerald-800",
  WORK:     "bg-blue-50 border-blue-200 text-blue-800",
  HEALTH:   "bg-rose-50 border-rose-200 text-rose-800",
  ADMIN:    "bg-gray-50 border-gray-200 text-gray-800",
  OTHER:    "bg-slate-50 border-slate-200 text-slate-800",
};'''

code = code.replace(old_block_colors, new_block_colors)

code = code.replace(
    'className={\w-full text-left rounded-lg p-2 border-l-4 border-t border-r border-b shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-1  \}',
    'className={\w-full text-left rounded-[4px] p-1.5 transition-all cursor-pointer flex flex-col \}'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)
