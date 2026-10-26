/*
 * Giá vàng và tỷ giá cho khối "Hôm nay".
 *
 *   Giá vàng: PNJ (edge-api.pnj.io, có CORS): vàng miếng SJC và nhẫn trơn 999.9, đơn vị nghìn đồng/chỉ.
 *             Trang của SJC nằm sau Cloudflare, DOJI và BTMC chặn truy cập, nên PNJ là nguồn duy nhất dùng được.
 *   Tỷ giá:   Vietcombank (XML công khai: mua tiền mặt, chuyển khoản, bán); không lấy được thì open.er-api.com
 *             (tỷ giá trung bình thị trường).
 *
 * Kho lưu 30 phút: mở là hiện ngay, cập nhật ngầm khi đã cũ. Nguồn nào lỗi thì không có thẻ đó.
 *
 *   Markets.load(cb)   cb({gold, usd}) — có thể gọi hai lần (bản đã lưu, rồi bản mới); gold hoặc usd có thể null
 */
(function (root) {
  'use strict';

  var CACHE = 'markets', TTL = 30 * 60000;
  var PNJ = 'https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00';
  var VCB = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';
  var ER = 'https://open.er-api.com/v6/latest/USD';

  function num(s) { return parseFloat(String(s).replace(/,/g, '')); }

  /** PNJ: prices in thousand đồng per chỉ → million đồng per lượng (10 chỉ). */
  function parsePnj(json) {
    var rows = (json && json.data) || [];
    function find(code) {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].masp === code && rows[i].giamua && rows[i].giaban) return { buy: rows[i].giamua / 100, sell: rows[i].giaban / 100 };
      }
      return null;
    }
    var bar = find('SJC'), ring = find('N24K');
    if (!bar && !ring) return null;
    var t = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/.exec((json && json.updateDate) || '');
    return { bar: bar, ring: ring, source: 'PNJ', updated: t ? t[4] + ':' + t[5] + ' ' + t[1] + '/' + t[2] : '' };
  }

  /** Vietcombank XML: <Exrate CurrencyCode="USD" Buy="25,640.00" Transfer="25,670.00" Sell="26,050.00" />. */
  function parseVcb(xml) {
    function rate(code) {
      var m = new RegExp('<Exrate[^>]*CurrencyCode="' + code + '"[^>]*>').exec(xml || '');
      if (!m) return null;
      function attr(n) { var a = new RegExp(n + '="([^"]*)"').exec(m[0]); return a ? num(a[1]) : NaN; }
      var r = { cash: attr('Buy'), transfer: attr('Transfer'), sell: attr('Sell') };
      return r.transfer > 0 && r.sell > 0 ? r : null;
    }
    var usd = rate('USD');
    if (!usd) return null;
    var eur = rate('EUR');
    var t = /<DateTime>(\d+)\/(\d+)\/\d+ (\d+):(\d+):\d+ ?(AM|PM)?/.exec(xml || '');
    var hour = t ? (+t[3] % 12) + (t[5] === 'PM' ? 12 : 0) : 0;
    return { usd: usd, eur: eur ? eur.transfer : null, source: 'Vietcombank',
      updated: t ? ('0' + hour).slice(-2) + ':' + t[4] + ' ' + ('0' + t[2]).slice(-2) + '/' + ('0' + t[1]).slice(-2) : '' };
  }

  /** open.er-api.com: one market rate, no buy/sell spread. */
  function parseEr(json) {
    var vnd = json && json.rates && json.rates.VND;
    if (!(vnd > 0)) return null;
    var eurPerUsd = json.rates.EUR;
    return { usd: { transfer: vnd, sell: null, cash: null }, eur: eurPerUsd > 0 ? vnd / eurPerUsd : null,
      source: T('tỷ giá thị trường'), updated: '' };
  }

  function getText(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', Platform.isTV ? url : '/proxy?u=' + encodeURIComponent(url));
    xhr.timeout = 15000;
    xhr.onload = function () { cb(xhr.status >= 200 && xhr.status < 300 ? xhr.responseText : null); };
    xhr.onerror = xhr.ontimeout = function () { cb(null); };
    xhr.send();
  }

  function json(text) { try { return JSON.parse(text); } catch (e) { return null; } }

  function fetchAll(cb) {
    var out = { gold: null, usd: null }, left = 2;
    function done() { if (--left === 0) cb(out); }
    getText(PNJ, function (t) { out.gold = parsePnj(json(t)); done(); });
    getText(VCB, function (t) {
      out.usd = parseVcb(t);
      if (out.usd) return done();
      getText(ER, function (e) { out.usd = parseEr(json(e)); done(); });
    });
  }

  function load(cb) {
    var cached = Platform.store.get(CACHE, null);
    var have = cached && (cached.gold || cached.usd);
    if (have) cb(cached);
    if (have && Date.now() - cached.at < TTL) return;
    fetchAll(function (fresh) {
      if (!fresh.gold && !fresh.usd) { if (!have) cb(fresh); return; }   // offline: keep what we had
      fresh.gold = fresh.gold || (cached && cached.gold) || null;
      fresh.usd = fresh.usd || (cached && cached.usd) || null;
      fresh.at = Date.now();
      Platform.store.set(CACHE, fresh);
      cb(fresh);
    });
  }

  // "141,7" (one decimal, Vietnamese comma) and "25.670" (thousands with dots); 141.7 and 25,670 in English.
  var EN = root.I18n && I18n.en;
  function million(v) { return EN ? v.toFixed(1) : v.toFixed(1).replace('.', ','); }
  function vnd(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, EN ? ',' : '.'); }

  /** The "Hôm nay" cards for what we have. */
  function cards(m) {
    var out = [];
    if (m && m.gold && (m.gold.bar || m.gold.ring)) {
      var g = m.gold, main = g.bar || g.ring;
      out.push({
        label: T('Giá vàng · {0}', g.source),
        text: T('{0}: mua {1} · bán {2} triệu/lượng', g.bar ? T('Vàng miếng SJC') : T('Nhẫn trơn 999.9'), million(main.buy), million(main.sell)),
        meta: [g.bar && g.ring ? T('Nhẫn trơn 999.9') + ': ' + million(g.ring.buy) + ' · ' + million(g.ring.sell) : '',
          g.updated ? T('cập nhật {0}', g.updated) : ''].filter(Boolean).join('  ·  ')
      });
    }
    if (m && m.usd && m.usd.usd) {
      var u = m.usd.usd;
      out.push({
        label: T('Tỷ giá · {0}', m.usd.source),
        text: '1 USD = ' + vnd(u.transfer) + ' ₫' + (u.sell ? ' · ' + T('bán {0} ₫', vnd(u.sell)) : ''),
        meta: [m.usd.eur ? '1 EUR = ' + vnd(m.usd.eur) + ' ₫' : '', m.usd.updated ? T('cập nhật {0}', m.usd.updated) : '']
          .filter(Boolean).join('  ·  ')
      });
    }
    return out;
  }

  root.Markets = { load: load, cards: cards, parsePnj: parsePnj, parseVcb: parseVcb, parseEr: parseEr };
})(this);
