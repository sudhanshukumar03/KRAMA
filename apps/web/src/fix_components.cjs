const fs = require('fs');
const path = require('path');
const componentsDir = path.join(process.cwd(), 'components');

function replaceInFile(filename, replacements) {
  const filePath = path.join(componentsDir, filename);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(({ search, replace }) => {
    content = content.replace(search, replace);
  });
  fs.writeFileSync(filePath, content);
}

replaceInFile('TimelineView.tsx', [
  { search: /category,\s*category,/g, replace: 'category,' },
  { search: /timeOfDay: /g, replace: 'category: ' },
]);

replaceInFile('WeeklyPlanner.tsx', [
  { search: /estimate: /g, replace: 'estimateMinutes: ' },
  { search: /estimate\} /g, replace: 'estimateMinutes} ' },
]);

replaceInFile('Projects.tsx', [
  { search: /_count\.issues/g, replace: '_count?.tasks' },
  { search: /_count\.docs/g, replace: '_count?.pages' },
]);

replaceInFile('ProjectDetail.tsx', [
  { search: /_count\.issues/g, replace: '_count?.tasks' },
  { search: /_count\.docs/g, replace: '_count?.pages' },
  { search: /\.issues\?/g, replace: '.tasks?' },
  { search: /\.docs\?/g, replace: '.pages?' },
]);

replaceInFile('KanbanBoard.tsx', [
  { search: /estimate:/g, replace: 'estimateMinutes:' },
  { search: /estimateMinutes: number/g, replace: 'estimate?: number' },
]);

console.log('Fixed specific TS issues');
