/*
 * Game trên màn hình chính: tên và ảnh bìa SVG (16:9).
 */
(function (root) {
  'use strict';

  var gradients = 0;

  // Each tile's gradient needs its own id: inline SVGs share one document.
  function svg(body, bg1, bg2) {
    var id = 'gameBg' + (gradients++);
    return '<svg viewBox="0 0 256 144" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + bg1 + '"/>' +
      '<stop offset="1" stop-color="' + bg2 + '"/></linearGradient></defs>' +
      '<rect width="256" height="144" fill="url(#' + id + ')"/>' + body + '</svg>';
  }

  function block(x, y, c) {
    return '<rect x="' + x + '" y="' + y + '" width="18" height="18" rx="4" fill="' + c + '"/>' +
      '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="12" height="5" rx="2" fill="#fff" opacity=".28"/>';
  }

  function blocks(cells, c) { return cells.map(function (p) { return block(p[0], p[1], c); }).join(''); }

  var ART = {
    'xep-gach': svg(
      blocks([[150, 20], [170, 20], [190, 20], [170, 40]], '#b388ff') +
      blocks([[60, 64], [60, 84], [80, 84], [100, 84]], '#4dd0e1') +
      blocks([[40, 106], [60, 106], [80, 106], [100, 106], [120, 106], [140, 106], [160, 106], [200, 106]], '#ffca28') +
      blocks([[180, 86], [200, 86], [200, 66], [220, 66]], '#ff7043') +
      blocks([[120, 86], [140, 86], [160, 86]], '#66bb6a') +
      '<rect x="36" y="126" width="196" height="3" rx="1.5" fill="#fff" opacity=".18"/>',
      '#1a1446', '#47207a'),
    'ran-san-moi': svg(
      '<path d="M30 104 C 60 104, 60 56, 98 56 S 132 100, 168 100 S 200 52, 214 44" fill="none" stroke="#c6ff6b" ' +
      'stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M30 104 C 60 104, 60 56, 98 56 S 132 100, 168 100 S 200 52, 214 44" fill="none" stroke="#7ccf2f" ' +
      'stroke-width="16" stroke-linecap="round" stroke-dasharray="2 14" opacity=".9"/>' +
      '<circle cx="218" cy="41" r="3" fill="#0d2a12"/>' +
      '<circle cx="64" cy="34" r="9" fill="#ff4d5e"/><path d="M64 25 q3 -6 8 -6" stroke="#8bc34a" stroke-width="3" fill="none"/>',
      '#0c3b27', '#16764a'),
    '2048': svg(
      '<rect x="36" y="22" width="48" height="48" rx="8" fill="#eee4da"/><text x="60" y="55" font-size="24" font-weight="700" ' +
      'text-anchor="middle" fill="#776e65" font-family="Lexend, sans-serif">2</text>' +
      '<rect x="36" y="76" width="48" height="48" rx="8" fill="#f2b179"/><text x="60" y="109" font-size="24" font-weight="700" ' +
      'text-anchor="middle" fill="#fff" font-family="Lexend, sans-serif">8</text>' +
      '<rect x="92" y="76" width="48" height="48" rx="8" fill="#f59563"/><text x="116" y="109" font-size="22" font-weight="700" ' +
      'text-anchor="middle" fill="#fff" font-family="Lexend, sans-serif">16</text>' +
      '<rect x="148" y="22" width="80" height="102" rx="12" fill="#edc22e"/><text x="188" y="86" font-size="30" font-weight="800" ' +
      'text-anchor="middle" fill="#fff" font-family="Lexend, sans-serif">2048</text>' +
      '<rect x="92" y="22" width="48" height="48" rx="8" fill="#ede0c8"/><text x="116" y="55" font-size="24" font-weight="700" ' +
      'text-anchor="middle" fill="#776e65" font-family="Lexend, sans-serif">4</text>',
      '#5c4033', '#a8744f'),
    'pha-gach': svg(
      (function () {
        var g = '', colors = ['#ff5370', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff'];
        for (var r = 0; r < 5; r++) {
          for (var c = 0; c < 9; c++) {
            if ((r === 3 && c === 4) || (r === 4 && (c === 3 || c === 5))) continue;
            g += '<rect x="' + (17 + c * 25) + '" y="' + (16 + r * 13) + '" width="22" height="10" rx="2" fill="' + colors[r] + '"/>';
          }
        }
        g += '<circle cx="150" cy="96" r="6" fill="#fff"/><path d="M150 96 L118 128" stroke="#fff" stroke-width="2" ' +
          'stroke-dasharray="3 5" opacity=".5"/>';
        g += '<rect x="96" y="124" width="56" height="9" rx="4.5" fill="#e0e7ff"/>';
        return g;
      })(),
      '#0b1033', '#1d2b6b')
  };

  // Open-source games bundled in app/games/<id>/ (original code, plus ../tv.js for the remote):
  //   2048 — gabrielecirulli/2048 (MIT) · Xếp gạch — jakesgordon/javascript-tetris (MIT)
  //   Rắn săn mồi — jakesgordon/javascript-snakes (MIT) · Phá gạch — jakesgordon/javascript-breakout (MIT)
  var LIST = [
    { id: 'xep-gach', title: T('Xếp gạch'), color: [150, 110, 255], desc: T('Trò chơi · OK để bắt đầu · ◀ ▶ dịch khối, ▲ xoay, ▼ rơi nhanh') },
    { id: '2048', title: '2048', color: [237, 194, 46], desc: T('Trò chơi · Gộp các ô cùng số bằng 4 phím mũi tên để đạt 2048') },
    { id: 'ran-san-moi', title: T('Rắn săn mồi'), color: [120, 220, 90], desc: T('Trò chơi · Mũi tên để rẽ, ăn mồi và đừng cắn vào đuôi') },
    { id: 'pha-gach', title: T('Phá gạch'), color: [90, 140, 255], desc: T('Trò chơi · ◀ ▶ di chuyển thanh đỡ, OK để phóng bóng') }
  ];

  // Games whose page exists in app/games/<id>/ — the others show "đang hoàn thiện" instead of opening.
  var READY = { 'xep-gach': true, '2048': true, 'ran-san-moi': true, 'pha-gach': true };

  function record(id) {
    try { return localStorage.getItem('nhaminh.record.' + id) || ''; } catch (e) { return ''; }
  }

  root.Games = {
    list: function () {
      return LIST.map(function (g) {
        return { id: g.id, title: g.title, color: g.color, desc: g.desc, art: ART[g.id], record: record(g.id), ready: !!READY[g.id] };
      });
    }
  };
})(this);
