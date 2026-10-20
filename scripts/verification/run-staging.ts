import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { request } from 'node:https';
import { validateIntegrationTargets } from '../../apps/server/src/testing/testEnvironment';
const root = resolve(__dirname, '../..');
const tag = randomBytes(4).toString('hex'); const project = `krama-verify-${tag}`;
const data = resolve(root, '.audit/staging', tag); mkdirSync(resolve(data, 'tls'), { recursive: true });
const logs = resolve(root, 'test-results/services/staging'); mkdirSync(logs, { recursive: true });
const envFile = resolve(data, 'staging.env');
const password = randomBytes(24).toString('hex'); const redisPassword = randomBytes(24).toString('hex'); const jwt = randomBytes(48).toString('hex');
let env: NodeJS.ProcessEnv = { ...process.env };
const requireServer = createRequire(resolve(root, 'apps/server/package.json'));
requireServer('dotenv').config({ path: resolve(root, 'apps/server/.env'), processEnv: env, quiet: true });
const primaryDatabase = env.DATABASE_URL; const primaryRedis = env.REDIS_URL;
const redact = (text: string) => [password,redisPassword,jwt,primaryDatabase,primaryRedis,env.GROQ_API_KEY,env.GEMINI_API_KEY].filter((value): value is string => Boolean(value)).reduce((result, secret) => result.replaceAll(secret, '[redacted]'), text);
let usedDocker = false;
async function run(command: string, args: string[], label: string, inherit = false): Promise<number> {
  const output = createWriteStream(resolve(logs, `${label}.log`));
  const child = spawn(command, args, { cwd: root, env, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
  for (const stream of [child.stdout,child.stderr]) stream?.on('data', value => { const text = redact(String(value)); output.write(text); if (inherit) process.stdout.write(text); });
  return new Promise((done, reject) => { child.once('error', reject); child.once('close', code => { output.end(); done(code ?? 1); }); });
}
const compose = (args: string[], label: string, inherit = false) => run('docker', ['compose','--env-file',envFile,'--project-name',project,'-f','compose.verification.yml', ...args], label, inherit);
async function port() { const server = createServer(); await new Promise<void>((done,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',done); }); const value = (server.address() as {port:number}).port; await new Promise<void>(done => server.close(() => done())); return value; }
async function healthy(url: string) { return new Promise<boolean>(done => { const req = request(url, { rejectUnauthorized: false, timeout: 2000 }, reply => { reply.resume(); done(reply.statusCode === 200); }); req.on('error', () => done(false)); req.on('timeout', () => { req.destroy(); done(false); }); req.end(); }); }
async function main() {
 const dbPort = await port(), redisPort = await port(), httpsPort = await port();
 // Use a separate random subnet; no primary services, images or volumes are reused.
 const subnet = `172.${20 + parseInt(tag.slice(0,2),16) % 10}.${parseInt(tag.slice(2,4),16)}.0/24`;
 const proxy = subnet.replace('.0/24','.10');
 const values = { VERIFY_TAG: tag, VERIFY_DB_PASSWORD: password, VERIFY_REDIS_PASSWORD: redisPassword, VERIFY_JWT: jwt, VERIFY_DB_PORT: String(dbPort), VERIFY_REDIS_PORT: String(redisPort), VERIFY_HTTPS_PORT: String(httpsPort), VERIFY_PROXY_IP: proxy, VERIFY_SUBNET: subnet, VERIFY_DATA_DIR: data.replaceAll('\\','/') };
 writeFileSync(envFile, Object.entries(values).map(([key,value]) => `${key}=${value}`).join('\n')+'\n', { mode: 0o600 });
 env = { ...env, ...values };
 const nginx = readFileSync(resolve(root,'apps/web/nginx.conf'),'utf8').replace('listen 80;', 'listen 443 ssl;\n    ssl_certificate /etc/nginx/verification-tls/cert.pem;\n    ssl_certificate_key /etc/nginx/verification-tls/key.pem;');
 writeFileSync(resolve(data,'nginx.conf'),nginx);
 console.log('Building isolated production verification images.');
 if (await compose(['build','--build-arg','NODE_USE_ENV_PROXY=1','migrate','server','web'],'build')) throw new Error('Production verification image build failed; inspect sanitized build log.');
 if (await run('docker',['run','--rm','--user','0','--mount',`type=bind,source=${resolve(data,'tls')},target=/certs`,`krama-verification-server:${tag}`,'openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout','/certs/key.pem','-out','/certs/cert.pem','-days','2','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],'certificate')) throw new Error('Test-only TLS certificate generation failed.');
 usedDocker = true;
 if (await compose(['up','-d'],'startup')) throw new Error('Isolated staging startup failed; inspect service logs.');
 const origin = `https://127.0.0.1:${httpsPort}`;
 let ready = false;
 for (let attempt = 0; attempt < 120; attempt++) { if (await healthy(`${origin}/ready`)) { ready = true; break; } await new Promise(done => setTimeout(done,500)); }
 if (!ready) throw new Error('HTTPS staging readiness timed out.');
 console.log('Local HTTPS staging is ready; running production ingress, auth, restart and device-emulation checks.');
 const testDatabase = `postgresql://krama_verify:${password}@127.0.0.1:${dbPort}/krama_staging_test?schema=public`;
 const testRedis = `redis://:${redisPassword}@127.0.0.1:${redisPort}/14`;
 validateIntegrationTargets({ ...env, DATABASE_URL: primaryDatabase, REDIS_URL: primaryRedis, TEST_DATABASE_URL: testDatabase, TEST_REDIS_URL: testRedis });
 env = { ...env, DATABASE_URL: testDatabase, REDIS_URL: testRedis, TEST_DATABASE_URL: testDatabase, TEST_REDIS_URL: testRedis,
   KRAMA_PRIMARY_DATABASE_URL: primaryDatabase, KRAMA_PRIMARY_REDIS_URL: primaryRedis, KRAMA_INTEGRATION_TEST: '1', KRAMA_TEST_RUN_ID: tag,
   KRAMA_STAGING_PROJECT: project, KRAMA_STAGING_ENV_FILE: envFile, KRAMA_STAGING_URL: origin, KRAMA_API_TARGET: origin,
   KRAMA_PRODUCTION_VERIFY: '1', KRAMA_LIVE_VERIFY: '1', JWT_SECRET: jwt };
 delete env.NO_COLOR;
 const cli = createRequire(resolve(root,'package.json')).resolve('@playwright/test/cli');
 const args = [cli,'test','--config','playwright.staging.config.ts'];
 if (env.KRAMA_STAGING_GREP) args.push('--grep',env.KRAMA_STAGING_GREP);
 process.exitCode = await run(process.execPath,args,'tests',true);
}
main().catch(error => { console.error(redact(error.message)); process.exitCode = 1; }).finally(async () => {
 if (usedDocker) {
  await compose(['logs','--no-color'],'containers');
  // Project name is generated here; these volumes contain only owned synthetic fixtures.
  if (!/^krama-verify-[a-f0-9]{8}$/.test(project)) throw new Error('Invalid cleanup scope.');
  if (await compose(['down','--volumes','--remove-orphans'],'cleanup')) { console.error('Isolated staging cleanup failed.'); process.exitCode = 1; }
 }
});
