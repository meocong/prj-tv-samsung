'use strict';
// The background service's web server, run under Node with a stand-in for the TV's tizen object.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NHAMINH_PORT = '18701';
global.tizen = { application: { getCurrentApplication: () => ({ getRequestedAppControl: () => null }), launch() {} } };
const service = require('../app/service/watch.js');

function call(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: 18701, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => resolve({ code: res.statusCode, text, json: () => JSON.parse(text) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('setup page, PIN, inbox', async (t) => {
  t.after(() => service._server.close());
  assert.equal((await call('GET', '/')).code, 503);                       // no page until the TV sends it
  assert.equal((await call('POST', '/api/local/page', '<h1>Cài đặt</h1>')).code, 200);
  assert.match((await call('GET', '/')).text, /Cài đặt/);
  await call('POST', '/api/local/state', { pin: '123456', state: { familyName: 'Nhà An' } });

  assert.equal((await call('GET', '/api/state?pin=000000')).code, 401);
  assert.equal((await call('GET', '/api/state?pin=123456')).json().state.familyName, 'Nhà An');
  assert.equal((await call('POST', '/api/profile?pin=123456', { familyName: 'Nhà Bình' })).code, 200);
  assert.equal((await call('POST', '/api/photo?pin=123456', { kind: 'family', data: 'data:image/jpeg;base64,AAAA' })).code, 200);
  assert.equal((await call('POST', '/api/photo?pin=123456', { data: 'javascript:alert(1)' })).code, 400);

  const inbox = (await call('GET', '/api/local/inbox')).json().items;
  assert.deepEqual(inbox.map((i) => i.type), ['profile', 'photo']);
  assert.equal(inbox[0].data.familyName, 'Nhà Bình');
  assert.deepEqual((await call('GET', '/api/local/inbox')).json().items, []);   // taken once
  assert.equal((await call('GET', '/status')).json().inbox, 0);
});
