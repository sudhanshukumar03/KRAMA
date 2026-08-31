with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = "    disconnectGoogle: () => fetchApi<{ success: boolean }>('/oauth/google/disconnect', { method: 'DELETE' }),"
replacement = '''    disconnectGoogle: () => fetchApi<{ success: boolean }>('/oauth/google/disconnect', { method: 'DELETE' }),
    syncGoogle: (start?: string, end?: string) => fetchApi<{ success: boolean }>('/oauth/google/sync', { method: 'POST', body: JSON.stringify({ start, end }) }),'''

if 'syncGoogle' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
