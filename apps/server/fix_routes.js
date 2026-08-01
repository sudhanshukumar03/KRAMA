const fs = require('fs');
const path = require('path');

const dir = 'src/routes';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const fullPath = path.join(dir, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (!content.includes("import type { Router } from 'express';")) {
    content = "import type { Router } from 'express';\n" + content;
  }
  
  content = content.replace(/const router = express\.Router\(\);/g, 'const router: Router = express.Router();');
  content = content.replace(/const router = Router\(\);/g, 'const router: Router = Router();');
  
  fs.writeFileSync(fullPath, content);
  console.log('Fixed router types for', fullPath);
}
