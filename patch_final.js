const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

if (!text.includes('useAuth')) {
    text = text.replace("import { useSearchParams } from 'react-router-dom';", "import { useSearchParams } from 'react-router-dom';\nimport { useAuth } from '../../contexts/AuthContext';");
}

if (!text.includes('isGoogleConnected')) {
    text = text.replace("const [searchParams, setSearchParams] = useSearchParams();", "const { user } = useAuth();\n  const isGoogleConnected = !!(user?.metadata as any)?.googleRefreshToken;\n  const [searchParams, setSearchParams] = useSearchParams();");
}

if (!text.includes('handleDisconnectGoogle')) {
    text = text.replace("const handleSync = () => {", "const handleDisconnectGoogle = async () => {\n    try {\n      await api.oauth.disconnectGoogle();\n      toast.success('Disconnected from Google Calendar');\n      setTimeout(() => window.location.reload(), 1000);\n    } catch (e: any) {\n      toast.error(e.message);\n    }\n  };\n\n  const handleSync = () => {");
}

if (!text.includes('isGoogleConnected={isGoogleConnected}')) {
    text = text.replace("countryRegion={countryRegionStr}", "countryRegion={countryRegionStr}\n          isGoogleConnected={isGoogleConnected}\n          onDisconnectGoogle={handleDisconnectGoogle}");
}

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', text);
