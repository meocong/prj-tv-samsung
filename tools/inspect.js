#!/usr/bin/env node
/*
 * Điều khiển app trên TV qua Chrome DevTools Protocol (cổng debug của sdb): đọc console, chạy JS,
 * gửi phím và chụp ảnh màn hình app. Dùng qua tools/debug.sh, hoặc trực tiếp:
 *
 *   node tools/inspect.js --port 34163 --watch 8            # in console trong 8 giây
 *   node tools/inspect.js --port 34163 --eval "apps.length"
 *   node tools/inspect.js --port 34163 --keys down,down,ok --shot shot.png
 *   node tools/inspect.js --port 34163 --await --eval-file job.js --out result.json   # JS from a file, JSON to a file
 *
 * Keys: left right up down ok back red green yellow blue, or a number (keyCode). "wait500" pauses 500 ms.
 */
'use strict';
const fs = require('fs');
const http = require('http');

const args = process.argv.slice(2);
function opt(name, def) {
  const i = args.indexOf('--' + name);
  return i === -1 ? def : args[i + 1];
}
const port = Number(opt('port', process.env.TV_DEBUG_PORT || 0));
if (!port) { console.error('need --port'); process.exit(2); }

const KEYCODES = { left: 37, up: 38, right: 39, down: 40, ok: 13, back: 10009, red: 403, green: 404, yellow: 405, blue: 406 };

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const targets = await getJson('/json');
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+\//, 'ws://127.0.0.1:' + port + '/'));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => (a.value !== undefined ? a.value : a.description || a.type)).join(' ');
      console.log('[console.' + msg.params.type + '] ' + text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      console.log('[exception] ' + (d.exception && d.exception.description || d.text) + ' @' + d.url + ':' + d.lineNumber);
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      console.log('[log.' + e.level + '] ' + e.text + (e.url ? ' ' + e.url : ''));
    }
  };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  // Some domains never answer on the TV's Chromium 69: give every call a deadline.
  const send = (method, params, ms) => new Promise((resolve) => {
    const mid = ++id;
    const timer = setTimeout(() => { pending.delete(mid); resolve({ error: { message: method + ' timed out' } }); }, ms || 8000);
    pending.set(mid, (msg) => { clearTimeout(timer); resolve(msg); });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });

  await send('Runtime.enable');
  await send('Log.enable');

  const evalFile = opt('eval-file', null);
  const evalExpr = evalFile ? fs.readFileSync(evalFile, 'utf8') : opt('eval', null);
  if (evalExpr) {
    const r = await send('Runtime.evaluate', { expression: evalExpr, returnByValue: true, awaitPromise: args.includes('--await') },
      Number(opt('timeout', 20000)));
    const res = r.result && r.result.result;
    const out = opt('out', null);
    if (out && res && res.value !== undefined) {
      fs.writeFileSync(out, JSON.stringify(res.value));
      console.log('saved: ' + out);
    } else {
      console.log(res && res.value !== undefined ? JSON.stringify(res.value, null, 2) : JSON.stringify(r.result || r.error));
      if (out) process.exitCode = 1;
    }
  }

  const keys = opt('keys', '');
  for (const k of keys ? keys.split(',') : []) {
    if (/^wait\d+$/.test(k)) { await sleep(Number(k.slice(4))); continue; }
    const code = KEYCODES[k] || Number(k);
    for (const type of ['rawKeyDown', 'keyUp']) {
      await send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, key: k });
    }
    await sleep(Number(opt('keydelay', 450)));
  }

  const watch = Number(opt('watch', 0));
  if (watch) await sleep(watch * 1000);

  const shot = opt('shot', null);
  if (shot) {
    await sleep(Number(opt('settle', 900)));
    const r = await send('Page.captureScreenshot', { format: 'png' }, 30000);
    if (r.result && r.result.data) {
      fs.writeFileSync(shot, Buffer.from(r.result.data, 'base64'));
      console.log('screenshot: ' + shot);
    } else {
      console.log('screenshot failed: ' + JSON.stringify(r.error || r));
    }
  }
  ws.close();
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error(e); process.exit(1); });
