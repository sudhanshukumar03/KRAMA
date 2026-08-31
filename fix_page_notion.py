# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace the outer wrapper
old_wrapper = '<div className="bg-background flex gap-4 overflow-hidden box-border absolute top-4 bottom-4 left-4 right-4 md:top-6 md:bottom-6 md:left-6 md:right-6 rounded-2xl shadow-sm border border-border p-3 md:p-4">'
new_wrapper = '<div className="absolute inset-0 bg-white flex flex-col min-w-0 overflow-hidden z-10">'
content = content.replace(old_wrapper, new_wrapper)

# Simplify inner structure
content = content.replace('<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">', '<div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col min-w-0 pb-20">')

# Wait, we need to restructure it so PlannerHeader has padding
header_pattern = r'(<PlannerHeader[\s\S]*?/>)'
header_replacement = r'<div className="px-6 md:px-10 pt-6 md:pt-10">\1</div>'
content = re.sub(header_pattern, header_replacement, content)

# Remove the mt-3 flex flex-col flex-1 min-h-0 overflow-hidden wrappers
content = content.replace('<div className="mt-3 flex flex-col flex-1 min-h-0 overflow-hidden">', '<div className="flex flex-col flex-1 mt-6">')
content = content.replace('<div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">', '<div className="flex flex-col flex-1">')

# Capacity Summary wrapper
content = content.replace('<div className="shrink-0">', '<div className="shrink-0 px-6 md:px-10 mb-8">')

# Matrix wrapper - REMOVE the rounded border box!
content = content.replace('<div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-white overflow-hidden">', '<div className="flex-1 flex flex-col px-6 md:px-10">')

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
