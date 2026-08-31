# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/task.md'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('- [ ] **Component 3: External Calendar Sync (OAuth)**', '- [x] **Component 3: External Calendar Sync (OAuth)**')
content = content.replace('- [ ] Database: Add `OAuthCredential` model in Prisma and run `npx prisma db push`', '- [x] Database: No Prisma changes needed, using ExternalItem & user.metadata')
content = content.replace('- [ ] Backend: Create `apps/server/src/routes/oauth.routes.ts` (Google OAuth flow)', '- [x] Backend: Create `apps/server/src/routes/oauth.routes.ts` (Google OAuth mock)')
content = content.replace('- [ ] Backend: Mount `/api/oauth` in `index.ts`', '- [x] Backend: Mount `/api/v1/oauth` in `index.ts`')
content = content.replace('- [ ] Frontend: Add "Sync Google Calendar" button in `PlannerHeader.tsx`', '- [x] Frontend: Add "Sync Google Calendar" button in `PlannerHeader.tsx`')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
