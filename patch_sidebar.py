with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

target = "const systemItems = ["
replacement = "const systemItems = [\n  { name: 'Decision Log', path: '/app/decisions', icon: Search, shortcut: 'S D', badgeKey: null },"

if 'Decision Log' not in text:
    text = text.replace(target, replacement)
    with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
        f.write(text)
