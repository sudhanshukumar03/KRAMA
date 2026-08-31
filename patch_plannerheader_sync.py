with open('apps/web/src/components/planner/PlannerHeader.tsx', 'r') as f:
    text = f.read()

target = "onDisconnectGoogle?: () => void;"
replacement = "onDisconnectGoogle?: () => void;\n  onSyncGoogle?: () => void;\n  isSyncingGoogle?: boolean;"
if 'onSyncGoogle?:' not in text:
    text = text.replace(target, replacement)

target2 = "onDisconnectGoogle\n}: Props) => {"
replacement2 = "onDisconnectGoogle,\n  onSyncGoogle,\n  isSyncingGoogle\n}: Props) => {"
if 'onSyncGoogle\n' not in text:
    text = text.replace(target2, replacement2)

target3 = '''              <button 
                onClick={() => onDisconnectGoogle?.()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Disconnect Calendar</span>
              </button>'''

replacement3 = '''              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onSyncGoogle?.()}
                  disabled={isSyncingGoogle}
                  className={lex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-blue-600 hover:bg-slate-50 transition-colors shadow-sm }
                >
                  <RefreshCw className={w-3.5 h-3.5 } />
                  <span>{isSyncingGoogle ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <button 
                  onClick={() => onDisconnectGoogle?.()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                >
                  <span>Disconnect</span>
                </button>
              </div>'''

if 'Sync Now' not in text:
    text = text.replace(target3, replacement3)
    with open('apps/web/src/components/planner/PlannerHeader.tsx', 'w') as f:
        f.write(text)
