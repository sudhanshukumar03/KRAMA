with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

text = text.replace(
    "complete: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}/complete`, { method: 'PATCH' }),",
    "complete: (id: string) => fetchApi<IssueWithRelations>(`/tasks/${id}/complete`, { method: 'PATCH' }),\n      addComment: (id: string, content: string) => fetchApi<any>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),"
)

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
