const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

text = text.replace(/isGoogleConnected=\{isGoogleConnected\}\n\s*onDisconnectGoogle=\{handleDisconnectGoogle\}\n\s*onSyncGoogle=\{handleSyncGoogleNow\}\n\s*isSyncingGoogle=\{isSyncingGoogle\}/s, "");

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', text);
console.log('done');
