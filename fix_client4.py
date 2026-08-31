with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

text = text.replace(
    "projects: {",
    "roadmapItems: {\n      list: () => fetchApi<any[]>('/roadmap-items'),\n    },\n    projects: {"
)

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
