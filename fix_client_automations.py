with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

automations_api = """  automations: {
    list: () => fetchApi<any[]>('/automations'),
    create: (data: Record<string, any>) => fetchApi<any>('/automations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) => fetchApi<any>(`/automations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<{ success: boolean }>(`/automations/${id}`, { method: 'DELETE' }),
  },
"""

text = text.replace("  dashboard: {", automations_api + "  dashboard: {")

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
