with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = "rebalance: () => fetchApi<{ success: boolean }>('/tasks/rebalance', { method: 'POST' }),"
replacement = "rebalance: () => fetchApi<{ success: boolean }>('/tasks/rebalance', { method: 'POST' }),\n    addComment: (taskId: string, content: string) => fetchApi<any>(/tasks//comments, { method: 'POST', body: JSON.stringify({ content }) }),"

if 'addComment: (taskId' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
