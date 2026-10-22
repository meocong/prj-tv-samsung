/*
 * Âm lịch Việt Nam (múi giờ +7), theo thuật toán thiên văn của Hồ Ngọc Đức
 * (https://www.informatik.uni-leipzig.de/~duc/amlich/calrules.html): điểm sóc và trung khí từ
 * công thức của Jean Meeus, "Astronomical Algorithms".
 *
 * Chạy được trên TV (window.Lunar) và trong Node (require) để test.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.Lunar = mod;
})(this, function () {
  'use strict';

  var TZ = 7;
  var PI = Math.PI;
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var MONTH_NAMES = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'];

  function INT(d) { return Math.floor(d); }

  function jdFromDate(dd, mm, yy) {
    var a = INT((14 - mm) / 12);
    var y = yy + 4800 - a;
    var m = mm + 12 * a - 3;
    var jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }

  function jdToDate(jd) {
    var a, b, c;
    if (jd > 2299160) {
      a = jd + 32044;
      b = INT((4 * a + 3) / 146097);
      c = a - INT((b * 146097) / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    var d = INT((4 * c + 3) / 1461);
    var e = c - INT((1461 * d) / 4);
    var m = INT((5 * e + 2) / 153);
    var day = e - INT((153 * m + 2) / 5) + 1;
    var month = m + 3 - 12 * INT(m / 10);
    var year = b * 100 + d - 4800 + INT(m / 10);
    return [day, month, year];
  }

  /** Julian day of the k-th new moon after 1900-01-01 13:52 UT. */
  function newMoon(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    var jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    var deltat = T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return jd1 + C1 - deltat;
  }

  function newMoonDay(k) { return INT(newMoon(k) + 0.5 + TZ / 24); }

  /** Sun longitude in radians, 0..2π, at Julian day jdn. */
  function sunLongitude(jdn) {
    var T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
    var M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    var L = (L0 + DL) * dr;
    return L - PI * 2 * INT(L / (PI * 2));
  }

  /** Which of the 12 major solar terms (0..11) the local day falls in. */
  function sunSector(dayNumber) { return INT(sunLongitude(dayNumber - 0.5 - TZ / 24) / PI * 6); }

  /** Day number of the start of lunar month 11 (the one containing the winter solstice) of year yy. */
  function lunarMonth11(yy) {
    var off = jdFromDate(31, 12, yy) - 2415021;
    var k = INT(off / 29.530588853);
    var nm = newMoonDay(k);
    if (sunSector(nm) >= 9) nm = newMoonDay(k - 1);
    return nm;
  }

  /** Offset (in months after month 11) of the leap month in a 13-month year starting at a11. */
  function leapMonthOffset(a11) {
    var k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    var last, i = 1;
    var arc = sunSector(newMoonDay(k + i));
    do {
      last = arc;
      i++;
      arc = sunSector(newMoonDay(k + i));
    } while (arc !== last && i < 14);
    return i - 1;
  }

  /** {day, month, year, leap, jd} for a solar date. */
  function fromSolar(dd, mm, yy) {
    var dayNumber = jdFromDate(dd, mm, yy);
    var k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = newMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = newMoonDay(k);
    var a11 = lunarMonth11(yy);
    var b11 = a11;
    var lunarYear;
    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = lunarMonth11(yy - 1);
    } else {
      lunarYear = yy + 1;
      b11 = lunarMonth11(yy + 1);
    }
    var lunarDay = dayNumber - monthStart + 1;
    var diff = INT((monthStart - a11) / 29);
    var leap = false;
    var lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      var leapDiff = leapMonthOffset(a11);
      if (diff >= leapDiff) {
        lunarMonth = diff + 10;
        if (diff === leapDiff) leap = true;
      }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: leap, jd: dayNumber };
  }

  /** [day, month, year] solar for a lunar date, or null when that leap month does not exist. */
  function toSolar(lDay, lMonth, lYear, lLeap) {
    var a11, b11;
    if (lMonth < 11) {
      a11 = lunarMonth11(lYear - 1);
      b11 = lunarMonth11(lYear);
    } else {
      a11 = lunarMonth11(lYear);
      b11 = lunarMonth11(lYear + 1);
    }
    var k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    var off = lMonth - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      var leapOff = leapMonthOffset(a11);
      var leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;
      if (lLeap && lMonth !== leapMonth) return null;
      if (lLeap || off >= leapOff) off += 1;
    } else if (lLeap) {
      return null;
    }
    return jdToDate(newMoonDay(k + off) + lDay - 1);
  }

  function yearName(lunarYear) { return CAN[(lunarYear + 6) % 10] + ' ' + CHI[(lunarYear + 8) % 12]; }
  function dayName(jd) { return CAN[(jd + 9) % 10] + ' ' + CHI[(jd + 1) % 12]; }
  function monthName(month, lunarYear) {
    return CAN[(lunarYear * 12 + month + 3) % 10] + ' ' + CHI[(month + 1) % 12];
  }

  /** "Mùng 2" for days 1–10, "Rằm" for 15, otherwise the number. */
  function dayLabel(day) {
    if (day === 15) return 'Rằm';
    return day <= 10 ? 'Mùng ' + day : String(day);
  }

  /** "Mùng 2 tháng Chín", "Rằm tháng Giêng", "12 tháng Sáu nhuận". */
  function format(l) {
    return dayLabel(l.day) + ' tháng ' + MONTH_NAMES[l.month - 1] + (l.leap ? ' nhuận' : '');
  }

  /** Number of days in the lunar month containing l (29 or 30). */
  function monthLength(l) {
    var next = fromSolar.apply(null, jdToDate(l.jd - l.day + 30));
    return next.day === 1 ? 29 : 30;
  }

  // ---- lịch vạn niên: tiết khí, giờ hoàng đạo, ngày hoàng đạo / hắc đạo --------------------

  var TIET_KHI = ['Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng', 'Hạ chí', 'Tiểu thử',
    'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ', 'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết',
    'Đại tuyết', 'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập'];

  /** The solar term (one of 24, every 15° of the sun's longitude) a local day falls in. */
  function solarTerm(jd) { return TIET_KHI[INT(sunLongitude(jd - 0.5 - TZ / 24) / PI * 12)]; }

  // Auspicious double-hours by the day's earthly branch (Tý..Hợi), as in Hồ Ngọc Đức's amlich.
  var GIO_HD = ['110100101100', '001101001011', '110011010010', '101100110100', '001011001101', '010010110011'];
  var HOURS = ['23–1', '1–3', '3–5', '5–7', '7–9', '9–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23'];

  /** [{name: 'Tý', hours: '23–1'}, …] — the six hoàng đạo hours of the day. */
  function luckyHours(jd) {
    var pattern = GIO_HD[((jd + 1) % 12) % 6], out = [];
    for (var i = 0; i < 12; i++) { if (pattern[i] === '1') out.push({ name: CHI[i], hours: HOURS[i] }); }
    return out;
  }

  // The twelve day spirits; Thanh Long falls on a Tý day in months 1 and 7, Dần in 2 and 8, and so on.
  var STARS = [['Thanh Long', true], ['Minh Đường', true], ['Thiên Hình', false], ['Chu Tước', false],
    ['Kim Quỹ', true], ['Thiên Đức', true], ['Bạch Hổ', false], ['Ngọc Đường', true], ['Thiên Lao', false],
    ['Huyền Vũ', false], ['Tư Mệnh', true], ['Câu Trận', false]];

  /** {name, good} — hoàng đạo (good) or hắc đạo for a lunar date l (from fromSolar). */
  function dayStar(l) {
    var start = ((l.month - 1) % 6) * 2;
    var s = STARS[((l.jd + 1) % 12 - start + 12) % 12];
    return { name: s[0], good: s[1] };
  }

  function canChiDay(jd) { return { can: CAN[(jd + 9) % 10], chi: CHI[(jd + 1) % 12] }; }

  return {
    solarTerm: solarTerm,
    luckyHours: luckyHours,
    dayStar: dayStar,
    canChiDay: canChiDay,
    fromSolar: fromSolar,
    toSolar: toSolar,
    jdFromDate: jdFromDate,
    jdToDate: jdToDate,
    yearName: yearName,
    dayName: dayName,
    monthName: monthName,
    dayLabel: dayLabel,
    format: format,
    monthLength: monthLength,
    MONTH_NAMES: MONTH_NAMES
  };
});
