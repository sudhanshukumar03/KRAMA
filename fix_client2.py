with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

text = text.replace('/notifications//read', '/notifications//read')

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
