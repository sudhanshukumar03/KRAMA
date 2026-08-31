import re
with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

# Remove all Zap, 
text = text.replace("Zap, ", "")

# Add it specifically to lucide-react
text = text.replace("import { \n  LayoutDashboard,", "import { \n  LayoutDashboard, Zap,")

with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
    f.write(text)
