const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/planner/PlannerMatrix.tsx', 'utf8');

text = text.replace(/onAddTimeBlock: \(day: Date\) => void;/g, "onAddTimeBlock: (day?: Date) => void;");
text = text.replace(/onAddTask\?: \(day: Date\) => void;/g, "onAddTask?: (day?: Date) => void;");
text = text.replace(/onAddRoutine\?: \(day: Date\) => void;/g, "onAddRoutine?: (day?: Date) => void;");
text = text.replace(/onAddProject\?: \(day: Date\) => void;/g, "onAddProject?: (day?: Date) => void;");

fs.writeFileSync('apps/web/src/components/planner/PlannerMatrix.tsx', text);
console.log('done');
