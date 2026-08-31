# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/CalendarMode.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('className="bg-slate-50 rounded-2xl p-5 border border-slate-200"', 'className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"')

with codecs.open('apps/web/src/components/planner/CalendarMode.tsx', 'w', 'utf-8') as f:
    f.write(content)
