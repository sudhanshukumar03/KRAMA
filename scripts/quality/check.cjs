const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { builtinModules } = require('node:module');
const builtins = new Set(builtinModules.map(name => name.replace(/^node:/, '')));
const root = path.resolve(__dirname, '../..');
const output = 'test-results/quality/source.json';
const measured = spawnSync(process.execPath, [path.join(__dirname, 'source-inventory.cjs'), '--output', output], { cwd: root, encoding: 'utf8', windowsHide: true });
if (measured.status !== 0) { console.error('Source inventory failed.'); process.exit(1); }
const inventory = JSON.parse(fs.readFileSync(path.join(root, output), 'utf8'));
const allowances = JSON.parse(fs.readFileSync(path.join(__dirname, 'allowances.json'), 'utf8'));
const failures = [];
for (const file of inventory.files.filter(file => !file.test && !file.data)) {
  const limit = allowances.explicitAny[file.path] || 0;
  if (file.explicitAny > limit) failures.push(`${file.path}: explicit any ${file.explicitAny} exceeds existing allowance ${limit}`);
  if (file.path.startsWith('apps/web/src/')) for (const dependency of file.imports) {
    if (dependency === '@prisma/client' || dependency.startsWith('node:') || builtins.has(dependency) || /(?:^|\/)apps\/server(?:\/|$)/.test(dependency)) failures.push(`${file.path}: browser import crosses server boundary (${dependency})`);
    if (dependency.startsWith('.')) {
      const resolved = path.resolve(root, path.dirname(file.path), dependency);
      if (resolved.startsWith(path.join(root,'apps/server') + path.sep)) failures.push(`${file.path}: relative browser import crosses server boundary`);
    }
  }
}
// Stable logical chunk groups, not hashes. Missing groups fail instead of silently bypassing budgets.
const budgets = [
  ['React vendor', /^vendor-react-.*\.js$/, 85],
  ['Editor vendor', /^vendor-editor-.*\.js$/, 140],
  ['Brain feature', /^BrainWorkspace-.*\.js$/, 36],
  ['Planner feature', /^PlannerPage-.*\.js$/, 30],
  ['Focus feature', /^FocusPage-.*\.js$/, 30],
  ['Global CSS', /^index-.*\.css$/, 28],
  ['Entry JS', /^index-.*\.js$/, 28],
];
for (const [name, pattern, kib] of budgets) {
  const chunks = inventory.bundle.filter(chunk => pattern.test(chunk.name));
  const bytes = chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0);
  if (!chunks.length) failures.push(`${name}: missing build group; build the client or review the group mapping`);
  else if (bytes > kib * 1024) failures.push(`${name}: ${(bytes/1024).toFixed(1)} KiB gzip exceeds ${kib} KiB`);
  else console.log(`${name}: ${(bytes/1024).toFixed(1)} / ${kib} KiB gzip`);
}
if (failures.length) { failures.forEach(failure => console.error(failure)); process.exitCode = 1; }
else console.log('Quality gates passed: existing-any ratchet, literal browser import boundaries and production chunk budgets.');
