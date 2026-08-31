# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace the outer wrapper
content = content.replace(
    '<div className="p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20">',
    '<div className="absolute inset-0 bg-white flex flex-col min-w-0 overflow-hidden z-10">'
)

# Fix Header padding - the user said "lot of spcae above planner heading adjust that and making more precise"
content = content.replace(
    '<div className="px-6 md:px-10 pt-6 md:pt-10"><PlannerHeader',
    '<div className="px-6 pt-4"><PlannerHeader'
)

# Fix main body wrappers
content = content.replace(
    '<div className="flex flex-col flex-1 mt-6">',
    '<div className="flex-1 flex flex-col min-h-0 mt-4">'
)
content = content.replace(
    '<div className="flex flex-col gap-6">',
    '<div className="flex flex-col gap-4 flex-1 min-h-0 px-6">'
)
content = content.replace(
    '<div>\n                <PlannerMatrix',
    '<div className="flex-1 flex flex-col min-h-0 pb-4">\n                <PlannerMatrix'
)

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
