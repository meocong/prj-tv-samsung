'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Lunar = require('../app/js/lunar.js');
const Events = require('../app/js/events.js');

test('Tết Nguyên Đán falls on the known solar dates', () => {
  const tet = { 2023: [22, 1, 2023], 2024: [10, 2, 2024], 2025: [29, 1, 2025], 2026: [17, 2, 2026], 2027: [6, 2, 2027] };
  for (const [year, solar] of Object.entries(tet)) {
    assert.deepEqual(Lunar.toSolar(1, 1, Number(year), false), solar, `Tết ${year}`);
    const l = Lunar.fromSolar(...solar);
    assert.equal(l.day, 1);
    assert.equal(l.month, 1);
    assert.equal(l.year, Number(year));
  }
});

test('leap months: 2023 has a leap 2nd month, 2025 a leap 6th month', () => {
  assert.ok(Lunar.toSolar(1, 2, 2023, true), 'tháng 2 nhuận 2023 exists');
  assert.equal(Lunar.toSolar(1, 3, 2023, true), null, 'no tháng 3 nhuận in 2023');
  const leap6 = Lunar.toSolar(1, 6, 2025, true);
  assert.deepEqual(leap6, [25, 7, 2025]);
  assert.equal(Lunar.fromSolar(25, 7, 2025).leap, true);
  assert.equal(Lunar.toSolar(1, 6, 2026, true), null, '2026 has no leap month 6');
});

test('round trip solar → lunar → solar over 1100 consecutive days', () => {
  const start = Lunar.jdFromDate(1, 1, 2024);
  for (let jd = start; jd < start + 1100; jd++) {
    const s = Lunar.jdToDate(jd);
    const l = Lunar.fromSolar(...s);
    assert.deepEqual(Lunar.toSolar(l.day, l.month, l.year, l.leap), s);
  }
});

test('names and formatting', () => {
  assert.equal(Lunar.yearName(2026), 'Bính Ngọ');
  assert.equal(Lunar.yearName(2027), 'Đinh Mùi');
  assert.equal(Lunar.yearName(2024), 'Giáp Thìn');
  const jd = Lunar.jdFromDate(10, 2, 2024);
  assert.equal(Lunar.dayName(jd), 'Giáp Thìn');   // Tết Giáp Thìn 2024 fell on a Giáp Thìn day
  assert.equal(Lunar.format({ day: 15, month: 1, leap: false }), 'Rằm tháng Giêng');
  assert.equal(Lunar.format({ day: 2, month: 9, leap: false }), 'Mùng 2 tháng Chín');
  assert.equal(Lunar.format({ day: 12, month: 6, leap: true }), '12 tháng Sáu nhuận');
});

test('lunar month lengths are 29 or 30 and sum to the year length', () => {
  let jd = Lunar.jdFromDate(17, 2, 2026);   // Tết Bính Ngọ
  const tet2027 = Lunar.jdFromDate(6, 2, 2027);
  let months = 0;
  while (jd < tet2027) {
    const l = Lunar.fromSolar(...Lunar.jdToDate(jd));
    assert.equal(l.day, 1);
    const len = Lunar.monthLength(l);
    assert.ok(len === 29 || len === 30);
    jd += len;
    months++;
  }
  assert.equal(jd, tet2027);
  assert.equal(months, 12);
});

test('upcoming events from 22/10/2026', () => {
  const ev = Events.upcoming(new Date(2026, 9, 22), {
    birthdays: [{ name: 'Bà', day: 10, month: 11, lunar: false }, { name: 'Ông', day: 15, month: 1, lunar: true }]
  });
  const titles = ev.map((e) => e.title);
  assert.ok(ev.length > 10);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].days >= ev[i - 1].days, 'sorted');
  assert.ok(titles.includes('Tết Nguyên Đán'));
  assert.ok(titles.includes('Giao thừa'));
  assert.ok(titles.includes('Sinh nhật Bà'));
  const tet = ev.find((e) => e.title === 'Tết Nguyên Đán');
  assert.deepEqual(tet.solar, [6, 2, 2027]);
  assert.equal(tet.days, Lunar.jdFromDate(6, 2, 2027) - Lunar.jdFromDate(22, 10, 2026));
  const eve = ev.find((e) => e.title === 'Giao thừa');
  assert.deepEqual(eve.solar, [5, 2, 2027]);
  // A lunar birthday on Rằm tháng Giêng beats the holiday on the same day.
  const r = ev.filter((e) => e.jd === Lunar.jdFromDate(...Lunar.toSolar(15, 1, 2027, false)));
  assert.equal(r.length, 1);
  assert.equal(r[0].title, 'Sinh nhật Ông');
  // The next Rằm and Mùng 1 are both within ~30 days.
  assert.ok(ev.some((e) => e.kind === 'moon' && e.title.indexOf('Rằm') === 0 && e.days <= 30));
  assert.ok(ev.some((e) => e.kind === 'moon' && e.title.indexOf('Mùng 1') === 0 && e.days <= 30));
});

