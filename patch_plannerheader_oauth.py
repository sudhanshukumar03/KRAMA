import re

with open('apps/web/src/components/planner/PlannerHeader.tsx', 'r') as f:
    text = f.read()

# 1. Update Props interface
target_props = "  rightSlot?: React.ReactNode;"
replacement_props = "  rightSlot?: React.ReactNode;\n  isGoogleConnected?: boolean;\n  onDisconnectGoogle?: () => void;"
text = text.replace(target_props, replacement_props)

# 2. Update PlannerHeader function signature
target_sig = "  rightSlot,\n}: Props) => {"
replacement_sig = "  rightSlot,\n  isGoogleConnected,\n  onDisconnectGoogle\n}: Props) => {"
if "  rightSlot," in text and "isGoogleConnected" not in text:
    text = text.replace(target_sig, replacement_sig)
else:
    # try another format
    text = re.sub(r'  rightSlot,?\s*}: Props\) => \{', r'  rightSlot,\n  isGoogleConnected,\n  onDisconnectGoogle\n}: Props) => {', text)

# 3. Update the button
target_btn = '''            <button 
                onClick={() => {
                  const event = new CustomEvent('oauth-google-sync');
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"></path></svg>
                <span>Sync Calendar</span>
              </button>'''

replacement_btn = '''            {isGoogleConnected ? (
              <button 
                onClick={() => onDisconnectGoogle?.()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Disconnect Calendar</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  const event = new CustomEvent('oauth-google-sync');
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"></path></svg>
                <span>Sync Calendar</span>
              </button>
            )}'''

text = text.replace(target_btn, replacement_btn)

with open('apps/web/src/components/planner/PlannerHeader.tsx', 'w') as f:
    f.write(text)
