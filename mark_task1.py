# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/task.md'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('- [ ] **Component 1: Focus Sessions**', '- [x] **Component 1: Focus Sessions**')
content = content.replace('- [ ] Backend: Create `apps/server/src/routes/focus.routes.ts`', '- [x] Backend: Create `apps/server/src/routes/focus.routes.ts` (Used existing)')
content = content.replace('- [ ] Backend: Mount `/api/focus` in `index.ts`', '- [x] Backend: Mount `/api/focus` in `index.ts` (Already existed)')
content = content.replace('- [ ] Frontend: Build `FocusTimerWidget.tsx` and integrate it into the UI', '- [x] Frontend: Build `FocusTimerWidget.tsx` and integrate it into the UI')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
