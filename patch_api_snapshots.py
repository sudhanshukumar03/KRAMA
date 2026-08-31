import re
with open('apps/web/src/api/client.ts', 'r') as f:
    text = f.read()

target = r'''  snapshots:\s*\{\s*list:\s*\(\)\s*=>\s*Promise\.resolve\(\[\]\),\s*create:\s*\(data:\s*Partial<GoalProgressSnapshot>\)\s*=>\s*\{\s*throw new Error\('Not implemented yet'\);\s*\},\s*\},'''
text = re.sub(target, '', text)

with open('apps/web/src/api/client.ts', 'w') as f:
    f.write(text)
