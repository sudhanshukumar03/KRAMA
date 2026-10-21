import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { trustedProxyAddresses } from '../config/proxy';

test('direct API requests cannot spoof the IP through forwarded headers', async () => {
  const app = express();
  app.set('trust proxy', trustedProxyAddresses());
  app.get('/', (req, res) => res.json({ ip: req.ip }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/`, { headers: { 'X-Forwarded-For': '198.51.100.23' } });
    assert.deepEqual(await response.json(), { ip: '127.0.0.1' });
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('only configured proxy addresses may supply the client IP', () => {
  const app = express();
  app.set('trust proxy', trustedProxyAddresses(' 127.0.0.1/32, ::1/128 '));
  const trust = app.get('trust proxy fn');
  assert.equal(trust('127.0.0.1', 0), true);
  assert.equal(trust('198.51.100.23', 0), false);
  assert.equal(trustedProxyAddresses(' , '), false);
});

test('IPv6 proxy subnets cannot accidentally trust unrelated IPv4 clients', () => {
  const app = express();
  for (const subnet of ['::ffff:10.0.0.0/8', '::/1']) {
    app.set('trust proxy', trustedProxyAddresses(subnet));
    const trust = app.get('trust proxy fn');
    assert.equal(trust('198.51.100.23', 0), false, `${subnet} must not accept an unrelated IPv4 client`);
  }
});

test('a correctly mapped IPv4 proxy subnet retains its intended boundary', () => {
  const app = express();
  app.set('trust proxy', trustedProxyAddresses('::ffff:10.0.0.0/104'));
  const trust = app.get('trust proxy fn');
  assert.equal(trust('10.1.2.3', 0), true);
  assert.equal(trust('198.51.100.23', 0), false);
});

test('a trusted proxy uses the nearest untrusted hop, ignoring a forged prefix', async () => {
  const app = express();
  app.set('trust proxy', trustedProxyAddresses('127.0.0.1/32'));
  app.get('/', (req, res) => res.json({ ip: req.ip }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      headers: { 'X-Forwarded-For': '198.51.100.23, 203.0.113.40' },
    });
    assert.deepEqual(await response.json(), { ip: '203.0.113.40' });
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
