'use strict';
// Sample payloads captured from the live sources on 26/10/2026.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Markets } = require('../app/js/markets.js');

const PNJ = { chinhanh: 'hochiminh', updateDate: '26/10/2026 13:11:17', data: [
  { masp: 'SJC', tensp: 'Vàng miếng SJC 999.9', giaban: 14170, giamua: 13870 },
  { masp: 'N24K', tensp: 'Nhẫn Trơn PNJ 999.9', giaban: 14060, giamua: 13760 },
  { masp: '24K', tensp: 'Vàng nữ trang 999.9', giaban: 13800, giamua: 13350 }] };

const VCB = '<ExrateList><DateTime>10/26/2026 3:13:49 PM</DateTime>' +
  '<Exrate CurrencyCode="EUR" CurrencyName="EURO" Buy="28,256.66" Transfer="28,542.08" Sell="29,804.83" />' +
  '<Exrate CurrencyCode="USD" CurrencyName="US DOLLAR           " Buy="25,640.00" Transfer="25,670.00" Sell="26,050.00" />' +
  '<Source>Joint Stock Commercial Bank for Foreign Trade of Vietnam - Vietcombank</Source></ExrateList>';

test('PNJ: SJC bars and plain rings, thousand đồng per chỉ → million per lượng', () => {
  const g = Markets.parsePnj(PNJ);
  assert.deepEqual(g.bar, { buy: 138.7, sell: 141.7 });
  assert.deepEqual(g.ring, { buy: 137.6, sell: 140.6 });
  assert.equal(g.updated, '13:11 26/10');
  assert.equal(Markets.parsePnj({ data: [] }), null);
  assert.equal(Markets.parsePnj(null), null);
});

test('Vietcombank XML: USD buy/transfer/sell, EUR, local time of the update', () => {
  const r = Markets.parseVcb(VCB);
  assert.deepEqual(r.usd, { cash: 25640, transfer: 25670, sell: 26050 });
  assert.equal(Math.round(r.eur), 28542);
  assert.equal(r.updated, '15:13 26/10');
  assert.equal(Markets.parseVcb('<html>blocked</html>'), null);
});

test('open.er-api fallback and the Hôm nay cards', () => {
  const e = Markets.parseEr({ result: 'success', rates: { VND: 25829.65, EUR: 0.905 } });
  assert.equal(Math.round(e.usd.transfer), 25830);
  const cards = Markets.cards({ gold: Markets.parsePnj(PNJ), usd: Markets.parseVcb(VCB) });
  assert.equal(cards[0].text, 'Vàng miếng SJC: mua 138,7 · bán 141,7 triệu/lượng');
  assert.equal(cards[1].text, '1 USD = 25.670 ₫ · bán 26.050 ₫');
  assert.match(cards[1].meta, /1 EUR = 28\.542 ₫/);
  assert.deepEqual(Markets.cards({ gold: null, usd: null }), []);
});
