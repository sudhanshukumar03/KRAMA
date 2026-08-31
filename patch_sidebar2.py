with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    "Search, LogOut,",
    "Scale, Search, LogOut,"
)
text = text.replace(
    "{ name: 'Decision Log', path: '/app/decisions', icon: Search,",
    "{ name: 'Decision Log', path: '/app/decisions', icon: Scale,"
)

with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
    f.write(text)
