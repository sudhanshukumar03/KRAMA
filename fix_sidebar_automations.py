import re
with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

# Add Zap icon
if "Zap," not in text:
    text = text.replace("import { ", "import { Zap, ")

# Add to systemItems
text = text.replace(
    "{ name: 'Analytics', path: '/app/analytics', icon: TrendingUp, shortcut: 'S N', badgeKey: null },",
    "{ name: 'Analytics', path: '/app/analytics', icon: TrendingUp, shortcut: 'S N', badgeKey: null },\n    { name: 'Automations', path: '/app/automations', icon: Zap, shortcut: 'S A', badgeKey: null },"
)

with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
    f.write(text)
