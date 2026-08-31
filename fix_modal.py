import re

with open('apps/web/src/components/planner/TimeBlockModal.tsx', 'r') as f:
    code = f.read()

code = code.replace('<form onSubmit={handleSubmit} className="p-5 space-y-4">', 
'''<form onSubmit={handleSubmit} className="p-5 space-y-4">
          {editingBlock?.isExternal ? (
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-4 text-center space-y-2">
              <div className="text-blue-800 font-semibold text-sm">External Calendar Event</div>
              <p className="text-blue-600 text-xs">This event is synced from {editingBlock.source || 'an external calendar'} and cannot be edited or deleted in KRAMA. Please edit it directly in your calendar provider.</p>
            </div>
          ) : null}''')

code = code.replace('<div className="pt-4 flex items-center gap-3">', 
'''<div className="pt-4 flex items-center gap-3">
            {editingBlock?.isExternal ? (
              <button type="button" onClick={onClose} className="flex-1 bg-muted text-foreground hover:bg-muted/80 rounded-xl py-2.5 text-sm font-semibold transition-colors">Close</button>
            ) : (''')

code = code.replace('</button>\n          </div>\n        </form>', 
'''</button>
            )}
          </div>
        </form>''')

with open('apps/web/src/components/planner/TimeBlockModal.tsx', 'w') as f:
    f.write(code)
