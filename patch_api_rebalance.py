with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = "restore: (id: string) => fetchApi<Task>(/tasks//restore, { method: 'POST' }),"
replacement = "restore: (id: string) => fetchApi<Task>(/tasks//restore, { method: 'POST' }),\n    rebalance: () => fetchApi<{ success: boolean }>('/tasks/rebalance', { method: 'POST' }),"

if 'rebalance: ()' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
