/*
 * Lịch vạn niên: một tháng dương lịch với ngày âm từng ô, và chi tiết ngày đang chọn — can chi, ngày hoàng
 * đạo / hắc đạo, tiết khí, giờ hoàng đạo, ngày lễ. Mở từ nút "Lịch" trên màn hình chính.
 *
 *   Calendar.open(onClose)   Calendar.key(action) -> true khi đã xử lý
 *
 * Phím: mũi tên chọn ngày (qua tháng tự đổi) · OK: xem đầy đủ ngày đó (lịch vạn niên, ngày này năm xưa) ·
 * CH+/CH− hoặc đỏ/xanh lá: tháng trước/sau · vàng: hôm nay · Back: đóng.
 *
 * Giao diện tiếng Anh: tên ngày, tháng, tiết khí, ngày lễ bằng tiếng Anh; can chi và tên sao giữ nguyên (là tên riêng);
 * các lời bàn theo sách Việt (Trực, Bành Tổ, hướng và giờ xuất hành) chỉ có ở giao diện tiếng Việt.
 */
(function (root) {
  'use strict';

  var DOW = I18n.en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  var TERMS_EN = { 'Xuân phân': 'Spring Equinox', 'Thanh minh': 'Clear and Bright', 'Cốc vũ': 'Grain Rain', 'Lập hạ': 'Start of Summer',
    'Tiểu mãn': 'Grain Buds', 'Mang chủng': 'Grain in Ear', 'Hạ chí': 'Summer Solstice', 'Tiểu thử': 'Minor Heat',
    'Đại thử': 'Major Heat', 'Lập thu': 'Start of Autumn', 'Xử thử': 'End of Heat', 'Bạch lộ': 'White Dew',
    'Thu phân': 'Autumn Equinox', 'Hàn lộ': 'Cold Dew', 'Sương giáng': 'Frost Descent', 'Lập đông': 'Start of Winter',
    'Tiểu tuyết': 'Minor Snow', 'Đại tuyết': 'Major Snow', 'Đông chí': 'Winter Solstice', 'Tiểu hàn': 'Minor Cold',
    'Đại hàn': 'Major Cold', 'Lập xuân': 'Start of Spring', 'Vũ thủy': 'Rain Water', 'Kinh trập': 'Awakening of Insects' };

  /** The solar term of a day: "Sương giáng", or "Frost Descent (Sương giáng)" in English. */
  function term(jd) {
    var t = Lunar.solarTerm(jd);
    return I18n.en ? TERMS_EN[t] + ' (' + t + ')' : t;
  }

  var el = null, sel = null, onClose = null, monthEvents = {}, opts = {};

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function build() {
    el = document.createElement('div');
    el.id = 'calendar';
    el.className = 'hidden';
    el.innerHTML =
      '<div id="calDay"></div>' +
      '<div id="calMonth">' +
      '  <div id="calHead"><span id="calTitle"></span><span id="calHint">' + T('OK xem ngày  ·  CH+ / CH− đổi tháng  ·  vàng hôm nay') + '</span></div>' +
      '  <div id="calDow"></div>' +
      '  <div id="calGrid"></div>' +
      '  <div id="calEvents"></div>' +
      '</div>';
    document.body.appendChild(el);
    $('calDow').innerHTML = DOW.map(function (d, i) { return '<span' + (i >= 5 ? ' class="we"' : '') + '>' + d + '</span>'; }).join('');
  }

  function jdOf(d) { return Lunar.jdFromDate(d.getDate(), d.getMonth() + 1, d.getFullYear()); }

  /** Holidays, Rằm/Mùng 1 and birthdays in the month shown, keyed by Julian day. */
  function loadMonthEvents(y, m) {
    monthEvents = {};
    var first = new Date(y, m - 1, 1);
    Events.upcoming(first, { horizon: 42, birthdays: opts.birthdays || [] }).forEach(function (e) {
      if (e.solar[1] === m && e.solar[2] === y) monthEvents[e.jd] = e;
    });
  }

  function render() {
    var y = sel.getFullYear(), m = sel.getMonth() + 1;
    if (render.month !== y * 12 + m) { render.month = y * 12 + m; loadMonthEvents(y, m); }
    var today = jdOf(new Date()), selJd = jdOf(sel);
    $('calTitle').textContent = I18n.monthYear(m, y);

    // Grid: Monday first, six weeks.
    var first = new Date(y, m - 1, 1);
    var lead = (first.getDay() + 6) % 7;
    var startJd = jdOf(first) - lead;
    var html = '';
    for (var i = 0; i < 42; i++) {
      var jd = startJd + i;
      var s = Lunar.jdToDate(jd), l = Lunar.fromSolar(s[0], s[1], s[2]);
      var cls = 'cell';
      if (s[1] !== m) cls += ' out';
      if (i % 7 >= 5) cls += ' we';
      if (jd === today) cls += ' today';
      if (jd === selJd) cls += ' sel';
      var ev = monthEvents[jd];
      if (ev) cls += ' ev ' + ev.kind;
      var lunarText = l.day === 1 ? '1/' + l.month + (l.leap ? (I18n.en ? 'L' : 'n') : '') : (l.day === 15 && !I18n.en ? 'Rằm' : String(l.day));
      html += '<div class="' + cls + '"><b>' + s[0] + '</b><i>' + lunarText + '</i>' + (ev ? '<u></u>' : '') + '</div>';
    }
    $('calGrid').innerHTML = html;

    var list = Object.keys(monthEvents).map(function (k) { return monthEvents[k]; }).sort(function (a, b) { return a.jd - b.jd; });
    $('calEvents').innerHTML = list.map(function (e) {
      return '<span class="' + e.kind + (e.jd === selJd ? ' on' : '') + '"><b>' + e.solar[0] + '/' + e.solar[1] + '</b> ' + esc(Events.label(e)) + '</span>';
    }).join('');

    renderDay(selJd);
  }

  function renderDay(jd) {
    var s = Lunar.jdToDate(jd), l = Lunar.fromSolar(s[0], s[1], s[2]);
    var d = new Date(s[2], s[1] - 1, s[0]);
    var star = Lunar.dayStar(l);
    var len = Lunar.monthLength(l);
    var ev = monthEvents[jd];
    var hours = Lunar.luckyHours(jd).map(function (h) { return '<span><b>' + h.name + '</b> ' + h.hours + '</span>'; }).join('');
    var diff = jd - jdOf(new Date());
    var rel = diff === 0 ? T('Hôm nay') : diff === 1 ? T('Ngày mai') : diff === -1 ? T('Hôm qua') : diff > 0 ? T('Sau {0} ngày', diff) :
      T('{0} ngày trước', -diff);
    var lunarMonth = I18n.en ? T('Tháng âm {0}', l.month) + (l.leap ? ' (leap)' : '') + ', ' + T('{0} ngày', len) :
      'Tháng ' + Lunar.MONTH_NAMES[l.month - 1] + (l.leap ? ' nhuận' : '') + ' (' + (len === 30 ? 'đủ' : 'thiếu') + ')';
    $('calDay').innerHTML =
      '<div class="cdRel">' + rel + '</div>' +
      '<div class="cdSolar"><span class="cdNum">' + s[0] + '</span><span class="cdWhen">' + I18n.weekday(d) +
      '<br>' + (I18n.en ? I18n.monthName(s[1]) + ' ' + s[2] : 'Tháng ' + s[1] + ', ' + s[2]) + '</span></div>' +
      '<div class="cdLunar"><span class="cdNum">' + l.day + '</span><span class="cdWhen">' + lunarMonth +
      '<br>' + T('Năm {0}', I18n.yearName(l.year)) + '</span></div>' +
      '<div class="cdCanChi">' + T('Ngày <b>{0}</b> · Tháng <b>{1}</b> · Năm <b>{2}</b>', Lunar.dayName(jd), Lunar.monthName(l.month, l.year),
        Lunar.yearName(l.year)) + '</div>' +
      '<div class="cdStar ' + (star.good ? 'good' : 'bad') + '">' + (star.good ? T('Ngày hoàng đạo') : T('Ngày hắc đạo')) +
      ' · ' + star.name + '</div>' +
      '<div class="cdTerm">' + T('Tiết <b>{0}</b>', term(jd)) + '</div>' +
      (I18n.en ? '<div class="cdOk">' + T('OK  ·  xem đầy đủ ngày này') + '</div>' : almanacLine(s)) +
      '<div class="cdHead">' + T('Giờ hoàng đạo') + '</div><div class="cdHours">' + hours + '</div>' +
      (ev ? '<div class="cdEvent">' + esc(Events.label(ev)) + '</div>' : '') +
      '<div class="cdHead">' + T('Sắp tới') + '</div><div class="cdNext">' + nextEvents(d, jd) + '</div>';
  }

  function almanacLine(s) {
    var a = Almanac.day(s[0], s[1], s[2]);
    return '<div class="cdAlm">Trực <b class="' + (a.truc.good ? 'g' : 'x') + '">' + a.truc.name + '</b> · Sao <b class="' +
      (a.tu.good ? 'g' : 'x') + '">' + a.tu.name + '</b> · ' + a.napAm + '</div>' +
      (a.warnings.length ? '<div class="cdWarn">' + esc(a.warnings[0].split(':')[0]) + '</div>' : '') +
      '<div class="cdOk">' + T('OK  ·  xem đầy đủ ngày này') + '</div>';
  }

  // ---- "Xem ngày": everything about one day ---------------------------------------------------

  var detail = null;

  function openDetail() {
    if (!detail) {
      detail = document.createElement('div');
      detail.id = 'calDetail';
      el.appendChild(detail);
    }
    detail.classList.remove('hidden');
    renderDetail();
  }

  function closeDetail() { if (detail) detail.classList.add('hidden'); }

  function detailOpen() { return !!detail && !detail.classList.contains('hidden'); }

  function renderDetail() {
    var d = sel, s = [d.getDate(), d.getMonth() + 1, d.getFullYear()];
    var jd = jdOf(d), l = Lunar.fromSolar(s[0], s[1], s[2]);
    var a = Almanac.day(s[0], s[1], s[2]), star = Lunar.dayStar(l);
    function row(label, value, cls) { return '<div class="dRow"><span>' + label + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + value + '</b></div>'; }
    function good(x) { return x ? 'g' : 'x'; }
    var hours = Lunar.luckyHours(jd).map(function (h) { return '<i><b>' + h.name + '</b> ' + h.hours + '</i>'; }).join('');
    var ltp = a.lyThuanPhong.map(function (h) {
      return '<div class="dRow"><span>' + h.hours + '</span><b class="' + good(h.good) + '">' + h.name + '</b></div>';
    }).join('');
    var ev = monthEvents[jd];
    if (I18n.en) {   // the parts that read in English; the Vietnamese almanac's advice stays in the Vietnamese screen
      detail.innerHTML =
        '<div class="dHead"><div class="dTitle">' + I18n.weekday(d) + ', ' + I18n.monthName(s[1]) + ' ' + s[0] + ', ' + s[2] + '</div>' +
        '<div class="dSub">' + I18n.lunarShort(l) + ', ' + T('năm {0}', I18n.yearName(l.year)) + (ev ? '  ·  <em>' + esc(Events.label(ev)) + '</em>' : '') + '</div>' +
        '<div class="dBadges"><span class="' + good(star.good) + '">' + (star.good ? T('Ngày hoàng đạo') : T('Ngày hắc đạo')) + ' · ' + star.name + '</span></div></div>' +
        '<div class="dCol"><h3>' + T('Ngày') + '</h3>' +
        row(T('Can chi'), T('Ngày {0} · Tháng {1}', Lunar.dayName(jd), Lunar.monthName(l.month, l.year))) +
        row(T('Năm'), I18n.yearName(l.year)) + row(T('Tiết khí'), term(jd)) + '</div>' +
        '<div class="dCol"><h3>' + T('Giờ hoàng đạo') + '</h3><div class="dHours">' + hours + '</div></div>' +
        '<div class="dCol"><h3>' + T('Ngày này năm xưa') + '</h3><div id="dHistory"><p class="dim">' + T('Đang tải…') + '</p></div></div>' +
        '<div class="dHint">' + T('◀ ▶ ngày trước / sau   ·   Back quay lại lịch') + '</div>';
      return fillHistory(d, jd);
    }
    detail.innerHTML =
      '<div class="dHead"><div class="dTitle">' + I18n.weekday(d) + ', ' + s[0] + ' tháng ' + s[1] + ', ' + s[2] + '</div>' +
      '<div class="dSub">' + Lunar.format(l) + ' năm ' + Lunar.yearName(l.year) + (ev ? '  ·  <em>' + esc(ev.title) + '</em>' : '') + '</div>' +
      '<div class="dBadges"><span class="' + good(star.good) + '">' + (star.good ? 'Ngày hoàng đạo' : 'Ngày hắc đạo') + ' · ' + star.name + '</span>' +
      '<span class="' + good(a.relation.good) + '">' + a.relation.text + ' · ' + a.relation.name + '</span>' +
      (a.warnings.length ? '<span class="x">' + esc(a.warnings[0].split(':')[0]) + '</span>' : '') + '</div></div>' +
      '<div class="dCol">' +
      '<h3>Ngày</h3>' +
      row('Can chi', 'Ngày ' + Lunar.dayName(jd) + ' · Tháng ' + Lunar.monthName(l.month, l.year)) +
      row('Năm', Lunar.yearName(l.year)) +
      row('Nạp âm', a.napAm) +
      row('Tiết khí', Lunar.solarTerm(jd)) +
      row('Trực', a.truc.name + (a.truc.good ? ' (tốt)' : ' (xấu)'), good(a.truc.good)) +
      '<p>' + a.truc.advice + '</p>' +
      row('Nhị thập bát tú', 'Sao ' + a.tu.name + ' · ' + a.tu.element + ' · ' + a.tu.animal, good(a.tu.good)) +
      row('Tuổi xung', 'Ngày: tuổi ' + a.xung.day + ' · Tháng: tuổi ' + a.xung.month) +
      '</div>' +
      '<div class="dCol">' +
      '<h3>Giờ hoàng đạo</h3><div class="dHours">' + hours + '</div>' +
      '<h3>Giờ xuất hành Lý Thuần Phong</h3>' + ltp +
      '<h3>Hướng xuất hành</h3>' +
      row('Hỷ thần (vui vẻ)', a.huong.hyThan, 'g') + row('Tài thần (tiền bạc)', a.huong.taiThan, 'g') +
      (a.huong.hacThan ? row('Hạc thần (nên tránh)', a.huong.hacThan, 'x') : row('Hạc thần', 'lên trời, không phải tránh')) +
      '</div>' +
      '<div class="dCol">' +
      (a.warnings.length ? '<h3>Lưu ý</h3>' + a.warnings.map(function (w) { return '<p class="warn">' + esc(w) + '</p>'; }).join('') : '') +
      '<h3>Bành Tổ bách kỵ</h3>' + a.banhTo.map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('') +
      '<h3>Ngày này năm xưa</h3><div id="dHistory"><p class="dim">Đang tải…</p></div>' +
      '</div>' +
      '<div class="dHint">◀ ▶ ngày trước / sau   ·   Back quay lại lịch</div>';
    fillHistory(d, jd);
  }

  function fillHistory(d, want) {
    History.load(d, function (items) {
      if (!detailOpen() || jdOf(sel) !== want) return;
      var box = document.getElementById('dHistory');
      if (!box) return;
      box.innerHTML = items.length ? items.slice(0, 5).map(function (it) {
        return '<div class="hItem"><b>' + it.year + '</b><span>' + (it.kind === 'birth' ? T('Sinh: ') : it.kind === 'death' ? T('Mất: ') : '') +
          esc(it.text) + '</span></div>';
      }).join('') : '<p class="dim">' + T('Chưa có dữ liệu cho ngày này.') + '</p>';
    });
  }

  /** The next five holidays and birthdays after the selected day (Rằm / Mùng 1 are on the grid already). */
  function nextEvents(date, jd) {
    return Events.upcoming(date, { horizon: 200, birthdays: opts.birthdays || [] })
      .filter(function (e) { return e.kind !== 'moon' && e.jd > jd; }).slice(0, 5)
      .map(function (e) {
        return '<div><b>' + e.solar[0] + '/' + e.solar[1] + '</b><span>' + esc(Events.label(e)) + '</span><i>' +
          Events.countdown(e.days, true) + '</i></div>';
      }).join('');
  }

  var prefetchTimer = null;

  function move(days) {
    sel = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate() + days);
    render();
    // Resting on a day for a moment fetches its "ngày này năm xưa", so OK opens Xem ngày already filled in.
    clearTimeout(prefetchTimer);
    var d = sel;
    prefetchTimer = setTimeout(function () { History.prefetch(d); }, 700);
  }

  function shiftMonth(n) {
    var day = sel.getDate();
    var target = new Date(sel.getFullYear(), sel.getMonth() + n, 1);
    var last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    sel = new Date(target.getFullYear(), target.getMonth(), Math.min(day, last));
    render();
  }

  function open(close, options) {
    opts = options || {};
    if (!el) build();
    closeDetail();
    onClose = close;
    sel = new Date();
    render.month = 0;
    el.classList.remove('hidden');
    render();
  }

  function closeCal() {
    el.classList.add('hidden');
    if (onClose) onClose();
  }

  function key(k) {
    if (!el || el.classList.contains('hidden')) return false;
    if (detailOpen()) {
      if (k === 'left' || k === 'up') { move(-1); renderDetail(); }
      else if (k === 'right' || k === 'down') { move(1); renderDetail(); }
      else if (k === 'back' || k === 'ok') closeDetail();
      return true;
    }
    if (k === 'ok') { openDetail(); return true; }
    if (k === 'left') move(-1);
    else if (k === 'right') move(1);
    else if (k === 'up') move(-7);
    else if (k === 'down') move(7);
    else if (k === 'chup' || k === 'red') shiftMonth(-1);
    else if (k === 'chdown' || k === 'green') shiftMonth(1);
    else if (k === 'yellow') { sel = new Date(); render(); }
    else if (k === 'back') closeCal();
    return true;
  }

  root.Calendar = { open: open, key: key, isOpen: function () { return !!el && !el.classList.contains('hidden'); } };
})(this);
