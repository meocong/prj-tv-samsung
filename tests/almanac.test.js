'use strict';
// Reference values read from lichvannien.net for each date (fetched 22/10/2026).
const test = require('node:test');
const assert = require('node:assert/strict');
const Almanac = require('../app/js/almanac.js');

test('22/10/2026 — Kỷ Tỵ, 13/9 âm', () => {
  const a = Almanac.day(22, 10, 2026);
  assert.equal(a.truc.name, 'Nguy');
  assert.equal(a.truc.good, false);
  assert.equal(a.tu.name, 'Đẩu');
  assert.equal(a.tu.good, true);
  assert.equal(a.napAm, 'Đại Lâm Mộc');
  assert.equal(a.relation.name, 'nghĩa nhật');   // Chi sinh Can (Hỏa, Thổ), ngày cát
  assert.equal(a.xung.day, 'Hợi');                // xung ngày: Tân Hợi, Đinh Hợi
  assert.equal(a.xung.month, 'Thìn');             // xung tháng: Canh Thìn, Bính Thìn
  assert.deepEqual(a.huong, { hyThan: 'Đông Bắc', taiThan: 'Nam', hacThan: 'Nam' });
  assert.equal(a.lyThuanPhong[0].name, 'Lưu Niên');   // 23h–1h, 11h–13h
  assert.equal(a.lyThuanPhong[4].name, 'Đại An');     // 7h–9h, 19h–21h
  assert.ok(a.warnings.some((w) => w.indexOf('Tam nương') !== -1));
  assert.equal(a.monthChi, 'Tuất');
});

test('05/11/2026 — Quý Mùi, 27/9 âm', () => {
  const a = Almanac.day(5, 11, 2026);
  assert.equal(a.truc.name, 'Thu');
  assert.equal(a.tu.name, 'Tỉnh');
  assert.equal(a.napAm, 'Dương Liễu Mộc');
  assert.equal(a.relation.name, 'phạt nhật');   // Chi khắc Can (Thổ, Thủy), ngày hung
  assert.equal(a.relation.good, false);
  assert.equal(a.xung.day, 'Sửu');
  assert.deepEqual(a.huong, { hyThan: 'Đông Nam', taiThan: 'Tây Bắc', hacThan: 'Tây Bắc' });
  assert.equal(a.lyThuanPhong[0].name, 'Tiểu Cát');
  assert.equal(a.lyThuanPhong[2].name, 'Đại An');     // 3h–5h, 15h–17h
  assert.ok(a.warnings.some((w) => w.indexOf('Tam nương') !== -1));
});

test('06/02/2027 — Bính Thìn, mùng 1 Tết Đinh Mùi', () => {
  const a = Almanac.day(6, 2, 2027);
  assert.equal(a.truc.name, 'Mãn');
  assert.equal(a.tu.name, 'Đê');
  assert.equal(a.tu.good, false);
  assert.equal(a.napAm, 'Sa Trung Thổ');
  assert.equal(a.relation.name, 'bảo nhật');    // Can sinh Chi (Hỏa, Thổ), ngày cát
  assert.equal(a.xung.day, 'Tuất');
  assert.equal(a.xung.month, 'Thân');           // xung tháng: Canh Thân, Bính Thân, Bính Dần
  assert.deepEqual(a.huong, { hyThan: 'Tây Nam', taiThan: 'Đông', hacThan: 'Đông' });
  assert.equal(a.lyThuanPhong[0].name, 'Đại An');
  assert.equal(a.monthChi, 'Dần');
  assert.equal(a.warnings.length, 0);
});

test('Dương công kỵ and Nguyệt kỵ days are flagged', () => {
  const Lunar = require('../app/js/lunar.js');
  const s = Lunar.toSolar(13, 1, 2027, false);   // 13 tháng Giêng: Dương công kỵ và Tam nương
  const a = Almanac.day(s[0], s[1], s[2]);
  assert.ok(a.warnings.some((w) => w.indexOf('Dương công') !== -1));
  const s5 = Lunar.toSolar(5, 2, 2027, false);
  assert.ok(Almanac.day(s5[0], s5[1], s5[2]).warnings.some((w) => w.indexOf('Nguyệt kỵ') !== -1));
});

test('sexagenary cycle matches the day name', () => {
  const Lunar = require('../app/js/lunar.js');
  const jd = Lunar.jdFromDate(22, 10, 2026);
  assert.equal(Almanac.sexagenary(jd), 5);   // Kỷ Tỵ is the 6th pair (Giáp Tý = 0)
  assert.equal(Lunar.dayName(jd), 'Kỷ Tỵ');
});
