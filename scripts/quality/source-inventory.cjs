// Read-only inventory. Reports evidence; thresholds are review signals, not quality scores.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const roots = ['apps/web/src', 'apps/server/src', 'packages/types/src', 'packages/validation/src', 'e2e'];
const posix = value => value.split(path.sep).join('/');
function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(tsx?|css)$/.test(file) ? [file] : [];
  });
}
const files = roots.flatMap(directory => walk(path.join(root, directory))).sort().map(file => {
  const source = fs.readFileSync(file, 'utf8');
  const relative = posix(path.relative(root, file));
  const row = { path: relative, sha256: crypto.createHash('sha256').update(source).digest('hex'), lines: source.trimEnd().split(/\r?\n/).length,
    test: /(?:__tests__\/|e2e\/|\.(?:test|spec)\.)/.test(relative), data: relative.includes('/holidays/data/'), reviewOnly: relative.startsWith('apps/web/src/quality/'),
    explicitAny: 0, assertions: 0, hooks: {}, imports: [], routes: [], browserConfirms: [], tests: [] };
  if (file.endsWith('.css')) return row;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const line = node => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) row.explicitAny++;
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) row.assertions++;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) row.imports.push(node.moduleSpecifier.text);
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) row.imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(tree);
      const first = node.arguments[0];
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && first && ts.isStringLiteral(first)) row.imports.push(first.text);
      if (/^(?:React\.)?use[A-Z]/.test(name)) row.hooks[name] = (row.hooks[name] || 0) + 1;
      if (name === 'window.confirm') row.browserConfirms.push(line(node));
      if (/^(?:router|app)\.(get|post|patch|put|delete|use)$/.test(name) && first && ts.isStringLiteral(first)) row.routes.push({ method: name.split('.')[1].toUpperCase(), path: first.text, line: line(node) });
      if (/^(?:test|it)(?:\.(?:skip|only))?$/.test(name) && first && ts.isStringLiteral(first)) row.tests.push({ name: first.text, line: line(node) });
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return row;
});
const production = files.filter(file => !file.test && !file.data && !file.reviewOnly);
const summaries = roots.map(directory => {
  const rows = production.filter(file => file.path.startsWith(directory + '/'));
  return { root: directory, files: rows.length, lines: rows.reduce((sum, file) => sum + file.lines, 0), explicitAny: rows.reduce((sum, file) => sum + file.explicitAny, 0) };
});
const bundleDirectory = path.join(root, 'apps/web/dist/assets');
const bundle = fs.existsSync(bundleDirectory) ? fs.readdirSync(bundleDirectory).filter(file => /\.(js|css)$/.test(file)).map(name => {
  const file = path.join(bundleDirectory, name), content = fs.readFileSync(file);
  return { name, bytes: content.length, gzipBytes: zlib.gzipSync(content).length, modified: fs.statSync(file).mtime.toISOString() };
}).sort((a, b) => b.gzipBytes - a.gzipBytes) : [];
const report = { schema: 1, measuredAt: new Date().toISOString(), node: process.version, platform: process.platform,
  caveats: ['AST counts describe syntax, not safety or architecture.', 'Existing dist assets may predate the current source; timestamps are retained.'],
  summaries, largestProduction: [...production].sort((a,b) => b.lines-a.lines).slice(0,20).map(({ path, lines, explicitAny, hooks }) => ({ path, lines, explicitAny, hooks })), bundle, files };
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1) {
  if (!process.argv[outputIndex+1]) throw new Error('Supply an inventory output path.');
  const output = path.resolve(root, process.argv[outputIndex+1]);
  const relative = path.relative(root, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Inventory output must stay in the workspace.');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({ summaries, largestProduction: report.largestProduction.slice(0,8), existingBundleFiles: bundle.length },null,2));
