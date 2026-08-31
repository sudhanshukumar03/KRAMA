import re

with open('apps/web/src/components/planner/TimeBlockModal.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    \") : (\\n            {editingBlock && onDelete && (\",
    \") : (\\n              <>\\n                {editingBlock && onDelete && (\"
)

code = code.replace(
    \"</button>\\n            )}\\n          </div>\",
    \"</button>\\n              </>\\n            )}\\n          </div>\"
)

with open('apps/web/src/components/planner/TimeBlockModal.tsx', 'w') as f:
    f.write(code)
