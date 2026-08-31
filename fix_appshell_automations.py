import re
with open('apps/web/src/components/AppShell.tsx', 'r') as f:
    text = f.read()

if "import { AutomationRules }" not in text:
    text = text.replace("import { KnowledgeGraph } from './KnowledgeGraph';", "import { KnowledgeGraph } from './KnowledgeGraph';\nimport { AutomationRules } from './AutomationRules';")

text = text.replace(
    "<Route path=\"/graph\" element={<KnowledgeGraph />} />",
    "<Route path=\"/graph\" element={<KnowledgeGraph />} />\n                <Route path=\"/automations\" element={<AutomationRules />} />"
)

with open('apps/web/src/components/AppShell.tsx', 'w') as f:
    f.write(text)
