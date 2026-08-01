const fs = require('fs');
const path = require('path');
const componentsDir = path.join(process.cwd(), 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/"done"/g, '"DONE"');
  content = content.replace(/'done'/g, '"DONE"');
  content = content.replace(/"todo"/g, '"TODO"');
  content = content.replace(/'todo'/g, '"TODO"');
  content = content.replace(/"in_progress"/g, '"IN_PROGRESS"');
  content = content.replace(/'in_progress'/g, '"IN_PROGRESS"');
  content = content.replace(/"backlog"/g, '"BACKLOG"');
  content = content.replace(/'backlog'/g, '"BACKLOG"');
  content = content.replace(/"urgent"/g, '"URGENT"');
  content = content.replace(/'urgent'/g, '"URGENT"');
  content = content.replace(/"high"/g, '"HIGH"');
  content = content.replace(/'high'/g, '"HIGH"');
  content = content.replace(/"medium"/g, '"MEDIUM"');
  content = content.replace(/'medium'/g, '"MEDIUM"');
  content = content.replace(/"low"/g, '"LOW"');
  content = content.replace(/'low'/g, '"LOW"');
  content = content.replace(/"released"/g, '"REVIEW"');
  content = content.replace(/'released'/g, '"REVIEW"');
  content = content.replace(/\.issues/g, '.tasks');
  content = content.replace(/\.docs/g, '.pages');
  content = content.replace(/childIssues/g, 'childTasks');
  content = content.replace(/parentIssue/g, 'parentTask');
  
  if (file === 'TimelineView.tsx') {
    content = content.replace(/category,\s*category,/g, 'category,');
  }
  
  fs.writeFileSync(filePath, content);
});
console.log('Replaced enums and array keys');
