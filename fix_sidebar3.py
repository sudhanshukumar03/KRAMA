import re
with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

text = text.replace("} from 'lucide-react';", "  Zap\n} from 'lucide-react';")

with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
    f.write(text)
