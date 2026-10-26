/*
 * Giao diện hai thứ tiếng: tiếng Việt (gốc) và tiếng Anh.
 *
 * Chuỗi trong code viết thẳng bằng tiếng Việt và bọc trong T(). Khi giao diện là tiếng Anh, T() tra bảng EN ở
 * app/js/i18n-en.js; câu nào chưa có thì giữ tiếng Việt (tests/i18n.test.js báo những câu còn thiếu). Chỗ điền số
 * hay tên viết {0}, {1}… Chữ trong index.html: phần tử có thuộc tính data-t, khóa là nội dung HTML của nó.
 *
 * Ngôn ngữ chọn ở Cài đặt → Ngôn ngữ (nhaminh.settings.language): 'auto' theo ngôn ngữ menu của TV, 'vi' hoặc 'en'.
 * Đổi ngôn ngữ thì app tải lại, nên mọi module đọc I18n.lang một lần lúc chạy là đủ.
 *
 *   T(text, a, b…)        text in the UI language, {0} {1}… filled in
 *   I18n.lang / I18n.en   'vi' | 'en' / true when English
 *   I18n.apply(root)      translate the data-t elements under root
 *   I18n.weekday(d)  I18n.dow(i)  I18n.dateLine(d)  I18n.dayMonth(d)  I18n.monthYear(m, y)  I18n.lunarShort(l)
 *   I18n.num(v, decimals) numbers the local way: 141,7 · 25.670 (vi) or 141.7 · 25,670 (en)
 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.I18n = mod; root.T = mod.T; }
})(this, function (root) {
  'use strict';

  /** 'vi' or 'en' from the setting ('auto' | 'vi' | 'en') and the TV's language (navigator.language). */
  function resolve(setting, nav) {
    if (setting === 'vi' || setting === 'en') return setting;
    return /^vi/i.test(nav || '') ? 'vi' : 'en';
  }

  var setting = 'auto';
  try {
    var s = JSON.parse(root.localStorage.getItem('nhaminh.settings') || '{}') || {};
    var d = (root.CONFIG && root.CONFIG.defaults) || {};
    setting = s.language || d.language || 'auto';
  } catch (e) { /* Node, or no storage */ }
  var lang = resolve(setting, root.navigator && root.navigator.language);
  var EN = root.I18N_EN || {};

  function fill(text, args) {
    return args.length ? text.replace(/\{(\d)\}/g, function (m, i) { return args[i] === undefined ? m : args[i]; }) : text;
  }

  function T(text) {
    var args = Array.prototype.slice.call(arguments, 1);
    return fill(lang === 'en' && EN[text] !== undefined ? EN[text] : text, args);
  }

  function apply(el) {
    if (lang === 'vi' || !el || !el.querySelectorAll) return;
    var list = el.querySelectorAll('[data-t]');
    for (var i = 0; i < list.length; i++) {
      var key = list[i].innerHTML.replace(/\s+/g, ' ').trim();
      if (EN[key] !== undefined) list[i].innerHTML = EN[key];
    }
  }

  var DAYS = { vi: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
  var DOW = { vi: ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December'];

  function weekday(d) { return DAYS[lang][d.getDay()]; }
  function dow(i) { return DOW[lang][i]; }
  function dayMonth(d) { return lang === 'en' ? MONTHS[d.getMonth()] + ' ' + d.getDate() : d.getDate() + ' tháng ' + (d.getMonth() + 1); }
  function dateLine(d) { return weekday(d) + (lang === 'en' ? ', ' : '  ') + dayMonth(d); }
  function monthYear(m, y) { return lang === 'en' ? MONTHS[m - 1] + ' ' + y : 'Tháng ' + m + ' · ' + y; }
  function monthName(m) { return MONTHS[m - 1]; }

  /** A lunar date in a few words: "Mùng 6 tháng Chín" (needs Lunar), or "lunar 6/9" in English. */
  function lunarShort(l) {
    if (lang === 'en') return 'lunar ' + l.day + '/' + l.month + (l.leap ? ' (leap month)' : '');
    return root.Lunar ? root.Lunar.format(l) : l.day + '/' + l.month;
  }

  // The Vietnamese zodiac has the buffalo and the cat where the Chinese one has the ox and the rabbit.
  var ANIMALS = ['Rat', 'Buffalo', 'Tiger', 'Cat', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
  /** "Bính Ngọ" in Vietnamese, "the Horse (Bính Ngọ)" in English. */
  function yearName(lunarYear) {
    var name = root.Lunar ? root.Lunar.yearName(lunarYear) : '';
    return lang === 'en' ? 'the ' + ANIMALS[(lunarYear + 8) % 12] + (name ? ' (' + name + ')' : '') : name;
  }

  function num(v, decimals) {
    var parts = v.toFixed(decimals || 0).split('.');
    var thousands = lang === 'en' ? ',' : '.', point = lang === 'en' ? '.' : ',';
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (parts[1] ? point + parts[1] : '');
  }

  if (root.document && root.document.documentElement) root.document.documentElement.lang = lang;

  return { T: T, lang: lang, en: lang === 'en', setting: setting, resolve: resolve, apply: apply, weekday: weekday, dow: dow,
    dayMonth: dayMonth, dateLine: dateLine, monthYear: monthYear, monthName: monthName, lunarShort: lunarShort,
    yearName: yearName, num: num, ANIMALS: ANIMALS };
});
