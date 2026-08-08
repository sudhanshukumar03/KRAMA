const fs = require('fs');
const path = require('path');

const filesToExport = [
  'apps/server/prisma/schema.prisma',
  'apps/server/src/services/goal.service.ts',
  'apps/server/src/repositories/goal.repository.ts',
  'apps/web/src/components/Goals.tsx',
  'apps/web/src/components/ui/IconPicker.tsx',
  'apps/web/src/hooks/useHabitCompletion.ts',
  'apps/web/src/components/HabitTracker.tsx'
];

let output = '# Section 3 Changed Files\n\nHere is the full source code for the files modified during Section 3 (Goals & OKRs).\n\n';

for (const file of filesToExport) {
  const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf-8');
  output += `## [${path.basename(file)}](file:///C:/Users/sksin/OneDrive/Desktop/Krama/${file})\n\n`;
  
  const ext = path.extname(file).replace('.', '');
  output += '```' + (ext === 'tsx' || ext === 'ts' ? 'typescript' : ext) + '\n';
  output += content;
  output += '\n```\n\n';
}

fs.writeFileSync(
  'C:\\Users\\sksin\\.gemini\\antigravity\\brain\\8e1f5d8e-f1f4-4b09-b83e-db272bf4e796\\section3_changes.md',
  output
);
console.log('Artifact created successfully.');
