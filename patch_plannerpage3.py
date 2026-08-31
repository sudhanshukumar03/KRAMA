with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    text = f.read()

target = '''      const res = await fetch('/api/v1/oauth/google/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': \Bearer \\
        }
      });
      if (!res.ok) throw new Error('Failed to disconnect');'''

replacement = '''      await api.oauth.disconnectGoogle();'''

text = text.replace(target, replacement)
with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(text)
