import re
with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

text = re.sub(r'fetchApi<any>\(/notifications//read, \{ method: \'PATCH\' \}\)', 'fetchApi<any>(`/notifications/${id}/read`, { method: \'PATCH\' })', text)

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
