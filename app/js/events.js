/*
 * Ngày lễ, Tết, Rằm, Mùng 1 và sinh nhật sắp tới — cho dải sự kiện ở màn hình chính.
 * Chạy được trên TV (window.Events, cần window.Lunar) và trong Node để test.
 */
(function (root, factory) {
  var lunar = typeof module === 'object' && module.exports ? require('./lunar.js') : root.Lunar;
  var mod = factory(lunar);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.Events = mod;
})(this, function (Lunar) {
  'use strict';

  // [ngày, tháng, tên, mức ưu tiên] — ưu tiên cao hơn thắng khi hai sự kiện trùng ngày.
  var SOLAR = [
    [1, 1, 'Tết Dương lịch', 2],
    [3, 2, 'Thành lập Đảng', 1],
    [14, 2, 'Lễ Tình nhân', 2],
    [27, 2, 'Thầy thuốc Việt Nam', 1],
    [8, 3, 'Quốc tế Phụ nữ', 2],
    [26, 3, 'Thành lập Đoàn', 1],
    [1, 4, 'Cá tháng Tư', 1],
    [30, 4, 'Ngày Thống nhất', 2],
    [1, 5, 'Quốc tế Lao động', 2],
    [19, 5, 'Sinh nhật Bác Hồ', 1],
    [1, 6, 'Quốc tế Thiếu nhi', 2],
    [28, 6, 'Ngày Gia đình Việt Nam', 3],
    [27, 7, 'Thương binh Liệt sĩ', 1],
    [19, 8, 'Cách mạng Tháng Tám', 1],
    [2, 9, 'Quốc khánh', 2],
    [13, 10, 'Doanh nhân Việt Nam', 1],
    [20, 10, 'Phụ nữ Việt Nam', 2],
    [31, 10, 'Halloween', 1],
    [20, 11, 'Nhà giáo Việt Nam', 2],
    [22, 12, 'Quân đội Nhân dân', 1],
    [24, 12, 'Đêm Giáng sinh', 2],
    [25, 12, 'Giáng sinh', 1]
  ];

  // [tháng, thứ (0 = Chủ Nhật), lần thứ mấy trong tháng, tên, ưu tiên]
  var NTH_WEEKDAY = [
    [5, 0, 2, 'Ngày của Mẹ', 2],
    [6, 0, 3, 'Ngày của Cha', 2]
  ];

  var LUNAR = [
    [1, 1, 'Tết Nguyên Đán', 4],
    [2, 1, 'Mùng 2 Tết', 3],
    [3, 1, 'Mùng 3 Tết', 3],
    [15, 1, 'Rằm tháng Giêng', 3],
    [3, 3, 'Tết Hàn thực', 2],
    [10, 3, 'Giỗ Tổ Hùng Vương', 3],
    [15, 4, 'Lễ Phật Đản', 2],
    [5, 5, 'Tết Đoan Ngọ', 2],
    [7, 7, 'Lễ Thất tịch', 1],
    [15, 7, 'Lễ Vu Lan', 3],
    [15, 8, 'Tết Trung Thu', 3],
    [9, 9, 'Tết Trùng Cửu', 1],
    [10, 10, 'Tết Hạ nguyên', 1],
    [23, 12, 'Ông Công Ông Táo', 3]
  ];

  /** Day of the month of the nth `weekday` (0 = Sunday) in month m of year y. */
  function nthWeekday(y, m, weekday, n) {
    var first = new Date(y, m - 1, 1).getDay();
    return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  }

  function jdOf(dmy) { return Lunar.jdFromDate(dmy[0], dmy[1], dmy[2]); }

  /**
   * Upcoming events from `date` (a JS Date, local time) within `opts.horizon` days (default 400),
   * soonest first. `opts.birthdays`: [{name, day, month, lunar}] from config.js.
   * Each event: {title, days, jd, solar: [d, m, y], lunar: {day, month, ...}, kind}.
   */
  function upcoming(date, opts) {
    opts = opts || {};
    var horizon = opts.horizon || 400;
    var d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
    var today = Lunar.jdFromDate(d, m, y);
    var lt = Lunar.fromSolar(d, m, y);
    var byJd = {};

    function add(title, jd, kind, priority) {
      var days = jd - today;
      if (days < 0 || days > horizon) return;
      var prev = byJd[jd];
      if (prev && prev.priority >= priority) return;
      var solar = Lunar.jdToDate(jd);
      byJd[jd] = {
        title: title, days: days, jd: jd, kind: kind, priority: priority,
        solar: solar, lunar: Lunar.fromSolar(solar[0], solar[1], solar[2])
      };
    }

    [y, y + 1].forEach(function (yy) {
      SOLAR.forEach(function (e) { add(e[2], Lunar.jdFromDate(e[0], e[1], yy), 'solar', e[3]); });
      NTH_WEEKDAY.forEach(function (e) {
        add(e[3], Lunar.jdFromDate(nthWeekday(yy, e[0], e[1], e[2]), e[0], yy), 'solar', e[4]);
      });
    });

    [lt.year, lt.year + 1].forEach(function (ly) {
      LUNAR.forEach(function (e) {
        var s = Lunar.toSolar(e[0], e[1], ly, false);
        if (s) add(e[2], jdOf(s), 'lunar', e[3]);
      });
      // Giao thừa: the last day of the lunar year, the eve of next year's Tết.
      var tet = Lunar.toSolar(1, 1, ly + 1, false);
      if (tet) add('Giao thừa', jdOf(tet) - 1, 'lunar', 4);
    });

    // The next Mùng 1 and Rằm, whatever month they fall in.
    var len = Lunar.monthLength(lt);
    var monthStart = today - lt.day + 1;
    var nextFirst = lt.day === 1 ? today : monthStart + len;
    add('Mùng 1 tháng ' + monthLabel(nextFirst), nextFirst, 'moon', 0);
    var fullMoon = lt.day <= 15 ? monthStart + 14 : monthStart + len + 14;
    add('Rằm tháng ' + monthLabel(fullMoon), fullMoon, 'moon', 0);

    (opts.birthdays || []).forEach(function (b) {
      if (!b || !b.day || !b.month) return;
      var title = 'Sinh nhật ' + b.name;
      if (b.lunar) {
        [lt.year, lt.year + 1].forEach(function (ly) {
          var s = Lunar.toSolar(b.day, b.month, ly, false);
          if (s) add(title, jdOf(s), 'birthday', 5);
        });
      } else {
        [y, y + 1].forEach(function (yy) { add(title, Lunar.jdFromDate(b.day, b.month, yy), 'birthday', 5); });
      }
    });

    return Object.keys(byJd).map(function (k) { return byJd[k]; })
      .sort(function (a, b) { return a.jd - b.jd; });
  }

  function monthLabel(jd) {
    var s = Lunar.jdToDate(jd);
    var l = Lunar.fromSolar(s[0], s[1], s[2]);
    return Lunar.MONTH_NAMES[l.month - 1] + (l.leap ? ' nhuận' : '');
  }

  function countdown(days) {
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Ngày mai';
    return 'Còn ' + days + ' ngày';
  }

  /**
   * The three days worth a glance, soonest first: the next Rằm or Mùng 1, the next holiday or birthday
   * other than Tết, and Tết itself (or the holiday after that one when Tết is out of range).
   */
  function pick(events) {
    var moon = events.filter(function (e) { return e.kind === 'moon'; })[0];
    var notable = events.filter(function (e) { return e.kind !== 'moon' && e.priority >= 1; });
    var tet = notable.filter(function (e) { return e.title === 'Tết Nguyên Đán'; })[0];
    var others = notable.filter(function (e) { return e !== tet; });
    var out = [moon, others[0], tet || others[1]].filter(Boolean);
    return out.sort(function (a, b) { return a.jd - b.jd; });
  }

  return { upcoming: upcoming, countdown: countdown, nthWeekday: nthWeekday, pick: pick };
});
