'use strict';
// Every Vietnamese string the screen can show has an English version, with the same {0} {1}… placeholders.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP = path.join(__dirname, '..', 'app');
global.window = global;
require('../app/js/i18n-en.js');
const EN = global.I18N_EN;
const I18n = require('../app/js/i18n.js');
require('../app/js/apps.js');
const Events = require('../app/js/events.js');

/** T('…') literals in app/js and the data-t text of index.html. */
function keysInCode() {
  const keys = new Set();
  for (const f of fs.readdirSync(path.join(APP, 'js'))) {
    if (!f.endsWith('.js') || f.startsWith('i18n')) continue;
    const src = fs.readFileSync(path.join(APP, 'js', f), 'utf8');
    for (const m of src.matchAll(/\bT\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
  }
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<(\w+)[^>]*\sdata-t[^>]*>([\s\S]*?)<\/\1>/g)) keys.add(m[2].replace(/\s+/g, ' ').trim());
  return keys;
}

function placeholders(s) { return (s.match(/\{\d\}/g) || []).sort().join(''); }

test('i18n: every T() string and data-t text has an English version', () => {
  const missing = [...keysInCode()].filter((k) => EN[k] === undefined);
  assert.deepEqual(missing, []);
});

test('i18n: strings that reach T() from data — weather, holidays, app descriptions, authors, the default name', () => {
  const weather = fs.readFileSync(path.join(APP, 'js', 'weather.js'), 'utf8');
  const fromWeather = [...weather.matchAll(/\d+: \['([^']+)', '[a-z]+'\]/g), ...weather.matchAll(/\[\d+, '([^']+)', '#[0-9a-f]+', '([^']+)'\]/g)]
    .flatMap((m) => m.slice(1));
  assert.ok(fromWeather.length > 30);
  const apps = window.TV_APPS.map((a) => a.desc).filter(Boolean);
  const authors = ['Ca dao', 'Tục ngữ', 'Khuyết danh', 'Khẩu hiệu học đường', 'Lão Tử', 'Khổng Tử', 'Đạt Lai Lạt Ma', 'Đức Phật'];
  const missing = [...fromWeather, ...Events.NAMES, ...apps, ...authors, 'Nhà Mình ❤ Gia Đình'].filter((k) => EN[k] === undefined);
  assert.deepEqual(missing, []);
});

test('i18n: the English keeps the placeholders, and no key is written twice', () => {
  for (const [k, v] of Object.entries(EN)) assert.equal(placeholders(v), placeholders(k), k);
  const src = fs.readFileSync(path.join(APP, 'js', 'i18n-en.js'), 'utf8');
  const keys = [...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)].map((m) => m[1]);
  assert.deepEqual(keys.filter((k, i) => keys.indexOf(k) !== i), []);
});

test('i18n: the language follows the setting, else the TV', () => {
  assert.equal(I18n.resolve('auto', 'vi-VN'), 'vi');
  assert.equal(I18n.resolve('auto', 'en-US'), 'en');
  assert.equal(I18n.resolve('auto', 'ko-KR'), 'en');
  assert.equal(I18n.resolve('vi', 'en-US'), 'vi');
  assert.equal(I18n.resolve('en', 'vi-VN'), 'en');
});

test('i18n: the phone setup page has English for each of its strings', () => {
  const html = fs.readFileSync(path.join(APP, 'service', 'setup.html'), 'utf8');
  const dict = new Set([...html.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)].map((m) => m[1].replace(/\\'/g, "'")));
  const keys = new Set();
  for (const m of html.matchAll(/<(\w+)[^>]*\sdata-t[^>]*>([\s\S]*?)<\/\1>/g)) keys.add(m[2].replace(/\s+/g, ' ').trim().replace(/&amp;/g, '&'));
  for (const m of html.matchAll(/data-tp="([^"]+)"/g)) keys.add(m[1]);
  for (const m of html.matchAll(/\bL\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1]);
  assert.ok(keys.size > 30);
  assert.deepEqual([...keys].filter((k) => !dict.has(k)), []);
});
