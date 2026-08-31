with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

text = text.replace("X, Bell\n  Zap\n}", "X, Bell,\n  Zap\n}")
text = text.replace("icon: shortcut: 'S A'", "icon: Zap, shortcut: 'S A'")

with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
    f.write(text)
