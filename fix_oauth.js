const fs = require('fs');
let text = fs.readFileSync('apps/server/src/routes/oauth.routes.ts', 'utf8');

// I will just replace line 36-37 completely
let lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('http://localhost:5173/app/planner?sync=error&message=\\')) {
        lines[i] = "    res.redirect(http://localhost:5173/app/planner?sync=error&message=\);";
    }
}

fs.writeFileSync('apps/server/src/routes/oauth.routes.ts', lines.join('\n'));
console.log('oauth fixed');
