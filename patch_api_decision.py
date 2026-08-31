with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = "restore: (id: string) => { throw new Error('Not implemented yet'); }"
replacement = "restore: (id: string) => fetchApi<{ success: boolean }>(/decisions//restore, { method: 'POST' })"

if 'restore: (id: string) => fetchApi' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
