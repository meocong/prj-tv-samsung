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

test('quotes: Wikiquote proverbs are cleaned, variants and links dropped', () => {
  const wikitext = [
    '{{Mục lục ngang}}',
    "'''Tục ngữ''' là những câu nói dân gian…",
    '== A ==',
    '* ăn quả nhớ kẻ trồng cây',
    '* Ai cũng/chả muốn phấn dồi mặt, chứ/chớ ai muốn phấn dồi gót chân',
    '*Nâng như nâng trứng(, hứng như hứng hoa)',
    '* Ăn cá bỏ lờ',
    '* [[Ca dao Việt Nam về tình yêu]]',
    '*:Ai ơi bưng bát cơm đầy,',
    '* Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao!',
    '* uống nước nhớ nguồn, ăn quả nhớ kẻ trồng cây'
  ].join('\n');
  assert.deepEqual(Quotes.parseProverbs(wikitext), [
    { text: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao!', by: 'Tục ngữ' },
    { text: 'Uống nước nhớ nguồn, ăn quả nhớ kẻ trồng cây.', by: 'Tục ngữ' }
  ]);
});

test('quotes: next() gives a different saying each time and covers the whole list', () => {
  const seen = new Set();
  for (let i = 0; i < Quotes.size(); i++) seen.add(Quotes.next().text);
  assert.equal(seen.size, Quotes.count);   // offline: the curated list, every one of them
  const a = Quotes.next(), b = Quotes.next();
  assert.notEqual(a.text, b.text);
});

test('photo library: one entry per photo across Bing markets, newest kept, no CJK captions', () => {
  const { Backdrop } = require('../app/js/backdrop.js');
  const p = (id, date, title) => ({ url: 'https://www.bing.com/th?id=OHR.' + id + '_1920x1080.jpg', date, title });
  const fresh = [p('Bridge_ROW1', '2026-10-21', 'Cầu Nguyễn Hoàng'), p('Bridge_EN-US2', '2026-10-21', 'Nguyen Hoang Bridge')];
  const old = [p('Sloth_ROW3', '2026-10-20', 'Sloth'), p('Momiji_JA-JP4', '2026-10-19', '蔦沼, 青森県')];
  const out = Backdrop.merge(fresh, old);
  assert.deepEqual(out.map((x) => x.title), ['Cầu Nguyễn Hoàng', 'Sloth', '']);
  const many = [];
  for (let i = 0; i < 150; i++) many.push(p('P' + i + '_ROW', '2026-' + String(1 + (i % 9)).padStart(2, '0') + '-' + String(1 + (i % 28)).padStart(2, '0'), 't'));
  const capped = Backdrop.merge(many, []);
  assert.equal(capped.length, 120);
  assert.ok(capped[0].date >= capped[119].date);
});
