const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');
text = text.replace(
    /import \{ COUNTRIES, INDIAN_STATES \} from '\.\/LocationSettingsModal';/g,
    "import { LocationSettingsModal, COUNTRIES, INDIAN_STATES } from './LocationSettingsModal';"
);
fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', text);
console.log('done');
