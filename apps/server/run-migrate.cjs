const { spawn } = require('child_process');
const child = spawn('npx', ['prisma', 'migrate', 'dev', '--name', 'add_auth'], { shell: true });
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
setTimeout(() => {
  child.stdin.write('y\n');
  child.stdin.end();
}, 2000);
