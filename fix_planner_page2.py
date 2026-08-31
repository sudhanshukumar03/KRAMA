import re
with open('apps/web/src/components/planner/PlannerPage.tsx', 'r') as f:
    text = f.read()

text = re.sub(r'isGoogleConnected=\{isGoogleConnected\}', '', text)
text = re.sub(r'onDisconnectGoogle=\{handleDisconnectGoogle\}', '', text)
text = re.sub(r'onSyncGoogle=\{handleSyncGoogleNow\}', '', text)
text = re.sub(r'isSyncingGoogle=\{isSyncingGoogle\}', '', text)

with open('apps/web/src/components/planner/PlannerPage.tsx', 'w') as f:
    f.write(text)
