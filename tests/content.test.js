'use strict';
// Offline content: câu nói hay, ngày này năm xưa (wikitext parsing), tin RSS and the YouTube row helpers.
const test = require('node:test');
const assert = require('node:assert/strict');

const { Quotes } = require('../app/js/quotes.js');
const { History } = require('../app/js/history.js');

test('quotes: one per day, different tomorrow, every entry complete', () => {
  assert.ok(Quotes.count >= 120);
  const a = Quotes.today(new Date(2026, 9, 22, 8));
  assert.deepEqual(Quotes.today(new Date(2026, 9, 22, 23)), a);
  assert.notDeepEqual(Quotes.today(new Date(2026, 9, 23, 8)), a);
  const seen = new Set();
  for (let i = 0; i < Quotes.count; i++) {
    const q = Quotes.at(i);
    assert.ok(q.text.length > 8 && q.by.length > 1, 'quote ' + i);
    assert.ok(!seen.has(q.text), 'duplicate quote: ' + q.text);
    seen.add(q.text);
  }
});

test('history: wikitext sections become clean items, grim ones left out', () => {
  const wikitext = [
    '== Sự kiện ==',
    '* [[1962]] – [[Khủng hoảng tên lửa Cuba]]: Tổng thống [[John F. Kennedy|Kennedy]] thông báo phong tỏa Cuba.<ref>Nguồn</ref>',
    '* [[2001]] – Một vụ đánh bom làm nhiều người thiệt mạng.',
    '* [[1975]] – Ngắn.',
    '== Sinh ==',
    "* [[1811]] – '''[[Franz Liszt]]''', nhà soạn nhạc người Hungary {{mất|1886}}",
    '== Mất ==',
    '* [[1906]] – [[Paul Cézanne]], họa sĩ người Pháp (sinh 1839)',
    '== Tham khảo ==',
    '* [[1999]] – Không phải mục cần đọc ở đây đâu.'
  ].join('\n');
  const items = History.parse(wikitext);
  assert.deepEqual(items.map((i) => [i.year, i.kind]), [[1962, 'event'], [1811, 'birth'], [1906, 'death']]);
  assert.equal(items[0].text, 'Khủng hoảng tên lửa Cuba: Tổng thống Kennedy thông báo phong tỏa Cuba.');
  assert.equal(items[1].text, 'Franz Liszt, nhà soạn nhạc người Hungary');
});

test('history: the family filter catches English and Vietnamese wording', () => {
  ['Two shootings in Texas', 'A bomb attack', 'Vụ xả súng', 'Máy bay gặp tai nạn'].forEach((t) => assert.ok(History.GRIM.test(t), t));
  ['Apollo 11 lands on the Moon', 'Khánh thành cầu Long Biên'].forEach((t) => assert.ok(!History.GRIM.test(t), t));
});
