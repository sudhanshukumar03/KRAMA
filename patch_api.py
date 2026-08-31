with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = "  ai: {"
replacement = '''  oauth: {
    disconnectGoogle: () => fetchApi<{ success: boolean }>('/oauth/google/disconnect', { method: 'DELETE' }),
  },
  ai: {'''
if 'disconnectGoogle' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/api/client.ts', 'w') as f:
        f.write(text)
