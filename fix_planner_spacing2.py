# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace the h-[calc] with the exact inset that fits the main container perfectly
content = content.replace(
    '<div className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex gap-6 overflow-hidden box-border">',
    '<div className="bg-background flex gap-4 overflow-hidden box-border absolute top-4 bottom-4 left-4 right-4 md:top-6 md:bottom-6 md:left-6 md:right-6 rounded-2xl shadow-sm border border-border p-3 md:p-4">'
)

content = content.replace(
    '<div className="flex-1 flex flex-col min-w-0 h-full">',
    '<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">'
)

content = content.replace(
    '<div className="mt-6 flex flex-col flex-1 min-h-0">',
    '<div className="mt-3 flex flex-col flex-1 min-h-0 overflow-hidden">'
)
content = content.replace(
    '<div className="mt-6 flex flex-col">',
    '<div className="mt-3 flex flex-col flex-1 min-h-0 overflow-hidden">'
)

content = content.replace(
    '<div className="flex flex-col gap-4 flex-1 min-h-0">',
    '<div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">'
)
content = content.replace(
    '<div className="flex flex-col gap-4">',
    '<div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">'
)

content = content.replace(
    '<div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden border border-border">',
    '<div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-white overflow-hidden">'
)
content = content.replace(
    '<div className="flex flex-col rounded-xl border border-border bg-white">',
    '<div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-white overflow-hidden">'
)

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
