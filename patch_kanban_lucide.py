import re
with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

target = "import { Circle, CircleDot, CircleDashed, CheckCircle, CheckCircle2, ListChecks, Search, Filter, Plus, User, AlertCircle, X } from 'lucide-react';"
replacement = "import { Circle, CircleDot, CircleDashed, CheckCircle, CheckCircle2, ListChecks, Search, Filter, Plus, User, AlertCircle, X, MessageSquare } from 'lucide-react';"

if 'MessageSquare' not in target and 'MessageSquare }' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
        f.write(text)
