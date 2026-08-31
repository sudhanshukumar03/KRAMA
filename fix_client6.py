with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

# I added:
# notifications: {
#     list: () => fetchApi<any[]>('/notifications'),
#     markAsRead: (id: string) => fetchApi<any>(`/notifications/${id}/read`, { method: 'PATCH' })
#   },
# Let's remove the first instance of it.
import re

text = re.sub(r'notifications:\s*\{\s*list:\s*\(\)\s*=>\s*fetchApi<any\[\]>\(\'/notifications\'\),\s*markAsRead:\s*\(id:\s*string\)\s*=>\s*fetchApi<any>\(`\/notifications/\$\{id\}/read`,\s*\{\s*method:\s*\'PATCH\'\s*\}\)\s*\},', '', text)

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
