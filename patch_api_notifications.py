import re
with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = "  decisions: {"
replacement = "  notifications: {\n    list: () => fetchApi<any[]>('/notifications'),\n    markAsRead: (id: string) => fetchApi<{ success: boolean }>(/notifications//read, { method: 'PATCH' })\n  },\n  decisions: {"

if 'notifications: {' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
