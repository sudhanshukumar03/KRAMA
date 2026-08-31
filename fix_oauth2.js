const fs = require('fs');
let text = fs.readFileSync('apps/server/src/routes/oauth.routes.ts', 'utf8');
text = text.replace('res.redirect(http://localhost:5173/app/planner?sync=error&message=);', 'res.redirect(`http://localhost:5173/app/planner?sync=error&message=${encodeURIComponent(error.message)}`);');
fs.writeFileSync('apps/server/src/routes/oauth.routes.ts', text);
console.log('done');
