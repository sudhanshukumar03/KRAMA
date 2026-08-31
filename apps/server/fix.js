const fs = require('fs');

let service = fs.readFileSync('src/services/google-calendar.service.ts', 'utf8');
service = service.replace(/startTime:\s*['\"].*?['\"]/g, 'startTime: new Date()');
service = service.replace(/endTime:\s*['\"].*?['\"]/g, 'endTime: new Date()');
service = service.replace(/date:\s*['\"].*?['\"]/g, 'date: new Date()');
fs.writeFileSync('src/services/google-calendar.service.ts', service);

let routes = fs.readFileSync('src/routes/planner.routes.ts', 'utf8');
const lines = routes.split('\n');
const filtered = lines.filter(l => !l.includes('fetchGoogleCalendarEvents} from') && !l.includes('fetchGoogleCalendarEvents } from'));
filtered.unshift('import { fetchGoogleCalendarEvents } from \'../services/google-calendar.service\';');
fs.writeFileSync('src/routes/planner.routes.ts', filtered.join('\n'));
