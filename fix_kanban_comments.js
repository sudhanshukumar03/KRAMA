const fs = require('fs');
let text = fs.readFileSync('apps/web/src/components/KanbanBoard.tsx', 'utf8');

// Find all indices of 'Comments Section'
const parts = text.split('{/* Comments Section */}');

// parts[0] is everything before the first comment block
// parts[1] is the first comment block + the end of the first modal
// parts[2] is the second comment block + the end of the second modal

// I need to strip the comments block from the end of parts[0] + beginning of parts[1]
// Actually, since I replaced:
// </select>\n</div>\n</div>\n<div className="mt-8 flex justify-end gap-3">
// with replacement, I can just replace the first occurrence of replacement with the original!

const replacementPattern = /\{\/\* Comments Section \*\/\}.*?<button\n\s*type="button"\n\s*onClick=\{onClose\}/s;

// We will reconstruct the file.
// The first replacement we want to undo.
// But wait, my regex matched </select>\n</div>\n</div>\n<div className="mt-8 flex justify-end gap-3">
// Let's just find the first {/* Comments Section */} and remove it up to <div className="mt-8 flex justify-end gap-3">
text = text.replace(/\{\/\* Comments Section \*\/\}.*?(?=<div className="mt-8 flex justify-end gap-3">)/s, "</div>\n");

fs.writeFileSync('apps/web/src/components/KanbanBoard.tsx', text);
console.log('done');
