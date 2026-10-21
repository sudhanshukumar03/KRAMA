import { test, expect } from '../live/fixtures';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';

test('HTTPS login uses secure cookies and rotates the session on reload', async ({ page, context, account }) => {
  await account.signIn(page);
  const before = (await context.cookies()).find(cookie => cookie.name === 'krama_refresh');
  expect(before).toBeTruthy(); expect(before!.secure).toBe(true); expect(before!.httpOnly).toBe(true); expect(before!.sameSite).toBe('Strict');
  const refreshed = page.waitForResponse(response => response.url().endsWith('/auth/refresh') && response.request().method() === 'POST');
  await page.reload(); expect((await refreshed).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Review unfinished work', exact: true })).toBeVisible();
  const after = (await context.cookies()).find(cookie => cookie.name === 'krama_refresh');
  expect(after?.value).not.toBe(before!.value); expect(after?.secure).toBe(true);
});

test('authenticated WebSocket upgrades to WSS and receives committed task events', async ({ page, account }) => {
  const frames: string[] = [];
  let secureSocket = false; let connected = false; let upgraded = false;
  page.on('console', message => { if (message.text().includes('Real-time connection established')) connected = true; });
  page.on('websocket', socket => {
    if (!socket.url().includes('/socket.io/')) return;
    secureSocket ||= socket.url().startsWith('wss://');
    // Opening the upgrade probe does not switch application events from polling.
    // Engine.IO commits that switch with its upgrade packet (5).
    socket.on('framesent', event => { if (String(event.payload) === '5') upgraded = true; });
    socket.on('framereceived', event => frames.push(String(event.payload)));
  });
  await account.signIn(page);
  await expect.poll(() => secureSocket && connected && upgraded).toBe(true);
  const task = await account.call('POST', 'tasks', { title: 'WSS committed event', status: 'TODO' }, 201);
  await expect.poll(() => frames.some(frame => frame.includes('task:created') && frame.includes(task.id))).toBe(true);
});

test('worker notifications cross Redis and arrive over the authenticated WSS connection', async ({ page, account }) => {
  const frames: string[] = []; let connected = false; let upgraded = false;
  page.on('console', message => { if (message.text().includes('Real-time connection established')) connected = true; });
  page.on('websocket', socket => {
    socket.on('framesent', event => { if (String(event.payload) === '5') upgraded = true; });
    socket.on('framereceived', event => frames.push(String(event.payload)));
  });
  const task = await account.call('POST', 'tasks', { title: 'Real worker WSS notification', status: 'TODO' }, 201);
  await account.signIn(page); await expect.poll(() => connected && upgraded).toBe(true);
  await account.call('PATCH', `tasks/${task.id}`, { status: 'DONE', version: task.version });
  await expect.poll(() => frames.some(frame => frame.includes('notification') && frame.includes(task.id)), { timeout: 20000 }).toBe(true);
});

test('server worker and web restart preserve data, HTTPS session and socket recovery', async ({ page, account }) => {
  test.setTimeout(120000);
  const task = await account.call('POST', 'tasks', { title: 'Keep across service restart', status: 'TODO' }, 201);
  const space = await account.call('POST', 'spaces', { name: 'Restart notes' }, 201);
  const doc = await account.call('POST', 'documents', { title: 'Persisted restart note', spaceId: space.id,
    contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Synthetic restart persistence marker.' }] }] } }, 201);
  const authenticatedEngines = new Set<string>();
  const sockets: { engineId: string | null; authenticated: boolean; upgraded: boolean; received: string[] }[] = [];
  // The namespace acknowledgement can arrive over polling before the upgrade,
  // or directly over WSS. Associate either transport with its Engine.IO ID.
  page.on('response', async response => {
    const url = new URL(response.url());
    const engineId = url.searchParams.get('sid');
    if (!url.pathname.includes('/socket.io/') || url.searchParams.get('transport') !== 'polling' || !engineId || response.request().method() !== 'GET') return;
    try {
      if ((await response.text()).split('\x1e').some(packet => packet.startsWith('40{'))) authenticatedEngines.add(engineId);
    } catch { /* Navigating away may dispose a response from the old document. */ }
  });
  page.on('websocket', socket => {
    if (!socket.url().includes('/socket.io/')) return;
    const state = { engineId: new URL(socket.url()).searchParams.get('sid'), authenticated: false, upgraded: false, received: [] as string[] };
    sockets.push(state);
    socket.on('framesent', event => { if (String(event.payload) === '5') state.upgraded = true; });
    socket.on('framereceived', event => {
      const packet = String(event.payload);
      if (packet.startsWith('40{')) state.authenticated = true;
      state.received.push(packet);
    });
  });
  const ready = (socket: typeof sockets[number]) => socket.upgraded && (socket.authenticated || !!socket.engineId && authenticatedEngines.has(socket.engineId));
  await account.signIn(page);
  await expect.poll(() => sockets.some(ready)).toBe(true);
  const project = process.env.KRAMA_STAGING_PROJECT || '';
  const envFile = process.env.KRAMA_STAGING_ENV_FILE || '';
  const root = resolve(__dirname, '../..');
  if (!/^krama-verify-[a-f0-9]{8}$/.test(project) || !resolve(envFile).startsWith(resolve(root,'test-results/staging-data') + require('node:path').sep)) throw new Error('Refusing restart outside the generated verification stack.');
  await new Promise<void>((done,reject) => execFile('docker',['compose','--env-file',envFile,'--project-name',project,'-f','compose.verification.yml','restart','server','worker','web'], { cwd: root, timeout: 60000, windowsHide: true }, error => error ? reject(new Error('Isolated service restart failed.')) : done()));
  await expect.poll(async () => {
    // A restart can reset the connection before ingress can return a status.
    try { return (await page.request.get('/ready', { timeout: 2000 })).status(); }
    catch { return 0; }
  }, { timeout: 45000 }).toBe(200);
  const beforeReload = new Set(sockets);
  const reloadedSockets = () => sockets.filter(socket => !beforeReload.has(socket));
  const refreshed = page.waitForResponse(response => response.url().endsWith('/auth/refresh') && response.request().method() === 'POST');
  await page.reload(); expect((await refreshed).status()).toBe(200);
  await expect.poll(() => reloadedSockets().some(ready), { timeout: 15000 }).toBe(true);
  expect((await account.call('GET', `tasks/${task.id}`)).title).toBe(task.title);
  expect((await account.call('GET', `documents/${doc.id}`)).contentMarkdown).toContain('Synthetic restart persistence marker');
  const update = await account.call('PATCH', `tasks/${task.id}`, { title: 'Recovered WSS after restart', version: (await account.call('GET', `tasks/${task.id}`)).version });
  expect(update.title).toBe('Recovered WSS after restart');
  // Delivery over a newly opened, upgraded socket proves authenticated recovery.
  // Aggregate console messages can race with the pre-reload connection and do
  // not establish which connection delivered the event.
  try { await expect.poll(() => reloadedSockets().some(socket => ready(socket) && socket.received.some(frame => frame.includes('task:updated') && frame.includes(task.id))), { timeout: 15000 }).toBe(true); }
  catch (error) { await test.info().attach('socket-frame-types', { body: JSON.stringify({ sockets: sockets.map(socket => ({ upgraded: socket.upgraded, afterReload: !beforeReload.has(socket), frames: socket.received.map(frame => frame.startsWith('42') ? frame.slice(0, frame.indexOf(',')).slice(0, 80) : frame.slice(0, 4)) })) }), contentType: 'application/json' }); throw error; }
});