test('Mother and Father days fall on the right Sundays', () => {
  assert.equal(Events.nthWeekday(2026, 5, 0, 2), 10);   // 10/5/2026
  assert.equal(Events.nthWeekday(2026, 6, 0, 3), 21);   // 21/6/2026
  assert.equal(Events.nthWeekday(2027, 5, 0, 2), 9);
  const ev = Events.upcoming(new Date(2026, 4, 1), { horizon: 60 });
  const mom = ev.find((e) => e.title === 'Ngày của Mẹ');
  assert.deepEqual(mom.solar, [10, 5, 2026]);
  assert.ok(ev.find((e) => e.title === 'Ngày Gia đình Việt Nam'));
});

test('a year holds many events, at least two a month on average', () => {
  const ev = Events.upcoming(new Date(2026, 0, 1), { horizon: 365 });
  assert.ok(ev.filter((e) => e.kind !== 'moon').length >= 34, 'holidays: ' + ev.length);
});

test('lịch vạn niên: giờ hoàng đạo follow the day branch', () => {
  // 22/10/2026 is a Kỷ Tỵ day: Tỵ days are lucky in Sửu, Thìn, Ngọ, Mùi, Tuất, Hợi.
  const jd = Lunar.jdFromDate(22, 10, 2026);
  assert.equal(Lunar.dayName(jd), 'Kỷ Tỵ');
  assert.deepEqual(Lunar.luckyHours(jd).map((h) => h.name), ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi']);
  // a Tý day: Tý, Sửu, Mão, Ngọ, Thân, Dậu
  let tyDay = jd;
  while (Lunar.canChiDay(tyDay).chi !== 'Tý') tyDay++;
  assert.deepEqual(Lunar.luckyHours(tyDay).map((h) => h.name), ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu']);
  assert.equal(Lunar.luckyHours(tyDay)[0].hours, '23–1');
});

test('lịch vạn niên: solar terms', () => {
  assert.equal(Lunar.solarTerm(Lunar.jdFromDate(1, 11, 2026)), 'Sương giáng');
  assert.equal(Lunar.solarTerm(Lunar.jdFromDate(10, 11, 2026)), 'Lập đông');
  assert.equal(Lunar.solarTerm(Lunar.jdFromDate(25, 12, 2026)), 'Đông chí');
  assert.equal(Lunar.solarTerm(Lunar.jdFromDate(10, 2, 2027)), 'Lập xuân');
  assert.equal(Lunar.solarTerm(Lunar.jdFromDate(25, 6, 2026)), 'Hạ chí');
});

test('lịch vạn niên: Thanh Long starts the day spirits on the right branch', () => {
  // In lunar month 1 (and 7) Thanh Long is a Tý day; in month 9 it is a Thìn day.
  const l = (d, m, y) => Lunar.fromSolar(d, m, y);
  for (let jd = Lunar.jdFromDate(17, 2, 2026); jd < Lunar.jdFromDate(17, 3, 2026); jd++) {
    const s = Lunar.jdToDate(jd), day = l(...s);
    if (day.month === 1 && Lunar.canChiDay(jd).chi === 'Tý') assert.equal(Lunar.dayStar(day).name, 'Thanh Long');
    if (day.month === 1 && Lunar.canChiDay(jd).chi === 'Ngọ') assert.equal(Lunar.dayStar(day).name, 'Bạch Hổ');
  }
  const oct22 = l(22, 10, 2026);   // month 9, a Tỵ day: one after Thìn → Minh Đường, hoàng đạo
  assert.equal(oct22.month, 9);
  assert.deepEqual(Lunar.dayStar(oct22), { name: 'Minh Đường', good: true });
});

test('pick: Rằm/Mùng 1, the next holiday and Tết — the same list everywhere', () => {
  const ev = Events.upcoming(new Date(2026, 9, 22));
  const p = Events.pick(ev);
  assert.equal(p.length, 3);
  assert.deepEqual(p.map((e) => e.title), ['Rằm tháng Chín', 'Halloween', 'Tết Nguyên Đán']);
  for (let i = 1; i < p.length; i++) assert.ok(p[i].jd > p[i - 1].jd);
  // Mid-January: Tết is the next holiday, so the one after it fills the second slot.
  const jan = Events.pick(Events.upcoming(new Date(2027, 0, 25)));
  assert.ok(jan.some((e) => e.title === 'Tết Nguyên Đán'));
  assert.equal(new Set(jan.map((e) => e.title)).size, jan.length);
});

test('countdown labels', () => {
  assert.equal(Events.countdown(0), 'Hôm nay');
  assert.equal(Events.countdown(1), 'Ngày mai');
  assert.equal(Events.countdown(12), 'Còn 12 ngày');
});
