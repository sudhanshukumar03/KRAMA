const fs = require('fs');
let text = fs.readFileSync('apps/web/src/types/schema.ts', 'utf8');

text = text.replace(
    /labels\?: Label\[\];/g,
    "labels?: Label[];\n  comments?: any[];"
);

fs.writeFileSync('apps/web/src/types/schema.ts', text);
console.log('done');
