# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerHeader.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r'<div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-\[\#0F172A\] border border-slate-200 \n?dark:border-\[\#334155\] rounded-lg text-\[11px\] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 \n?dark:hover:bg-\[\#1E293B\] transition-colors cursor-pointer shadow-sm">'
replacement = '''<button 
              onClick={() => {
                const event = new CustomEvent('oauth-google-sync');
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"></path></svg>
              <span>Sync Calendar</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors cursor-pointer shadow-sm" onClick={onLocationClick}>'''

content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
