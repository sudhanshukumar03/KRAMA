const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

if (!text.includes('const handleDisconnectGoogle =')) {
    text = text.replace(/const handleSync = \(\) => \{/, "const handleDisconnectGoogle = async () => {\n    try {\n      await api.oauth.disconnectGoogle();\n      toast.success('Disconnected from Google Calendar');\n      setTimeout(() => window.location.reload(), 1000);\n    } catch (e: any) {\n      toast.error(e.message);\n    }\n  };\n\n  const handleSync = () => {");
}

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', text);
