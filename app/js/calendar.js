/*
 * Lịch vạn niên: một tháng dương lịch với ngày âm từng ô, và chi tiết ngày đang chọn — can chi, ngày hoàng
 * đạo / hắc đạo, tiết khí, giờ hoàng đạo, ngày lễ. Mở từ nút "Lịch" trên màn hình chính.
 *
 *   Calendar.open(onClose)   Calendar.key(action) -> true khi đã xử lý
 *
 * Phím: mũi tên chọn ngày (qua tháng tự đổi) · OK: xem đầy đủ ngày đó (lịch vạn niên, ngày này năm xưa) ·
 * CH+/CH− hoặc đỏ/xanh lá: tháng trước/sau · vàng: hôm nay · Back: đóng.
 */
(function (root) {
  'use strict';

  var DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  var DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

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
      '  <div id="calHead"><span id="calTitle"></span><span id="calHint">OK xem ngày  ·  CH+ / CH− đổi tháng  ·  vàng hôm nay</span></div>' +
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
    $('calTitle').textContent = 'Tháng ' + m + ' · ' + y;

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
      var lunarText = l.day === 1 ? '1/' + l.month + (l.leap ? 'n' : '') : (l.day === 15 ? 'Rằm' : String(l.day));
      html += '<div class="' + cls + '"><b>' + s[0] + '</b><i>' + lunarText + '</i>' + (ev ? '<u></u>' : '') + '</div>';
    }
    $('calGrid').innerHTML = html;

    var list = Object.keys(monthEvents).map(function (k) { return monthEvents[k]; }).sort(function (a, b) { return a.jd - b.jd; });
    $('calEvents').innerHTML = list.map(function (e) {
      return '<span class="' + e.kind + (e.jd === selJd ? ' on' : '') + '"><b>' + e.solar[0] + '/' + e.solar[1] + '</b> ' + esc(e.title) + '</span>';
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
    var rel = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Ngày mai' : diff === -1 ? 'Hôm qua' : diff > 0 ? 'Sau ' + diff + ' ngày' : diff + ' ngày trước';
    $('calDay').innerHTML =
      '<div class="cdRel">' + rel.replace('-', '') + '</div>' +
      '<div class="cdSolar"><span class="cdNum">' + s[0] + '</span><span class="cdWhen">' + DAYS[d.getDay()] +
      '<br>Tháng ' + s[1] + ', ' + s[2] + '</span></div>' +
      '<div class="cdLunar"><span class="cdNum">' + l.day + '</span><span class="cdWhen">Tháng ' + Lunar.MONTH_NAMES[l.month - 1] +
      (l.leap ? ' nhuận' : '') + ' (' + (len === 30 ? 'đủ' : 'thiếu') + ')<br>Năm ' + Lunar.yearName(l.year) + '</span></div>' +
      '<div class="cdCanChi">Ngày <b>' + Lunar.dayName(jd) + '</b> · Tháng <b>' + Lunar.monthName(l.month, l.year) +
      '</b> · Năm <b>' + Lunar.yearName(l.year) + '</b></div>' +
      '<div class="cdStar ' + (star.good ? 'good' : 'bad') + '">' + (star.good ? 'Ngày hoàng đạo' : 'Ngày hắc đạo') +
      ' · ' + star.name + '</div>' +
      '<div class="cdTerm">Tiết <b>' + Lunar.solarTerm(jd) + '</b></div>' +
      almanacLine(s) +
      '<div class="cdHead">Giờ hoàng đạo</div><div class="cdHours">' + hours + '</div>' +
      (ev ? '<div class="cdEvent">' + esc(ev.title) + '</div>' : '') +
      '<div class="cdHead">Sắp tới</div><div class="cdNext">' + nextEvents(d, jd) + '</div>';
  }

  function almanacLine(s) {
    var a = Almanac.day(s[0], s[1], s[2]);
    return '<div class="cdAlm">Trực <b class="' + (a.truc.good ? 'g' : 'x') + '">' + a.truc.name + '</b> · Sao <b class="' +
      (a.tu.good ? 'g' : 'x') + '">' + a.tu.name + '</b> · ' + a.napAm + '</div>' +
      (a.warnings.length ? '<div class="cdWarn">' + esc(a.warnings[0].split(':')[0]) + '</div>' : '') +
      '<div class="cdOk">OK  ·  xem đầy đủ ngày này</div>';
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
    detail.innerHTML =
      '<div class="dHead"><div class="dTitle">' + DAYS[d.getDay()] + ', ' + s[0] + ' tháng ' + s[1] + ', ' + s[2] + '</div>' +
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
    var want = jd;
    History.load(d, function (items) {
      if (!detailOpen() || jdOf(sel) !== want) return;
      var box = document.getElementById('dHistory');
      if (!box) return;
      box.innerHTML = items.length ? items.slice(0, 5).map(function (it) {
        return '<div class="hItem"><b>' + it.year + '</b><span>' + (it.kind === 'birth' ? 'Sinh: ' : it.kind === 'death' ? 'Mất: ' : '') +
          esc(it.text) + '</span></div>';
      }).join('') : '<p class="dim">Chưa có dữ liệu cho ngày này.</p>';
    });
  }

  /** The next five holidays and birthdays after the selected day (Rằm / Mùng 1 are on the grid already). */
  function nextEvents(date, jd) {
    return Events.upcoming(date, { horizon: 200, birthdays: opts.birthdays || [] })
      .filter(function (e) { return e.kind !== 'moon' && e.jd > jd; }).slice(0, 5)
      .map(function (e) {
        return '<div><b>' + e.solar[0] + '/' + e.solar[1] + '</b><span>' + esc(e.title) + '</span><i>' +
          Events.countdown(e.days).replace('Còn', 'còn') + '</i></div>';
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
