with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = '''  spaces: {
    list: () => Promise.resolve([]),
    create: (data: Partial<Space>) => { throw new Error('Not implemented yet'); },
    update: (id: string, data: Partial<Space>) => { throw new Error('Not implemented yet'); },
    delete: (id: string) => { throw new Error('Not implemented yet'); },
  },'''
replacement = '''  spaces: {
    list: () => fetchApi<Space[]>('/spaces'),
    create: (data: Partial<Space>) => fetchApi<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Space>) => fetchApi<Space>(/spaces/, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ success: boolean }>(/spaces/, { method: 'DELETE' }),
  },'''

if 'spaces: {' in text and 'Promise.resolve([])' in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
