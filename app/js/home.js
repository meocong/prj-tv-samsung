/*
 * tvOS style home for Samsung Tizen: black, a pinned dock row, a grid of apps and games, and one glass
 * highlight that springs between tiles. A port of webos-vibehack's app.js (MIT), itself a port of the
 * cleanyourtv launcher (MIT), with Tizen app launching, Vietnamese and English text (i18n.js), games,
 * weather/air quality, the lunar date, an English word a day and a Mac-style photo screensaver ("Khung ảnh").
 */
(function (root) {
  'use strict';

  var C = window.CONFIG;
  var S = Platform.store;
  var $ = function (id) { return document.getElementById(id); };

  var settings = Object.assign({}, C.defaults, S.get('settings', {}));
  settings.hiddenApps = (settings.hiddenApps || []).slice();
  function saveSettings() { S.set('settings', settings); }

  // Geometry follows the number of columns (Cài đặt → Màn hình chính → Số ô mỗi hàng): 4 big tiles like
  // Apple TV, or 5–6 smaller ones; the dock is always the first row.
  var TILE_SIZES = { 4: 360, 5: 288, 6: 236 };
  var COLUMNS, TILE_W, TILE_H, CELL_W, ROW_PITCH, DOCK_TOP;
  function setGeometry() {
    COLUMNS = TILE_SIZES[settings.columns] ? settings.columns : 4;
    TILE_W = TILE_SIZES[COLUMNS];
    TILE_H = Math.round(TILE_W * 202 / 360);
    CELL_W = (1920 - 2 * 112) / COLUMNS;
    ROW_PITCH = TILE_H + 90;
    DOCK_TOP = 708 + (202 - TILE_H);   // the dock keeps its bottom edge, the next row still peeks in
    var r = document.documentElement.style;
    r.setProperty('--tw', TILE_W + 'px');
    r.setProperty('--th', TILE_H + 'px');
    r.setProperty('--tr', Math.round(TILE_W * 32 / 360) + 'px');
  }
  setGeometry();
  var DOCK_GAP = 36;            // extra space below the dock
  var FOCUS_SCALE = 1.1;
  var GLASS_PAD = 12;           // room for the glass glow around the scaled tile
  var VIEW_TOP = 236, VIEW_BOTTOM = 1060;   // below the dock the top of the screen is the app's shelf
  var LONG_PRESS_MS = 600;

  var GREETINGS = [[5, T('Chúc ngủ ngon')], [11, T('Chào buổi sáng')], [13, T('Chào buổi trưa')], [18, T('Chào buổi chiều')],
    [22, T('Chào buổi tối')], [24, T('Chúc ngủ ngon')]];

  var ICON_INPUT = 'M18,7V4c0,-1.1 -0.9,-2 -2,-2H8C6.9,2 6,2.9 6,4v3H5v6l3,6v3h8v-3l3,-6V7H18zM8,4h8v3h-2V5h-1v2h-2V5h-1v2H8V4z';
  var ICON_LIVETV = 'M21,6h-7.59l3.29,-3.29L16,2l-4,4l-4,-4l-0.71,0.71L10.59,6H3c-1.1,0 -2,0.89 -2,2v12c0,1.1 0.9,2 2,2h18c1.1,0 2,-0.89 2,-2V8C23,6.89 22.1,6 21,6zM21,20H3V8h18V20zM9,10v8l7,-4L9,10z';

  I18n.apply(document.body);   // the static text of index.html, when the screen is in English
  var stage = $('stage'), tilesEl = $('tiles'), glass = $('glass'), hero = $('hero');
  var ambients = [$('ambientA'), $('ambientB')], ambientFront = 0, ambientColor = null;
  var pills = [$('btnInputs'), $('btnCalendar'), $('btnSettings'), $('btnFamily')];

  var items = [];               // {kind, app|game, el, card, color}
  var zone = 'grid';            // grid | top | inputs | today | settings | frame | none
  var focused = 0, pillFocus = 0, inputFocus = 0, inputRows = [], settingFocus = 0;
  var offset = 0, heroShown = false, glassShown = false;
  var editing = null;           // {item, snapshot} while a tile is being moved
  var weather = null, events = [];
  var lastInput = Date.now();

  // ---- helpers -------------------------------------------------------------------------------

  function plain(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  var HEART = '<svg class="heart" viewBox="0 0 24 24"><path d="M12 21s-7.4-4.5-9.9-9.2C.5 8.5 2.3 4.4 6.1 4.4c2.2 0 3.6 1.2 4.4 2.6 ' +
    '.9-1.4 2.3-2.6 4.5-2.6 3.8 0 5.6 4.1 4 7.4C19.4 16.5 12 21 12 21z"/></svg>';

  /** The family's name as HTML: ❤ becomes a drawn heart (Lexend has no glyph for it). */
  function nameHtml(text) { return esc(text || familyName()).split('❤').join(HEART); }

  /** The default name of config.js reads in the screen's language; a name the family chose stays as it is. */
  function familyName() { return T(C.familyName || ''); }

  var toastTimer;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('shown'); }, 2400);
  }

  // ---- items ---------------------------------------------------------------------------------

  function itemId(it) { return it.kind === 'game' ? 'game:' + it.game.id : it.kind === 'news' || it.kind === 'words' ? it.kind : it.app.id; }
  function itemTitle(it) {
    return it.kind === 'game' ? it.game.title : it.kind === 'news' ? T('Tin mới') : it.kind === 'words' ? T('Học tiếng Anh') : it.app.title;
  }

  var NEWS_ART = '<svg viewBox="0 0 256 144" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="newsBg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#ff7a45"/><stop offset="1" stop-color="#d6336c"/></linearGradient></defs>' +
    '<rect width="256" height="144" fill="url(#newsBg)"/><rect x="78" y="34" width="100" height="76" rx="10" fill="none" stroke="#fff" stroke-width="7"/>' +
    '<path d="M94 54h40M94 68h68M94 82h68M94 96h50" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' +
    '<rect x="146" y="48" width="18" height="16" rx="3" fill="#fff"/></svg>';

  var WORDS_ART = '<svg viewBox="0 0 256 144" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wordsBg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#2ec4b6"/><stop offset="1" stop-color="#3a6ff7"/></linearGradient></defs>' +
    '<rect width="256" height="144" fill="url(#wordsBg)"/><path d="M70 36h116a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12h-62l-22 18v-18H70a12 12 0 0 1-12-12V48a12 12 0 0 1 12-12z" ' +
    'fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M84 88l14-36 14 36M89 76h18" fill="none" stroke="#fff" ' +
    'stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="138" cy="78" r="10" fill="none" stroke="#fff" stroke-width="6"/>' +
    '<path d="M148 66v22M164 58v30" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="173" cy="78" r="10" fill="none" stroke="#fff" stroke-width="6"/></svg>';

  /** Dock slots from config.js, then apps by how often they are opened; games on the second grid row. */
  var allApps = [];   // every app that could be shown, for Cài đặt → Ứng dụng

  function orderedItems(apps) {
    var hidden = (C.hidden || []).map(plain);
    apps = apps.filter(function (a) {
      var t = plain(a.title);
      return !hidden.some(function (h) { return t.indexOf(h) === 0 || plain(a.id) === h; });
    });
    var hiddenIds = C.hiddenIds || [];
    apps = apps.filter(function (a) { return hiddenIds.indexOf(a.storeId) === -1 && hiddenIds.indexOf(a.id) === -1; });
    allApps = apps.slice();
    apps = apps.filter(function (a) { return (settings.hiddenApps || []).indexOf(a.id) === -1; });
    var has = function (needles) {
      return needles.some(function (m) { return apps.some(function (a) { return plain(a.title).indexOf(plain(m)) !== -1; }); });
    };
    var used = {}, dock = [];
    (C.dock || []).forEach(function (slot) {
      if (dock.length >= COLUMNS || (slot.skipIf && has(slot.skipIf))) return;
      var match = (slot.match || []).map(plain);
      for (var i = 0; i < apps.length; i++) {
        var a = apps[i];
        if (used[a.id]) continue;
        if ((slot.id && a.id === slot.id) || match.some(function (m) { return plain(a.title).indexOf(m) !== -1; })) {
          used[a.id] = true;
          if (slot.title) a.title = slot.title;
          dock.push(a);
          break;
        }
      }
    });
    var rest = apps.filter(function (a) { return !used[a.id]; });
    rest.sort(function (a, b) { return (b.uses || 0) - (a.uses || 0) || a.title.localeCompare(b.title); });

    var restItems = rest.map(appItem);
    var gameItems = Games.list().map(function (g) { return { kind: 'game', game: g, color: g.color }; });
    var split = Math.max(0, COLUMNS * 2 - dock.length);   // the first grid row stays apps
    // Tin mới and Học tiếng Anh open the first grid row.
    var own = [{ kind: 'news', color: [255, 122, 69] }].concat(settings.showWords ? [{ kind: 'words', color: [46, 160, 220] }] : []);
    var lead = restItems.slice(0, Math.max(0, split - own.length));
    var all = dock.map(appItem).concat(own, lead, gameItems, restItems.slice(lead.length));

    // An order arranged on the TV wins, until the dock in config.js changes.
    var saved = loadOrder();
    if (!saved) return all;
    var byId = {};
    all.forEach(function (it) { byId[itemId(it)] = it; });
    var placed = [];
    saved.forEach(function (id) { if (byId[id]) { placed.push(byId[id]); delete byId[id]; } });
    // A tile the arranged order has never seen goes where it would be by default (Học tiếng Anh: after Tin mới).
    all.forEach(function (it, i) {
      if (!byId[itemId(it)]) return;
      var prev = i > 0 ? placed.indexOf(all[i - 1]) : -1;
      if (it.kind === 'words' && prev !== -1) placed.splice(prev + 1, 0, it); else placed.push(it);
    });
    return placed;
  }

  function appItem(a) { return { kind: 'app', app: a, color: null }; }

  var ORDER_KEY = 'order';
  function dockKey() { return JSON.stringify(C.dock || []) + COLUMNS; }

  function loadOrder() {
    var s = S.get(ORDER_KEY, null);
    return s && s.dock === dockKey() ? s.ids : null;
  }

  function saveOrder() { S.set(ORDER_KEY, { dock: dockKey(), ids: items.map(itemId) }); }

  function rowOf(i) { return Math.floor(i / COLUMNS); }
  function tileLeft(i) { return 112 + (i % COLUMNS) * CELL_W + (CELL_W - TILE_W) / 2; }
  function tileTop(i) { var r = rowOf(i); return DOCK_TOP + r * ROW_PITCH + (r > 0 ? DOCK_GAP : 0); }

  function build(apps) {
    tilesEl.innerHTML = '';
    items = orderedItems(apps);
    items.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'item';
      var card = document.createElement('div');
      card.className = 'card';
      el.appendChild(card);
      var name = document.createElement('div');
      name.className = 'name';
      name.textContent = itemTitle(item);
      el.appendChild(name);
      item.el = el;
      item.card = card;

      if (item.kind === 'news') {
        card.innerHTML = NEWS_ART;
      } else if (item.kind === 'words') {
        card.innerHTML = WORDS_ART;
      } else if (item.kind === 'game') {
        card.innerHTML = item.game.art;
      } else if (item.app.icon) {
        var img = document.createElement('img');
        img.onload = function () { paintTile(item, img); };
        img.onerror = function () { letterTile(item); };
        img.src = item.app.icon;
        card.appendChild(img);
      } else {
        letterTile(item);
      }
      el.addEventListener('mouseover', function () { if (zone === 'grid' && !editing) focusTile(items.indexOf(item)); });
      el.addEventListener('click', function () { if (editing) finishEdit(true); else open(item); });
      tilesEl.appendChild(el);
    });
    layout();
  }

  function letterTile(item) {
    item.card.innerHTML = '';
    var l = document.createElement('div');
    l.className = 'letter';
    l.textContent = item.app.title.split(/[\s\-:]+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
    item.card.appendChild(l);
    item.color = [120, 120, 130];
  }

  /** Places every tile by its position in items; tiles glide when the order changes. */
  function layout() {
    items.forEach(function (it, i) {
      it.el.style.left = tileLeft(i) + 'px';
      it.el.style.top = tileTop(i) + 'px';
      it.el.classList.toggle('dock', rowOf(i) === 0);   // the dock has no labels: the top shelf names it
    });
    var band = $('dockBand');
    var n = Math.min(COLUMNS, items.length);
    band.style.display = n ? 'block' : 'none';
    band.style.left = (tileLeft(0) - 28) + 'px';
    band.style.top = (DOCK_TOP - 28) + 'px';
    band.style.width = ((n - 1) * CELL_W + TILE_W + 56) + 'px';
    band.style.height = (TILE_H + 56) + 'px';
  }

  function animateIn() {
    items.forEach(function (it, i) {
      it.el.classList.remove('shown');
      setTimeout(function () { it.el.classList.add('shown'); }, 60 + Math.min(i, 16) * 40);
    });
  }

  /** The glow colour of a banner: its most saturated, not too dark pixel. */
  function paintTile(item, img) {
    try {
      var c = document.createElement('canvas');
      c.width = 16; c.height = 9;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, 16, 9);
      item.color = vividColor(g.getImageData(0, 0, 16, 9).data);
    } catch (e) {
      item.color = [120, 120, 130];
    }
    if (items[focused] === item && zone === 'grid') setAmbient(item.color);
  }

  function vividColor(px) {
    var best = null, bestScore = -1, sum = 0, n = 0;
    for (var i = 0; i < px.length; i += 4) {
      var r = px[i], g = px[i + 1], b = px[i + 2];
      sum += r + g + b; n++;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var score = (max ? (max - min) / max : 0) * Math.min(1, (max / 255) * 1.4);
      if (score > bestScore) { bestScore = score; best = [r, g, b]; }
    }
    if (!n) return [68, 68, 68];
    if (bestScore < 0.25) {   // monochrome artwork (Netflix black, Apple TV): a soft neutral glow
      var v = Math.round(Math.max(110, Math.min(170, sum / (3 * n))));
      return [v, v, v + 8];
    }
    return best;
  }

  // ---- focus & glass -------------------------------------------------------------------------

  /** quiet: focus put back (boot, return from an app, end of the screensaver) — no YouTube row unasked. */
  function focusTile(i, quiet) {
    if (!items.length) return;
    i = Math.max(0, Math.min(i, items.length - 1));
    setZone('grid');
    if (items[focused]) items[focused].el.classList.remove('focused');
    focused = i;
    items[i].el.classList.add('focused');

    var top = tileTop(i), row = rowOf(i);
    if (row === 0) {
      offset = 0;
    } else {
      // The dock moves up under the app's shelf, then scroll just enough so the glass and name stay visible.
      offset = Math.max(offset, DOCK_TOP - 24 - VIEW_TOP);
      if (top - offset + TILE_H + 70 > VIEW_BOTTOM) offset = top + TILE_H + 70 - VIEW_BOTTOM;
      if (top - offset - 24 < VIEW_TOP) offset = top - 24 - VIEW_TOP;
    }
    stage.style.transform = 'translateY(' + (-offset) + 'px)';
    // Rows that slide up under the app's shelf fade out instead of running into its text.
    items.forEach(function (it, k) { it.el.classList.toggle('above', tileTop(k) - offset < VIEW_TOP - 40); });
    $('dockBand').classList.toggle('above', DOCK_TOP - 28 - offset < VIEW_TOP - 40);
    // Below the dock the header, Hôm nay and weather make way for the focused tile's shelf.
    document.body.classList.toggle('scrolled', row > 0);

    var w = TILE_W * FOCUS_SCALE + 2 * GLASS_PAD, h = TILE_H * FOCUS_SCALE + 2 * GLASS_PAD;
    var x = tileLeft(i) + TILE_W / 2 - w / 2, y = top + TILE_H / 2 - h / 2;
    glass.style.width = w + 'px';
    glass.style.height = h + 'px';
    glass.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (!glassShown) {
      glass.style.transition = 'none';
      void glass.offsetWidth;   // flush the jump before restoring the transition
      glass.style.transition = '';
      glass.style.opacity = '1';
      glassShown = true;
    }

    if (row === 0) { showHero(items[i]); hideShelf(); if (quiet) closeTopShelf(); else scheduleTopShelf(items[i]); }
    else { hideHero(); showShelf(items[i]); closeTopShelf(); topShelf.dismissed = null; }
    setAmbient(items[i].color || [90, 90, 96]);   // the glow follows the focused tile in every row
  }

  function hideGlass() { glassShown = false; glass.style.opacity = '0'; }

  function showHero(item) {
    var label = itemTitle(item);
    hero.style.top = (DOCK_TOP - 28 - 52 - 101 - 30) + 'px';
    var sub = $('heroSub');
    sub.style.top = (DOCK_TOP - 28 - 62) + 'px';
    sub.textContent = itemDesc(item);
    sub.style.opacity = '1';
    if (!heroShown) {
      hero.textContent = label;
      hero.style.transform = 'none';
      hero.style.opacity = '1';
      heroShown = true;
    } else if (hero.textContent !== label) {
      hero.style.opacity = '0';
      hero.style.transform = 'translateX(-24px)';
      clearTimeout(hero.swap);
      hero.swap = setTimeout(function () {
        hero.textContent = label;
        hero.style.transition = 'none';
        hero.style.transform = 'translateX(24px)';
        void hero.offsetWidth;
        hero.style.transition = '';
        hero.style.transform = 'none';
        hero.style.opacity = '1';
      }, 70);
    }
  }

  function hideHero() {
    if (!heroShown) return;
    heroShown = false;
    hero.style.opacity = '0';
    $('heroSub').style.opacity = '0';
  }

  function itemDesc(item) {
    if (item.kind === 'news') return I18n.en ? T('Tin mới nhất từ VnExpress International và BBC · OK để đọc') :
      T('Tin mới nhất từ VnExpress, Thanh Niên và Dân Trí · OK để đọc');
    if (item.kind === 'words') return T('Mỗi ngày một từ mới: phát âm, nghĩa, câu ví dụ · OK để học');
    if (item.kind === 'game') return item.game.desc || '';
    var a = item.app;
    return a.desc ? T(a.desc) : '';   // the catalog's descriptions (apps.js) are in i18n-en.js too
  }

  /** Below the dock the header is gone: the top of the screen names the focused tile, Apple TV style. */
  function showShelf(item) {
    var shelf = $('shelf');
    var title = itemTitle(item), desc = itemDesc(item);
    if (shelf.getAttribute('data-for') === title && shelf.classList.contains('shown')) return;
    shelf.setAttribute('data-for', title);
    shelf.children[0].textContent = title;
    shelf.children[1].textContent = desc;
    shelf.classList.add('shown');
  }

  function hideShelf() { $('shelf').classList.remove('shown'); $('shelf').removeAttribute('data-for'); }

  /** Crossfades the glow to a new colour by swapping between two layers. */
  function setAmbient(color) {
    if (!color) return;
    var key = color.join(',');
    if (key === ambientColor) return;
    ambientColor = key;
    var back = ambients[1 - ambientFront];
    back.style.background = 'radial-gradient(circle 1190px at 32% 42%, rgba(' + key + ',0.3) 0%, rgba(' +
      key + ',0.12) 50%, rgba(' + key + ',0) 100%)';
    back.style.opacity = '1';
    ambients[ambientFront].style.opacity = '0';
    ambientFront = 1 - ambientFront;
  }

  function focusPill(i) {
    setZone('top');
    document.body.classList.remove('scrolled');
    pills[pillFocus].classList.remove('focused');
    pillFocus = Math.max(0, Math.min(i, pills.length - 1));
    pills[pillFocus].classList.add('focused');
  }

  function setZone(z) {
    if (zone === z) return;
    if (z !== 'grid' && z !== 'shelf') closeTopShelf();
    if (zone === 'top') pills[pillFocus].classList.remove('focused');
    if (zone === 'grid') {
      if (items[focused]) items[focused].el.classList.remove('focused');
      hideGlass();
      hideHero();
      hideShelf();
    }
    zone = z;
  }

  /** The pill straight above a dock tile, by horizontal distance. */
  function pillAbove(i) {
    var cx = tileLeft(i) + TILE_W / 2, best = 0, bestD = Infinity;
    pills.forEach(function (p, k) {
      var r = p.getBoundingClientRect();
      var d = Math.abs(r.left + r.width / 2 - cx);
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  function open(item) {
    if (item.kind === 'news') return openNews();
    if (item.kind === 'words') return openWords();
    if (item.kind === 'game') {
      if (!item.game.ready) { toast(T('{0} đang được hoàn thiện, sắp có', item.game.title)); return; }
      try { sessionStorage.setItem('nhaminh.focus', String(items.indexOf(item))); } catch (e) { /* private mode */ }
      location.href = 'games/' + item.game.id + '/index.html';
      return;
    }
    Platform.launch(item.app.id, function () { toast(T('Không mở được {0}', item.app.title)); },
      settings.returnHome ? [item.app.storeId, item.app.id] : null);
  }

  // ---- top shelf: the focused dock app's content, above the dock --------------------------------

  var topShelf = { item: null, data: null, timer: null, index: 0, dismissed: null };
  var SHELF_PITCH = 345;   // card width + gap

  /** Focus resting on a dock tile for a moment opens its shelf; moving on closes it at once. */
  function scheduleTopShelf(item) {
    clearTimeout(topShelf.timer);
    if (topShelf.item === item && topShelf.data) return;
    closeTopShelf();
    if (topShelf.dismissed === item) return;   // closed with ▼: stays shut until focus moves on
    topShelf.dismissed = null;
    topShelf.timer = setTimeout(function () {
      Shelf.content(item, function (data) {
        if (!data || items[focused] !== item || zone !== 'grid' || rowOf(focused) !== 0) return;
        topShelf.item = item;
        topShelf.data = data;
        topShelf.index = 0;
        renderTopShelf();
        document.body.classList.add('shelfOpen');
      });
    }, 650);
  }

  function closeTopShelf() {
    clearTimeout(topShelf.timer);
    document.body.classList.remove('shelfOpen');
    topShelf.item = null;
    topShelf.data = null;
  }

  /**
   * The cards are built once per list and kept: opening the row again only shows it (painting twelve fresh cards
   * cost the TV ~150 ms and made keys lag). Thumbnails load only for the cards about to come on screen.
   */
  function renderTopShelf() {
    var d = topShelf.data, row = $('shelfRow'), strip = row.querySelector('.srCards');
    var hint = row.querySelector('.srHint');
    if (hint) hint.textContent = T('▲  chọn video');
    strip.style.transform = 'none';
    var key = itemTitle(topShelf.item) + '|' + d.cards.map(function (c) { return c.id; }).join(',');
    if (strip.getAttribute('data-key') === key) return;
    strip.setAttribute('data-key', key);
    row.children[0].innerHTML = esc(itemTitle(topShelf.item)) + '<span class="srSrc">' + esc(d.title) + '</span><span class="srHint">' + esc(T('▲  chọn video')) + '</span>';
    strip.innerHTML = '';
    d.cards.forEach(function (c, i) {
      var el = document.createElement('div');
      el.className = 'srCard';
      el.innerHTML = '<div class="srImg"><img></div><div class="srText"></div><div class="srMeta"></div>';
      el.querySelector('img').setAttribute('data-src', c.image);
      el.children[1].textContent = c.title;
      el.children[2].textContent = [c.by, c.when].filter(Boolean).join('  ·  ');
      strip.appendChild(el);
    });
    loadShelfImages(0);
  }

  function loadShelfImages(first) {
    var imgs = $('shelfRow').querySelectorAll('.srCard img');
    for (var i = first; i < Math.min(imgs.length, first + 6); i++) {
      if (!imgs[i].src) imgs[i].src = imgs[i].getAttribute('data-src');
    }
  }

  function focusShelfCard(i) {
    var d = topShelf.data;
    if (!d) return;
    topShelf.index = Math.max(0, Math.min(i, d.cards.length - 1));
    var cards = $('shelfRow').querySelectorAll('.srCard');
    for (var k = 0; k < cards.length; k++) cards[k].classList.toggle('focused', k === topShelf.index);
    var first = Math.max(0, Math.min(topShelf.index - 2, d.cards.length - 5));
    loadShelfImages(first);
    $('shelfRow').querySelector('.srCards').style.transform = 'translateX(' + (-first * SHELF_PITCH) + 'px)';
  }

  function enterShelf() {
    setZone('shelf');
    $('shelfRow').querySelector('.srHint').textContent = T('OK  xem ngay   ·   ▼  quay lại');
    focusShelfCard(topShelf.index);
  }

  /** ▼ or Back from the cards: the row folds away and the dock is back to itself. */
  function leaveShelf() {
    topShelf.dismissed = topShelf.item;
    closeTopShelf();
    zone = 'none';
    focusTile(focused);
  }

  function openShelfCard() {
    var c = topShelf.data.cards[topShelf.index], app = topShelf.item.app;
    Shelf.open(c, app, function () { toast(T('Không mở được video, đang mở YouTube')); },
      settings.returnHome ? [app.storeId, app.id] : null);
  }

  // ---- Tin mới -----------------------------------------------------------------------------------

  var newsList = [], newsFocus = 0;

  function openNews() {
    setZone('news');
    $('newsView').classList.remove('hidden');
    $('nvList').innerHTML = '<p class="dim" style="font-size:24px;color:rgba(255,255,255,.5)">' + esc(T('Đang tải tin…')) + '</p>';
    $('nvStory').innerHTML = '';
    News.load(function (list) {   // stored stories first, then the fresh ones
      var keep = newsList[newsFocus] && newsList[newsFocus].title;
      newsList = list;
      newsFocus = 0;
      list.forEach(function (n, i) { if (n.title === keep) newsFocus = i; });
      if (zone !== 'news') return;
      if (!list.length) { $('nvList').innerHTML = '<p style="font-size:24px">' + esc(T('Chưa tải được tin, kiểm tra mạng.')) + '</p>'; return; }
      $('nvList').innerHTML = list.map(function (n) {
        return '<div class="nvItem">' + (n.image ? '<img src="' + esc(n.image) + '">' : '<i></i>') + '<div><b>' + esc(n.title) + '</b><span>' + esc(n.source) +
          '  ·  ' + esc(News.ago(n.time)) + '</span></div></div>';
      }).join('');
      focusNews(newsFocus);
    });
  }

  function focusNews(i) {
    if (!newsList.length) return;
    newsFocus = Math.max(0, Math.min(i, newsList.length - 1));
    var rows = $('nvList').querySelectorAll('.nvItem');
    for (var k = 0; k < rows.length; k++) rows[k].classList.toggle('focused', k === newsFocus);
    var first = Math.max(0, newsFocus - 3);
    for (var r = 0; r < rows.length; r++) rows[r].style.display = r < first || r > first + 7 ? 'none' : '';
    var n = newsList[newsFocus];
    $('nvStory').innerHTML = (n.image ? '<img src="' + esc(n.image) + '">' : '') + '<h2>' + esc(n.title) + '</h2><p>' +
      esc(clip(n.summary || '', 520)) + '</p><small>' + esc(n.source) + '  ·  ' + esc(News.ago(n.time)) + '</small>';
  }

  function clip(t, max) { return t.length > max ? t.slice(0, max - 3).replace(/\s+\S*$/, '') + '…' : t; }

  function closeNews() {
    $('newsView').classList.add('hidden');
    zone = 'none';
    focusTile(focused, true);
  }

  // ---- Học tiếng Anh: one word at a time, its meanings and sentences, read aloud ----------------------

  var lesson = { list: [], index: 0, entry: null, focus: 0, lines: [] };
  var SPEAKER = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none"/></svg>';

  function openWords() {
    setZone('words');
    $('wordsView').classList.remove('hidden');
    $('wvBody').innerHTML = '<p class="wvWait">' + esc(T('Đang tải từ mới…')) + '</p>';
    $('wvHint').textContent = '';
    Words.today(settings.wordLevel, function (e) {
      Words.history(function (list) {
        learnedCount = list.length;
        if (zone !== 'words') return;
        if (!e) { $('wvBody').innerHTML = '<p class="wvWait">' + esc(T('Chưa tải được từ mới, kiểm tra mạng.')) + '</p>'; return; }
        lesson.list = list;
        lesson.index = list.length - 1;
        for (var i = 0; i < list.length; i++) if (list[i].word === e.word) { lesson.index = i; break; }
        showWord(e);
      });
    });
  }

  /** ◀ ▶ walk through every word learned; past the newest, ▶ fetches one more for today. */
  function goWord(dir) {
    var i = lesson.index + dir;
    if (i < 0 || !lesson.entry) return;
    if (i >= lesson.list.length) {
      $('wvHint').textContent = T('Đang tìm từ mới…');
      return Words.more(settings.wordLevel, function (e) {
        if (!e) { toast(T('Chưa tải được từ mới, kiểm tra mạng.')); return renderWordHint(); }
        Words.history(function (list) {
          lesson.list = list;
          learnedCount = list.length;
          lesson.index = list.length - 1;
          if (zone === 'words') showWord(e);
        });
      });
    }
    lesson.index = i;
    Words.get(lesson.list[i].word, function (e) { if (e && zone === 'words' && lesson.index === i) showWord(e); });
  }

  function whenText(day) {
    var p = day.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var diff = Math.round((new Date(new Date().toDateString()) - d) / 86400000);
    return diff === 0 ? T('Hôm nay') : diff === 1 ? T('Hôm qua') : I18n.dayMonth(d);
  }

  function showWord(e) {
    lesson.entry = e;
    var it = lesson.list[lesson.index] || { day: Words.dayKey(new Date()) }, vi = !I18n.en;
    var lines = [e.word];   // what ▲ ▼ move between and OK reads aloud
    function line(text, inner, cls) {
      lines.push(text);
      return '<div class="' + cls + ' wvLine" data-i="' + (lines.length - 1) + '">' + inner + '</div>';
    }
    function sub(t) { return vi && t ? '<small>' + esc(t) + '</small>' : ''; }
    var html = '<div class="wvLeft">' +
      '<div class="wvWhen">' + esc([whenText(it.day), T('từ thứ {0}', lesson.index + 1), e.topic ? T('chủ đề “{0}”', e.topic) : '']
        .filter(Boolean).join('  ·  ')) + '</div>' +
      '<div class="wvWord wvLine" data-i="0">' + esc(e.word) + '</div>' +
      '<div class="wvIpa">' + esc(e.ipa || '') + SPEAKER + '</div>' +
      (vi && e.meaning ? '<div class="wvMeaning">' + esc(e.meaning) + '</div>' : '') +
      (vi && e.senses.length ? '<div class="wvSenses">' + e.senses.map(function (s) {
        return '<div><b>' + esc(Words.posName(s.pos)) + '</b>' + esc(s.vi.join(', ')) + '</div>';
      }).join('') + '</div>' : '') +
      (e.synonyms.length ? '<div class="wvSyn"><b>' + esc(T('Từ đồng nghĩa')) + '</b>' + esc(e.synonyms.join(', ')) + '</div>' : '') +
      '</div><div class="wvRight"><div class="wvScroll">';
    if (e.defs.length) {
      html += '<h3>' + esc(T('Giải nghĩa')) + '</h3>' + e.defs.slice(0, 3).map(function (d) {
        return '<div class="wvDef"><i>' + esc(Words.posName(d.pos)) + '</i>' + esc(d.en) + sub(d.vi) +
          (d.ex ? line(d.ex, '“' + esc(d.ex) + '”' + sub(d.exVi), 'wvEx') : '') + '</div>';
      }).join('');
    }
    var inDefs = e.defs.map(function (d) { return (d.ex || '').toLowerCase(); });
    var examples = e.examples.filter(function (x) { return inDefs.indexOf(x.en.toLowerCase()) === -1; });
    if (examples.length) {
      html += '<h3>' + esc(T('Câu ví dụ')) + '</h3>' + examples.slice(0, 3).map(function (x) {
        return line(x.en, esc(x.en) + sub(x.vi), 'wvEx wvSentence');
      }).join('');
    }
    $('wvBody').innerHTML = html + '</div></div>';
    lesson.lines = lines;
    focusWordLine(0);
    renderWordHint();
  }

  function renderWordHint() {
    var last = lesson.index >= lesson.list.length - 1;
    $('wvHint').textContent = T('OK  nghe đọc (bấm lần nữa: đọc chậm)  ·  ▲ ▼  chọn câu  ·  ◀ ▶  {0}  ·  Back  đóng',
      last ? T('từ trước / học thêm từ mới') : T('từ trước / từ sau'));
  }

  function focusWordLine(i) {
    lesson.focus = Math.max(0, Math.min(i, lesson.lines.length - 1));
    var els = $('wvBody').querySelectorAll('.wvLine'), on = null;
    for (var k = 0; k < els.length; k++) {
      var hit = Number(els[k].getAttribute('data-i')) === lesson.focus;
      els[k].classList.toggle('focused', hit);
      if (hit) on = els[k];
    }
    // Long entries: the right column slides so the chosen sentence stays in view.
    var col = $('wvBody').querySelector('.wvScroll');
    if (col && on) col.style.transform = 'translateY(' + (on.classList.contains('wvWord') ? 0 : -Math.max(0, on.offsetTop - 420)) + 'px)';
  }

  function closeWords() {
    $('wordsView').classList.add('hidden');
    zone = 'none';
    focusTile(focused, true);
  }

  // ---- top bar -------------------------------------------------------------------------------

  var lastDay = '';
  function updateClock() {
    var now = new Date(), h = now.getHours(), m = now.getMinutes();
    var mm = (m < 10 ? '0' : '') + m;
    var time = settings.clock24 ? h + ':' + mm : ((h % 12) || 12) + ':' + mm;
    $('clock').textContent = time;
    $('ampm').textContent = settings.clock24 ? '' : (h < 12 ? T('SA') : T('CH'));
    $('frClock').textContent = time;

    var day = now.toDateString();
    if (day !== lastDay) {
      lastDay = day;
      events = Events.upcoming(now, { birthdays: C.birthdays || [] });
      var l = Lunar.fromSolar(now.getDate(), now.getMonth() + 1, now.getFullYear());
      $('dateLine').textContent = I18n.dateLine(now);
      $('lunarLine').textContent = T('{0} âm lịch  ·  năm {1}', I18n.lunarShort(l), I18n.yearName(l.year));
      $('frDate').textContent = I18n.weekday(now) + ', ' + I18n.dayMonth(now) + '   ·   ' + T('{0} âm lịch', I18n.lunarShort(l));
    }

    renderEvents();
    var today = events.filter(function (e) { return e.days === 0 && e.kind !== 'moon'; })[0];
    var greet = '';
    for (var k = 0; k < GREETINGS.length; k++) { if (h < GREETINGS[k][0]) { greet = GREETINGS[k][1]; break; } }
    if (today) {
      greet = today.kind === 'birthday' ? T('Chúc mừng sinh nhật {0}', today.person) :
        today.title === 'Tết Nguyên Đán' ? T('Chúc mừng năm mới') : T('Chúc mừng {0}', Events.label(today));
    }
    $('greeting').innerHTML = esc(greet) + ', ' + nameHtml();
    $('frame').classList.toggle('night', !!settings.nightDim && (h >= 23 || h < 6));
  }

  var EVENT_ICONS = {
    lunar: '<svg viewBox="0 0 24 24"><path d="M12 2v2M8 6h8l-1 2a6 6 0 0 1 1 10l-1 2H9l-1-2a6 6 0 0 1 1-10z"/><path d="M12 20v2"/></svg>',
    solar: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
    birthday: '<svg viewBox="0 0 24 24"><path d="M4 21h16v-8H4zM4 16c2 1.5 4 1.5 5.3 0 1.4 1.5 3.4 1.5 4.7 0 1.4 1.5 3.4 1.5 6 0M12 13V9M12 6.5a1.5 1.5 0 0 0 1.5-1.5c0-1-1.5-3-1.5-3s-1.5 2-1.5 3A1.5 1.5 0 0 0 12 6.5z"/></svg>'
  };

  /** The chips under the clock, the photo frame line and nothing else: one list, so they always agree. */
  var eventsKey = '';
  function renderEvents() {
    var row = $('eventsRow');
    var picks = Events.pick(events);
    // One item per day, each kept whole, so the countdowns never run into each other.
    $('frEvents').innerHTML = picks.map(function (e) {
      return '<span><b>' + esc(Events.label(e)) + '</b> ' + esc(Events.countdown(e.days).toLowerCase()) + '</span>';
    }).join('');
    if (!settings.showLunar) { row.style.display = 'none'; return; }
    row.style.display = '';
    var key = picks.map(function (e) { return e.title + e.days; }).join('|');
    if (key === eventsKey) return;
    eventsKey = key;
    row.innerHTML = '';
    picks.forEach(function (e) {
      var chip = document.createElement('div');
      chip.className = 'evChip' + (e.days === 0 ? ' today' : '');
      chip.innerHTML = EVENT_ICONS[e.kind] + '<span class="t"></span><span class="when"></span>';
      chip.children[1].textContent = Events.label(e);
      chip.children[2].textContent = Events.countdown(e.days, true);
      row.appendChild(chip);
    });
  }

  function renderWeather(w) {
    if (!w || w.temp == null || isNaN(w.temp)) return;
    weather = w;
    var d = Weather.describe(w.code), today = w.days && w.days[0];
    $('wxIcon').innerHTML = Weather.icon(d[1], w.isDay);
    $('wxTemp').textContent = w.temp + '°';
    $('wxDesc').textContent = d[0];
    var meta = (today ? T('Cao {0}° · Thấp {1}°', today.max, today.min) : '') + '  ·  ' + T('Ẩm {0}%', w.humidity);
    var raining = /rain|shower|drizzle|storm/.test(d[1]);
    if (w.rainIn != null && !raining) {
      $('wxMeta').innerHTML = '<span class="rain"></span>  ·  ';
      $('wxMeta').children[0].textContent = w.rainIn < 10 ? T('Sắp mưa') : T('Có thể mưa sau ~{0} phút', w.rainIn);
      $('wxMeta').appendChild(document.createTextNode(meta.replace(/^ {2}· {2}/, '')));
    } else {
      $('wxMeta').textContent = meta.replace(/^ {2}· {2}/, '');
    }
    var band = w.aqi != null ? Weather.aqiBand(w.aqi) : null;
    $('wxAir').innerHTML = band ? '<i style="background:' + band.color + '"></i><b>AQI ' + w.aqi + ' · ' + band.label + '</b><span></span>' : '';
    if (band) $('wxAir').children[2].textContent = band.advice;
    var days = $('wxDays');
    days.innerHTML = '';
    (w.days || []).slice(1, 5).forEach(function (day) {
      var el = document.createElement('div');
      el.className = 'wxDay';
      el.innerHTML = '<span></span>' + Weather.icon(Weather.describe(day.code)[1], true) + '<b></b><span></span>';
      el.children[0].textContent = I18n.dow(new Date(day.date + 'T12:00:00').getDay());
      el.children[2].textContent = day.max + '°';
      el.children[3].textContent = day.min + '°';
      days.appendChild(el);
    });
    applyVisibility();

    $('frWeather').innerHTML = Weather.icon(d[1], w.isDay) + '<span></span>' +
      (band ? '<i style="background:' + band.color + '"></i><span></span>' : '');
    $('frWeather').children[1].textContent = w.temp + '°  ' + d[0];
    if (band) $('frWeather').children[3].textContent = 'AQI ' + w.aqi + ' · ' + band.label;
  }

  // ---- inputs dropdown -----------------------------------------------------------------------

  function showInputs() {
    Platform.listInputs(function (inputs) {
      var panel = $('inputsPanel');
      panel.innerHTML = '';
      inputRows = [];
      inputs.forEach(function (inp) {
        var name = (C.inputNames || {})[inp.label];   // "HDMI 1" → "Đầu thu", set in config.js
        addInputRow(panel, ICON_INPUT, name || inp.label, (name ? inp.label + (inp.connected ? ' · ' : '') : '') +
          (inp.connected ? T('Đã kết nối') : ''), function () {
          Platform.setInput(inp, function () { toast(T('Không chuyển được — bấm nút Source trên remote')); });
        });
      });
      if (inputRows.length) panel.appendChild(Object.assign(document.createElement('div'), { className: 'separator' }));
      addInputRow(panel, ICON_LIVETV, T('Truyền hình'), '', function () {
        Platform.watchTv(function () { toast(T('Không mở được truyền hình')); });
      });
      var r = pills[0].getBoundingClientRect();
      panel.style.left = r.left + 'px';
      panel.style.top = (r.bottom + 20) + 'px';
      panel.style.minWidth = Math.max(r.width, 420) + 'px';
      panel.classList.remove('hidden');
      pills[pillFocus].classList.remove('focused');
      zone = 'inputs';
      focusInput(0);
    });
  }

  function addInputRow(panel, icon, label, sub, run) {
    var row = document.createElement('div');
    row.className = 'inputRow';
    row.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + icon + '"/></svg><span></span><span class="sub"></span>';
    row.children[1].textContent = label;
    row.children[2].textContent = sub;
    row.run = run;
    var idx = inputRows.length;
    row.addEventListener('mouseover', function () { focusInput(idx); });
    row.addEventListener('click', function () { hideInputs(); run(); });
    inputRows.push(row);
    panel.appendChild(row);
  }

  function focusInput(i) {
    if (inputRows[inputFocus]) inputRows[inputFocus].classList.remove('focused');
    inputFocus = Math.max(0, Math.min(i, inputRows.length - 1));
    inputRows[inputFocus].classList.add('focused');
  }

  function hideInputs() { $('inputsPanel').classList.add('hidden'); zone = 'none'; focusPill(0); }

  // ---- settings (Apple TV style: pages you drill into, Back to go up) ----------------------------

  function choice(key, label, values, apply) {
    return {
      label: label,
      value: function () {
        for (var i = 0; i < values.length; i++) { if (values[i][0] === settings[key]) return values[i][1]; }
        return values[0][1];
      },
      change: function (dir) {
        var idx = 0;
        for (var i = 0; i < values.length; i++) { if (values[i][0] === settings[key]) idx = i; }
        settings[key] = values[(idx + dir + values.length) % values.length][0];
        saveSettings();
        if (apply) apply();
      }
    };
  }

  function onOff(key, label, apply, words) {
    words = words || [T('Bật'), T('Tắt')];
    return choice(key, label, [[true, words[0]], [false, words[1]]], apply);
  }

  var SHOW = [T('Hiện'), T('Ẩn')];

  var screensaverPage = {
    title: T('Màn hình chờ'),
    rows: function () {
      return [
        choice('screensaverAfter', T('Bật sau'), [[0, T('Không bao giờ')], [1, T('1 phút')], [3, T('3 phút')], [5, T('5 phút')],
          [10, T('10 phút')], [30, T('30 phút')]]),
        choice('photoSource', T('Ảnh'), [['bing', T('Bing mỗi ngày')], ['mix', T('Bing + Wikimedia')]], function () { if (backdrop) backdrop.reload(); }),
        choice('photoInterval', T('Đổi ảnh sau'), [[20, T('20 giây')], [30, T('30 giây')], [60, T('1 phút')], [120, T('2 phút')]]),
        onOff('nightDim', T('Ban đêm tối hơn (23:00–6:00)')),
        { label: T('Xem thử'), run: function () { closeSettings(); enterFrame(); } }
      ];
    }
  };

  var homePage = {
    title: T('Màn hình chính'),
    rows: function () {
      return [
        onOff('returnHome', T('Thoát app thì về đây')),
        choice('closeHidden', T('Đóng app chạy ngầm'), [[5, T('Sau 5 phút')], [15, T('Sau 15 phút')], [0, T('Không')]],
          function () { Platform.setServiceOption('closeAfter', settings.closeHidden); }),
        choice('columns', T('Số ô mỗi hàng'), [[4, T('4 (lớn)')], [5, '5'], [6, T('6 (nhiều app)')]], function () { setGeometry(); loadApps(); }),
        choice('clock24', T('Đồng hồ'), [[true, T('24 giờ')], [false, T('12 giờ')]], updateClockNow),
        choice('wallpaper', T('Hình nền'), [['photo', T('Ảnh đẹp mỗi ngày')], ['mix', T('Ảnh đẹp + ảnh gia đình')], ['family', T('Ảnh gia đình')],
          ['sky', T('Bầu trời theo giờ')], ['black', T('Đen (như Apple TV)')]], applyWallpaper),
        choice('wallpaperEvery', T('Đổi hình nền'), [[5, T('Mỗi 5 phút')], [15, T('Mỗi 15 phút')], [30, T('Mỗi 30 phút')], [60, T('Mỗi giờ')],
          [180, T('Mỗi 3 giờ')], [0, T('Mỗi ngày')]],
          function () { nextWallpaper(); }),
        { label: T('Chọn hình nền'), value: function () { return settings.wallpaperPin ? T('Đang giữ cố định') : ''; },
          run: function () { closeSettings(); openGallery(); } },
        { label: T('Đổi hình nền ngay'), run: function () { unpinQuietly(); nextWallpaper(); toast(T('Đang đổi hình nền')); } },
        onOff('showLunar', T('Âm lịch và ngày lễ'), function () { eventsKey = ''; applyVisibility(); renderEvents(); }, SHOW),
        onOff('showWeather', T('Thời tiết và AQI'), applyVisibility, SHOW),
        onOff('showToday', T('Ngày này năm xưa, câu nói, tin mới'), showToday, SHOW),
        onOff('showMarkets', T('Giá vàng, tỷ giá'), refreshToday, SHOW),
        onOff('showStats', T('CPU và bộ nhớ dưới đồng hồ'), function () { applyVisibility(); updateStats(); }, SHOW),
        { label: T('Sắp xếp ứng dụng như ban đầu'), run: function () { S.set(ORDER_KEY, null); closeSettings(); loadApps(); toast(T('Đã sắp xếp lại')); } }
      ];
    }
  };

  var appsPage = {
    title: T('Ứng dụng'),
    rows: function () {
      return allApps.map(function (a) {
        return {
          label: a.title,
          value: function () { return settings.hiddenApps.indexOf(a.id) === -1 ? T('Hiện') : T('Ẩn'); },
          change: function () {
            var i = settings.hiddenApps.indexOf(a.id);
            if (i === -1) settings.hiddenApps.push(a.id); else settings.hiddenApps.splice(i, 1);
            saveSettings();
            appsChanged = true;
          }
        };
      });
    }
  };

  var weatherPage = {
    title: T('Thời tiết'),
    rows: function () {
      return (C.locations || [C.location]).map(function (loc, i) {
        return {
          label: loc.name,
          value: function () { return settings.location === i ? '✓' : ''; },
          run: function () { settings.location = i; saveSettings(); weatherFeed.refresh(); renderSettings(); toast(T('Thời tiết: {0}', loc.name)); }
        };
      });
    }
  };

  var LEVELS = [['basic', T('Cơ bản')], ['middle', T('Trung cấp')], ['advanced', T('Nâng cao')]];

  var wordsPage = {
    title: T('Học tiếng Anh'),
    rows: function () {
      return [
        onOff('showWords', T('Từ mới mỗi ngày'), function () { appsChanged = true; loadWord(); }, SHOW),
        choice('wordLevel', T('Trình độ'), LEVELS),
        { label: T('Mở Học tiếng Anh'), run: function () { closeSettings(); openWords(); } },
        { label: T('Đã học'), value: function () { return T('{0} từ', learnedCount); }, info: true }
      ];
    }
  };

  // Always in both languages, so whoever set the wrong one can still find the way back.
  var languagePage = {
    title: 'Ngôn ngữ / Language',
    rows: function () {
      return [['auto', T('Theo ngôn ngữ của TV')], ['vi', 'Tiếng Việt'], ['en', 'English']].map(function (o) {
        return {
          label: o[1],
          value: function () { return (settings.language || 'auto') === o[0] ? '✓' : ''; },
          run: function () {
            if ((settings.language || 'auto') === o[0]) return;
            settings.language = o[0];
            saveSettings();
            location.reload();
          }
        };
      });
    }
  };

  var infoPage = {
    title: T('Thông tin'),
    rows: function () {
      var rows = [];
      function info(label, value) { rows.push({ label: label, value: function () { return value; }, info: true }); }
      info(T('Màn hình chính'), familyName() + ' · ' + T('bản {0}', Platform.version()));
      var up = S.get('update', null);
      if (up && up.latest && newer(up.latest, Platform.version())) info(T('Có bản mới {0}', up.latest), T('cài bằng Apps2Samsung (xem README trên GitHub)'));
      var d = deviceInfo;
      if (d.model) info('TV', d.model);
      if (d.firmware) info(T('Phần mềm TV'), d.firmware);
      if (d.network) info(T('Mạng'), d.network);
      if (d.ip) info(T('Địa chỉ IP'), d.ip);
      if (d.storage) info(T('Bộ nhớ trống'), d.storage);
      info(T('Phím tắt'), T('Xanh lá: hình nền · Vàng: màn hình chờ · Xanh dương: cài đặt'));
      info(T('Mở lại / tải lại'), (S.get('resumes', 0) || 0) + ' / ' + (S.get('boots', 0) || 0));
      rows.push({ label: T('Tải lại màn hình chính'), run: function () { location.reload(); } });
      return rows;
    }
  };

  function choiceText(values, v) {
    for (var i = 0; i < values.length; i++) if (values[i][0] === v) return values[i][1];
    return values[0][1];
  }

  var rootPage = {
    title: T('Cài đặt'),
    rows: function () {
      return [
        { label: T('Màn hình chờ'), open: screensaverPage, value: function () {
          return settings.screensaverAfter ? T('Sau {0} phút', settings.screensaverAfter) : T('Tắt');
        } },
        { label: T('Màn hình chính'), open: homePage },
        { label: T('Ứng dụng'), open: appsPage, value: function () { return T('{0} đang hiện', allApps.length - settings.hiddenApps.length); } },
        { label: T('Thời tiết'), open: weatherPage, value: function () { return currentLocation().name; } },
        { label: T('Học tiếng Anh'), open: wordsPage, value: function () {
          return settings.showWords ? choiceText(LEVELS, settings.wordLevel) : T('Tắt');
        } },
        { label: T('Cài đặt bằng điện thoại / máy tính'), value: function () { return T('Tên nhà, thành phố, ảnh'); },
          run: function () { closeSettings(); openSetup(); } },
        { label: 'Ngôn ngữ / Language', open: languagePage, value: function () { return I18n.en ? 'English' : 'Tiếng Việt'; } },
        { label: T('Thông tin'), open: infoPage },
        { label: T('Xem màn hình chờ ngay'), run: function () { closeSettings(); enterFrame(); } },
        { label: T('Cài đặt TV'), value: function () { return T('Hẹn giờ tắt, hình, tiếng'); }, run: function () {
          Platform.openTvSettings(function () { toast(T('Bấm nút Cài đặt (⚙) trên remote để mở cài đặt TV')); });
        } }
      ];
    }
  };

  var settingsStack = [], settingRows = [], appsChanged = false, deviceInfo = {};

  function currentLocation() {
    var list = C.locations || [C.location];
    return list[settings.location] || list[0];
  }

  function renderSettings() {
    var page = settingsStack[settingsStack.length - 1];
    settingRows = page.rows();
    settingFocus = Math.max(0, Math.min(settingFocus, settingRows.length - 1));
    $('settingsTitle').textContent = page.title;
    var list = $('settingsList');
    list.innerHTML = '';
    // Long lists (Ứng dụng) scroll so the focused row stays in view.
    var first = Math.max(0, Math.min(settingFocus - 6, settingRows.length - 10));
    settingRows.slice(first, first + 10).forEach(function (row, k) {
      var i = first + k;
      var el = document.createElement('div');
      el.className = 'inputRow' + (i === settingFocus ? ' focused' : '') + (row.info ? ' info' : '');
      el.innerHTML = '<span class="lbl"></span><span class="' + (row.change ? 'val cycle' : 'val') + '"></span>' +
        (row.open ? '<span class="chev">›</span>' : '');
      el.children[0].textContent = row.label;
      el.children[1].textContent = row.value ? row.value() : '';
      list.appendChild(el);
    });
    $('settingsBack').style.visibility = settingsStack.length > 1 ? 'visible' : 'hidden';
  }

  function openSettings() {
    pills[pillFocus].classList.remove('focused');
    zone = 'settings';
    settingsStack = [rootPage];
    settingFocus = 0;
    appsChanged = false;
    $('settings').classList.remove('hidden');
    loadDeviceInfo();
    renderSettings();
  }

  function loadDeviceInfo() {
    Platform.deviceInfo(function (d) { deviceInfo = d; if (settingsStack.length && settingsStack[settingsStack.length - 1] === infoPage) renderSettings(); });
  }

  function settingsBack() {
    if (settingsStack.length > 1) {
      var leaving = settingsStack.pop();
      var parentRows = settingsStack[settingsStack.length - 1].rows();
      settingFocus = 0;
      parentRows.forEach(function (r, i) { if (r.open === leaving) settingFocus = i; });
      renderSettings();
    } else {
      closeSettings();
    }
  }

  function closeSettings() {
    $('settings').classList.add('hidden');
    zone = 'none';
    if (appsChanged) { appsChanged = false; loadApps(); }
    focusPill(2);
  }

  function settingsKey(k) {
    var row = settingRows[settingFocus];
    if (k === 'up') { settingFocus = Math.max(0, settingFocus - 1); renderSettings(); }
    else if (k === 'down') { settingFocus = Math.min(settingRows.length - 1, settingFocus + 1); renderSettings(); }
    else if (k === 'back' || (k === 'left' && row && !row.change)) settingsBack();
    else if (!row) return;
    else if (row.change && (k === 'left' || k === 'right' || k === 'ok')) { row.change(k === 'left' ? -1 : 1); renderSettings(); }
    else if (k === 'ok' || k === 'right') {
      if (row.open) { settingsStack.push(row.open); settingFocus = 0; renderSettings(); }
      else if (row.run && k === 'ok') row.run();
    }
  }

  // ---- CPU / free storage line (cleanyourtv's show_stats), refreshed only while Home is on screen ----

  function updateStats() {
    var el = $('statsLine');
    if (!settings.showStats || document.hidden || zone === 'frame') return;
    Platform.stats(function (st) {
      var parts = [];
      if (st.cpu != null) parts.push('CPU ' + st.cpu + '%');
      if (st.storage) parts.push(T('Trống {0}', st.storage));
      el.textContent = parts.join('  ·  ');
    });
  }
  setInterval(updateStats, 10000);

  function applyVisibility() {
    $('statsLine').style.display = settings.showStats ? '' : 'none';
    $('lunarLine').style.display = settings.showLunar ? '' : 'none';
    $('wxWidget').classList.toggle('hidden', !settings.showWeather || !weather);
  }

  function updateClockNow() { lastDay = ''; updateClock(); }

  // ---- "Hôm nay" block: on this day · a saying · the latest news, rotating every 15 s ------------

  var todayItems = [], todayIndex = 0, history = [], news = [], markets = null, word = null, learnedCount = 0;

  function refreshToday() {
    var now = new Date();
    History.load(now, function (items) { history = items; buildToday(); });
    News.load(function (items) { news = items; buildToday(); });
    if (settings.showMarkets) Markets.load(function (m) { markets = m; buildToday(); });
    Quotes.load();
    loadWord();
    buildToday();
  }

  /** Today's English word, for the Hôm nay block and the screensaver (chosen and fetched once a day). */
  function loadWord() {
    if (!settings.showWords) { word = null; renderFrameWord(); return buildToday(); }
    Words.today(settings.wordLevel, function (e) { word = e; buildToday(); renderFrameWord(); });
    Words.history(function (list) { learnedCount = list.length; });
  }

  function wordPos(e) { return e.senses.length ? e.senses[0].pos : e.defs.length ? e.defs[0].pos : ''; }

  /** "kitchen  /ˈkɪtʃən/  (n): nhà bếp" — in English the meaning is the first definition. */
  function wordLine(e, withMeaning) {
    var pos = wordPos(e), mean = I18n.en ? (e.defs[0] ? e.defs[0].en : '') : e.meaning || (e.defs[0] && e.defs[0].vi) || '';
    return e.word + (e.ipa ? '  ' + e.ipa : '') + (pos ? '  (' + Words.posShort(pos) + ')' : '') + (withMeaning && mean ? ': ' + mean : '');
  }

  function buildToday() {
    var now = new Date();
    // Sayings are drawn when shown, so each round brings a new one.
    var quotes = [0, 1, 2].map(function () { return { label: T('Câu nói hay'), quote: true }; });
    var past = [], fresh = [];
    var events = history.filter(function (h) { return h.kind === 'event'; });
    var births = history.filter(function (h) { return h.kind === 'birth'; });
    // A different event each time the block comes round, and now and then someone born today.
    for (var i = 0; i < Math.min(3, events.length); i++) {
      var e = events[(i * 3 + now.getHours()) % events.length];
      past.push({ label: T('Ngày này năm xưa · {0}', e.year), text: e.text, meta: T('{0} năm trước', now.getFullYear() - e.year) });
    }
    if (births.length) {
      var b = births[now.getHours() % births.length];
      past.push({ label: T('Sinh ngày này · {0}', b.year), text: b.text, meta: '' });
    }
    news.slice(0, 3).forEach(function (n) { fresh.push({ label: T('Tin mới · {0}', n.source), text: n.title, meta: News.ago(n.time) }); });
    var lesson = [];
    if (word) {
      // A definition's own sentence first: it shows the meaning on screen; the extra sentences can be fragments.
      var ex = word.defs.filter(function (d) { return d.ex; }).map(function (d) { return { en: d.ex }; })[0] || word.examples[0];
      lesson.push({ label: T('Từ tiếng Anh hôm nay'), text: wordLine(word, true), meta: ex ? '“' + ex.en + '”' : '' });
    }
    // Interleave so the saying, history, news, the English word and gold / exchange rate alternate.
    todayItems = [];
    var groups = [quotes, past, fresh, lesson, settings.showMarkets ? Markets.cards(markets) : []];
    for (var k = 0; k < 6; k++) groups.forEach(function (g) { if (g[k]) todayItems.push(g[k]); });
    if (!$('today').classList.contains('shown')) showToday();
  }

  function showToday() {
    var el = $('today');
    if (!settings.showToday || !todayItems.length) { el.classList.remove('shown'); return; }
    var it = todayItems[todayIndex % todayItems.length];
    if (it.quote) { var q = Quotes.next(); it = { label: it.label, text: '“' + q.text + '”', meta: q.by }; }
    el.classList.remove('shown');
    setTimeout(function () {
      el.children[0].textContent = it.label;
      el.children[1].textContent = it.text;
      el.children[2].textContent = it.meta || '';
      el.classList.add('shown');
    }, el.textContent ? 600 : 0);
  }

  setInterval(function () {
    if (document.hidden || zone === 'frame' || document.body.classList.contains('scrolled')) return;
    todayIndex++;
    showToday();
  }, 15000);
  setInterval(refreshToday, 30 * 60000);

  /** The screensaver's saying changes every minute too. */
  function nextFrameQuote() {
    var q = Quotes.next();
    $('frQuote').textContent = '“' + q.text + '” — ' + q.by;
  }

  /** The English word of the day, small, under the screensaver's saying. */
  function renderFrameWord() { $('frWord').textContent = word ? T('Từ hôm nay: {0}', wordLine(word, true)) : ''; }
  setInterval(function () { if (zone === 'frame') nextFrameQuote(); }, 60000);

  // ---- wallpaper -------------------------------------------------------------------------------

  var walls = [$('wallA'), $('wallB')], wallFront = 0, wallPool = [], wallIndex = -1, wallAt = 0, wallLoading = false;
  var wallMode = '', wallUrl = '', hideTimer = null, firstWallMs = 0;
  var WALL_KEY = 'wall';   // {url, at, mode}: the photo on screen and when it came, kept across restarts

  function familyPool() {
    return (C.familyPhotos || []).map(function (url) { return { url: url, title: familyName(), date: '0000-00-00' }; });
  }

  /** Photos for the current mode: Bing ('photo'), the family's own ('family'), or two Bing then one family ('mix'). */
  function buildPool(cb) {
    var mode = settings.wallpaper, fam = familyPool();
    if (mode === 'family') return cb(fam);
    Backdrop.pool('bing', function (bing) {
      // A fixed order (newest first), so after a restart "the next photo" is the one after the last shown.
      bing = bing.slice().sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.url < b.url ? -1 : 1); });
      if (mode !== 'mix' || !fam.length) return cb(bing.length ? bing : fam);
      var out = [], f = 0;
      bing.forEach(function (p, i) { out.push(p); if (i % 2 === 1) out.push(fam[f++ % fam.length]); });
      cb(out);
    });
  }

  function indexOfUrl(url) {
    for (var i = 0; i < wallPool.length; i++) if (wallPool[i].url === url) return i;
    return -1;
  }

  function setPool(pool) {
    if (!pool.length) return;
    wallPool = pool;
    wallIndex = indexOfUrl(wallUrl);
  }

  /** Crossfade to the back canvas. Only one canvas is laid out except during the fade (GPU memory). */
  function swapWalls() {
    var back = walls[1 - wallFront], front = walls[wallFront];
    clearTimeout(hideTimer);
    back.style.display = 'block';   // overrides the stylesheet's #wallB { display: none }
    void back.offsetWidth;
    back.classList.add('shown');
    front.classList.remove('shown');
    wallFront = 1 - wallFront;
    hideTimer = setTimeout(function () { front.style.display = 'none'; }, 1800);
  }

  /**
   * Put a photo up: from the TV's own cache when it has it (instant, no network), decoded before the crossfade
   * so the fade never stutters. keepTime: the photo was already up before a restart, its time still counts.
   */
  function showPhoto(url, keepTime, onFail) {
    if (wallLoading) return;
    wallLoading = true;
    ImageCache.load(url, function (src, cached) {
      var img = new Image();
      if (!cached && /^https?:/.test(src)) img.crossOrigin = 'anonymous';
      img.onload = function () {
        function go() {
          wallLoading = false;
          if (!firstWallMs) firstWallMs = Math.round(performance.now());
          paintWallpaper(walls[1 - wallFront], img);
          ImageCache.done(src);
          swapWalls();
          document.body.classList.add('photoWall');
          hidePreview();
          wallUrl = url;
          wallIndex = indexOfUrl(url);
          if (!keepTime) wallAt = Date.now();
          S.set(WALL_KEY, { url: url, at: wallAt, mode: settings.wallpaper });
          // The photo after this one goes into the cache now, while nothing else is happening.
          var next = wallPool.length ? wallPool[(wallIndex + 1) % wallPool.length] : null;
          if (next) setTimeout(function () { idle(function () { ImageCache.warm(next.url); }); }, 5000);
          setTimeout(function () { idle(saveThumb); }, 2500);
        }
        if (img.decode) img.decode().then(go, go); else go();
      };
      img.onerror = function () { wallLoading = false; ImageCache.done(src); if (onFail) onFail(); };
      img.src = src;
    });
  }

  /** The tiny copy for the next start (index.html paints it before any script runs). */
  function saveThumb() {
    try {
      var c = document.createElement('canvas');
      c.width = 64;
      c.height = 36;
      c.getContext('2d').drawImage(walls[wallFront], 0, 0, 64, 36);
      S.set('wallThumb', c.toDataURL('image/jpeg', 0.8));
    } catch (e) { /* a tainted canvas or full storage: start without it */ }
  }

  /** Once the real photo has faded in, the preview layer goes (one less full-screen layer for the GPU). */
  function hidePreview() {
    var pre = $('wallPre');
    if (pre.style.display !== 'none') setTimeout(function () { pre.style.display = 'none'; }, 1800);
  }

  function showWallpaper(i, keepTime, tries) {
    if (!wallPool.length) return;
    var n = wallPool.length, k = ((i % n) + n) % n;
    tries = tries || 0;
    showPhoto(wallPool[k].url, keepTime, function () { if (tries < 3) showWallpaper(k + 1, false, tries + 1); });   // offline: skip it
  }

  function nextWallpaper() { showWallpaper(wallIndex + 1); }

  function applyWallpaper() {
    var mode = settings.wallpaper, booting = !wallMode, changed = mode !== wallMode;
    wallMode = mode;
    document.body.classList.toggle('blackWall', mode === 'black');
    if (mode === 'sky') { if (changed) skyHour = -1; paintSky(); hidePreview(); return; }
    if (mode === 'black') {
      $('wallPre').style.display = 'none';
      walls.forEach(function (w) { w.classList.remove('shown'); });
      document.body.classList.remove('photoWall');
      return;
    }
    if (!changed && walls[wallFront].classList.contains('shown')) return buildPool(setPool);

    if (settings.wallpaperPin) {   // a photo kept from the gallery: it stays, whatever the time
      var kept = S.get(WALL_KEY, null);
      if (kept) wallAt = kept.at || 0;   // un-keep later and the usual clock carries on from here
      wallUrl = settings.wallpaperPin;
      buildPool(setPool);
      return showPhoto(settings.wallpaperPin, true);
    }
    // Starting up: the last photo and its time come back from storage, so the clock keeps running across restarts.
    var saved = booting ? S.get(WALL_KEY, null) : null, gotPool = false, early = false;
    if (saved && saved.mode === mode && saved.url) { wallAt = saved.at || 0; wallUrl = saved.url; } else saved = null;
    buildPool(function (pool) {
      gotPool = true;
      setPool(pool);
      if (early) { if (wallpaperDue()) nextWallpaper(); return; }   // the saved photo is already on its way
      if (!saved || wallIndex === -1) return showWallpaper(0);
      if (wallpaperDue()) showWallpaper(wallIndex + 1); else showWallpaper(wallIndex, true);
    });
    // The photo list is being refreshed from the network (a new day): show the saved photo from the cache meanwhile.
    if (!gotPool && saved) { early = true; showPhoto(saved.url, true); }
  }

  // Bầu trời: the colour of the sky at this hour, painted once per hour (cleanyourtv's Sky theme, but still).
  var SKIES = [
    [5, ['#04060f', '#0a1230', '#1a1e48']],     // night
    [7, ['#1b2346', '#9a5a78', '#f2a477']],     // dawn
    [16, ['#1d5fc4', '#5ea3f2', '#bfdcf8']],    // day
    [19, ['#24285a', '#a2536e', '#f0a05a']],    // sunset
    [22, ['#0b1030', '#2f2558', '#62406c']],    // evening
    [24, ['#04060f', '#0a1230', '#1a1e48']]
  ];
  var skyHour = -1;

  function paintSky() {
    var h = new Date().getHours();
    if (h === skyHour && walls[wallFront].classList.contains('shown')) return;
    skyHour = h;
    var stops = SKIES.filter(function (s) { return h < s[0]; })[0][1];
    var back = walls[1 - wallFront], g = back.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 1080);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.55, stops[1]);
    grad.addColorStop(1, stops[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1920, 1080);
    if (h >= 19 || h < 6) {   // a few stars
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (var i = 0; i < 140; i++) {
        var x = (i * 9301 + 49297) % 1920, y = ((i * 7907) % 620), r = (i % 5 === 0) ? 1.6 : 0.9;
        g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      }
    }
    var shade = g.createLinearGradient(0, 0, 0, 1080);   // the same darkening as photos, for the dock
    shade.addColorStop(0, 'rgba(0,0,0,0.25)');
    shade.addColorStop(0.6, 'rgba(0,0,0,0.1)');
    shade.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = shade;
    g.fillRect(0, 0, 1920, 1080);
    swapWalls();
    document.body.classList.add('photoWall');
  }

  /** The photo, cover-fitted, with the darkening for the clock (top) and the dock (bottom) baked in. */
  function paintWallpaper(canvas, img) {
    var g = canvas.getContext('2d');
    var s = Math.max(1920 / img.naturalWidth, 1080 / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    g.drawImage(img, (1920 - w) / 2, (1080 - h) / 2, w, h);
    var grad = g.createLinearGradient(0, 0, 0, 1080);
    grad.addColorStop(0, 'rgba(0,0,0,0.66)');
    grad.addColorStop(0.2, 'rgba(0,0,0,0.32)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.12)');
    grad.addColorStop(0.68, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1920, 1080);
  }

  /**
   * Time for another photo? Measured from the last change (stored), so it holds across apps, the screensaver,
   * the TV sleeping and restarts: turn the TV on after an hour and a new photo is waiting.
   */
  function wallpaperDue() {
    var every = settings.wallpaperEvery, mode = settings.wallpaper;
    if (settings.wallpaperPin) return false;   // kept on purpose (Thư viện hình nền)
    if (mode !== 'photo' && mode !== 'mix' && mode !== 'family') return false;
    if (!every) return Backdrop.isoDate(new Date(wallAt)) !== Backdrop.isoDate(new Date());   // "Mỗi ngày"
    return Date.now() - wallAt >= every * 60000;
  }

  function refreshWallpaperIfDue() {
    if (!wallpaperDue()) return;
    if (!settings.wallpaperEvery && wallIndex !== 0) showWallpaper(0);   // daily: today's photo first
    else nextWallpaper();
  }

  // A new photo every few minutes, but not while keys are being pressed: a crossfade mid-navigation would stutter.
  setInterval(function () {
    if (settings.wallpaper === 'sky' && !document.hidden) { paintSky(); return; }
    if (zone === 'frame' || document.hidden || Date.now() - lastInput < 5000) return;
    refreshWallpaperIfDue();
  }, 10000);
  setInterval(function () { buildPool(setPool); }, 3 * 3600000);

  // ---- Thư viện hình nền: every photo on hand; OK → use it for now, or keep it ----------------------

  var gallery = { list: [], focus: 0, menu: null, menuFocus: 0 };
  var GL_COLS = 4, GL_ROW = 293;   // a thumbnail with its caption, in px

  function everyText() {
    var m = settings.wallpaperEvery;
    return !m ? T('mỗi ngày') : m % 60 === 0 ? (m === 60 ? T('mỗi giờ') : T('mỗi {0} giờ', m / 60)) : T('mỗi {0} phút', m);
  }

  /** Bing's own 640×360 copy for the grid (42 KB instead of 400). */
  function thumbOf(url) { return /bing\.com\/th\?id=/.test(url) ? url.replace('_1920x1080.jpg', '_640x360.jpg') : url; }

  function openGallery() {
    Backdrop.pool('bing', function (bing) {
      bing = bing.slice().sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.url < b.url ? -1 : 1); });
      gallery.list = bing.concat(familyPool());
      var cur = -1;
      gallery.list.forEach(function (p, i) { if (p.url === wallUrl) cur = i; });
      gallery.focus = Math.max(0, cur);
      gallery.menu = null;
      renderGallery();
      pills.forEach(function (el) { el.classList.remove('focused'); });
      $('gallery').classList.remove('hidden');
      zone = 'gallery';
    });
  }

  function captionOf(p) {
    if (p.date === '0000-00-00') return T('Ảnh gia đình');
    var t = Backdrop.caption(p).split(' (©')[0];
    return (p.date ? p.date.slice(8, 10) + '/' + p.date.slice(5, 7) + '  ·  ' : '') + t;
  }

  function renderGallery() {
    $('gallery').querySelector('.glSub').textContent = settings.wallpaperPin ?
      T('Đang giữ cố định một ảnh  ·  OK để đổi hoặc bỏ cố định  ·  Back để đóng') :
      T('{0} ảnh, tự đổi {1}  ·  OK để chọn  ·  Back để đóng', gallery.list.length, everyText());
    $('glGrid').innerHTML = gallery.list.map(function (p) {
      var badge = p.url === settings.wallpaperPin ? T('Cố định') : p.url === wallUrl ? T('Đang dùng') : '';
      return '<div class="glItem"><div class="glImg"><img data-src="' + esc(thumbOf(p.url)) + '">' +
        (badge ? '<span class="glBadge">' + badge + '</span>' : '') + '</div><div class="glCap">' + esc(captionOf(p)) + '</div></div>';
    }).join('');
    focusGallery(gallery.focus);
  }

  function focusGallery(i) {
    gallery.focus = Math.max(0, Math.min(i, gallery.list.length - 1));
    var els = $('glGrid').children;
    for (var k = 0; k < els.length; k++) els[k].classList.toggle('focused', k === gallery.focus);
    var row = Math.floor(gallery.focus / GL_COLS), rows = Math.ceil(gallery.list.length / GL_COLS);
    var top = Math.max(0, Math.min(row - 1, rows - 3));   // three rows on screen, the focused one never at the edge
    $('glGrid').style.transform = 'translateY(' + (-top * GL_ROW) + 'px)';
    // Thumbnails load as their rows come near: a hundred at once would choke the TV.
    for (var r = Math.max(0, top - 1) * GL_COLS; r < Math.min(els.length, (top + 4) * GL_COLS); r++) {
      var img = els[r].querySelector('img');
      if (img.src || img.getAttribute('data-loading')) continue;
      img.setAttribute('data-loading', '1');
      (function (el) { Profile.photoUrl(el.getAttribute('data-src'), function (u) { if (u) el.src = u; }); })(img);
    }
  }

  function galleryMenu() {
    var p = gallery.list[gallery.focus], rows = [
      { label: T('Dùng ảnh này'), sub: T('đến hạn vẫn tự đổi'), run: function () { useWallpaper(p, false); } },
      { label: T('Giữ cố định ảnh này'), sub: T('không tự đổi nữa'), run: function () { useWallpaper(p, true); } }
    ];
    if (settings.wallpaperPin) rows.push({ label: T('Bỏ cố định'), sub: T('tự đổi lại như cũ'), run: function () {
      settings.wallpaperPin = '';
      saveSettings();
      closeGallery();
      toast(T('Hình nền sẽ tự đổi lại'));
    } });
    gallery.menu = rows;
    gallery.menuFocus = 0;
    renderGalleryMenu();
    $('glMenu').classList.remove('hidden');
  }

  function renderGalleryMenu() {
    $('glMenu').innerHTML = gallery.menu.map(function (r, i) {
      return '<div class="inputRow' + (i === gallery.menuFocus ? ' focused' : '') + '"><span>' + esc(r.label) +
        '</span><span class="sub">' + esc(r.sub) + '</span></div>';
    }).join('');
  }

  function useWallpaper(p, keep) {
    settings.wallpaperPin = keep ? p.url : '';
    if (settings.wallpaper === 'sky' || settings.wallpaper === 'black') settings.wallpaper = 'photo';
    saveSettings();
    closeGallery();
    if (settings.wallpaper !== wallMode) {   // from Bầu trời / Đen back to photos
      wallMode = settings.wallpaper;
      document.body.classList.remove('blackWall');
      buildPool(setPool);
    }
    if (p.url !== wallUrl) showPhoto(p.url, false); else { wallAt = Date.now(); S.set(WALL_KEY, { url: p.url, at: wallAt, mode: settings.wallpaper }); }
    toast(keep ? T('Đã giữ cố định hình nền này') : T('Đã đổi hình nền  ·  tự đổi {0}', everyText()));
  }

  /** Changing the photo on purpose (green key, "Đổi hình nền ngay") ends a pin. */
  function unpinQuietly() {
    if (!settings.wallpaperPin) return;
    settings.wallpaperPin = '';
    saveSettings();
  }

  function closeGallery() {
    $('gallery').classList.add('hidden');
    $('glMenu').classList.add('hidden');
    $('glGrid').innerHTML = '';   // let the thumbnails go
    gallery.menu = null;
    zone = 'none';
    focusTile(focused, true);
  }

  function galleryKey(k) {
    if (gallery.menu) {
      if (k === 'up') { gallery.menuFocus = Math.max(0, gallery.menuFocus - 1); renderGalleryMenu(); }
      else if (k === 'down') { gallery.menuFocus = Math.min(gallery.menu.length - 1, gallery.menuFocus + 1); renderGalleryMenu(); }
      else if (k === 'ok') gallery.menu[gallery.menuFocus].run();
      else if (k === 'back' || k === 'left') { gallery.menu = null; $('glMenu').classList.add('hidden'); }
      return;
    }
    var col = gallery.focus % GL_COLS;
    if (k === 'left') { if (col > 0) focusGallery(gallery.focus - 1); }
    else if (k === 'right') { if (col < GL_COLS - 1) focusGallery(gallery.focus + 1); }
    else if (k === 'up') focusGallery(gallery.focus - GL_COLS);
    else if (k === 'down') { if (gallery.focus + GL_COLS < gallery.list.length) focusGallery(gallery.focus + GL_COLS); else focusGallery(gallery.list.length - 1); }
    else if (k === 'ok') galleryMenu();
    else if (k === 'back') closeGallery();
  }

  // ---- a newer release on GitHub? Asked once a day ------------------------------------------------------------

  /** "1.10.0" is newer than "1.9.2"; anything that is not a version number is not. */
  function newer(a, b) {
    var x = String(a).replace(/^v/, '').split('.'), y = String(b).replace(/^v/, '').split('.');
    for (var i = 0; i < 3; i++) {
      var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0);
      if (d) return d > 0 && !isNaN(parseInt(x[0], 10));
    }
    return false;
  }

  function checkUpdate() {
    var up = S.get('update', null);
    if (!C.repo || (up && Date.now() - up.at < 86400000)) return;
    Platform.getJSON('https://api.github.com/repos/' + C.repo + '/releases/latest', function (err, data) {
      if (err || !data || !data.tag_name) return;
      S.set('update', { at: Date.now(), latest: String(data.tag_name).replace(/^v/, '') });
    });
  }

  // ---- Cài đặt bằng điện thoại / máy tính ------------------------------------------------------------
  // The page itself is served by the background service (app/service/setup.html); what the phone sends waits there
  // until this screen takes it (Profile.sync), then the app reloads to use it everywhere.

  var setupTimer = null, setupReload = false;

  function drawQr(canvas, text) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount(), ctx = canvas.getContext('2d'), cell = Math.floor(canvas.width / (n + 4)),
      off = Math.floor((canvas.width - cell * n) / 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
  }

  function openSetup() {
    pills.forEach(function (el) { el.classList.remove('focused'); });
    zone = 'setup';
    $('spPin').textContent = Profile.pin().replace(/(\d{3})(\d{3})/, '$1 $2');
    $('spGot').textContent = T('Đặt được tên nhà, thành phố, ảnh gia đình, ảnh avatar và sinh nhật.');
    $('setupPanel').classList.remove('hidden');
    Profile.publish();
    Platform.network(function (n) {
      var url = 'http://' + (n.ip || '<IP TV>') + ':8701/';
      $('spUrl').textContent = url;
      try { drawQr($('spQr'), url); } catch (e) { /* no QR: the link is there */ }
    });
    clearInterval(setupTimer);
    setupTimer = setInterval(syncProfile, 3000);
  }

  function closeSetup() {
    clearInterval(setupTimer);
    $('setupPanel').classList.add('hidden');
    zone = 'none';
    if (setupReload) return location.reload();
    focusTile(focused, true);
  }

  /** What the phone sent: shown on the setup screen, applied by reloading (now, or when the screen closes). */
  function syncProfile() {
    Profile.sync(function (got) {
      if (!got.length) return;
      var text = T('Đã nhận: {0}', got.filter(function (g, i) { return got.indexOf(g) === i; }).join(', '));
      setupReload = true;
      if (zone === 'setup') { $('spGot').textContent = text + '. ' + T('Back để áp dụng.'); return; }
      toast(text);
      setTimeout(function () { if (zone !== 'setup') location.reload(); }, 1800);
    });
  }

  // For tools/inspect.js: why did (or didn't) the wallpaper change?
  root.NhaMinhDebug = {
    wall: function () {
      return { mode: settings.wallpaper, every: settings.wallpaperEvery, pool: wallPool.length, index: wallIndex,
        loading: wallLoading, sinceChangeS: Math.round((Date.now() - wallAt) / 1000),
        sinceKeyS: Math.round((Date.now() - lastInput) / 1000), zone: zone, hidden: document.hidden,
        front: walls[wallFront].id, url: wallUrl, firstShownMs: firstWallMs };
    },
    wallDueNow: function () { wallAt = 0; }
  };

  // ---- screensaver (Khung ảnh) ----------------------------------------------------------------

  var backdrop = null, frameDrift = null, zoneBeforeFrame = 'grid';

  function enterFrame() {
    if (zone === 'frame') return;
    if (editing) finishEdit(false);
    zoneBeforeFrame = zone === 'top' ? 'top' : 'grid';
    closePanels();
    nextFrameQuote();
    setZone('frame');
    $('frame').classList.remove('hidden');
    Platform.setTvScreenSaver(false);
    if (!backdrop) {
      backdrop = Backdrop.create({
        layers: [$('photoA'), $('photoB')],
        source: function () { return settings.photoSource; },
        interval: function () { return settings.photoInterval; },
        motion: function () { return false; },   // a zooming 1920×1080 layer leaves black tiles on this TV
        extra: (C.familyPhotos || []).map(function (url) {
          return { url: url, title: familyName(), credit: '', date: '0000-00-00', source: '' };
        }),
        onPhoto: function (p) { $('frCaption').innerHTML = nameHtml([Backdrop.caption(p), p.credit].filter(Boolean).join('  ·  ')); }
      });
      backdrop.start();
    } else {
      backdrop.next();
    }
    drift();
    frameDrift = setInterval(drift, 60000);
  }

  /** The clock wanders a little every minute so nothing sits still on the panel. */
  function drift() {
    $('frameBlock').style.transform = 'translate(' + Math.round(Math.random() * 80) + 'px,' + Math.round(-Math.random() * 50) + 'px)';
  }

  function exitFrame() {
    clearInterval(frameDrift);
    if (backdrop) backdrop.stop();
    $('frame').classList.add('hidden');
    Platform.setTvScreenSaver(true);
    zone = 'none';
    if (zoneBeforeFrame === 'top') focusPill(pillFocus); else focusTile(focused, true);
    setTimeout(function () { idle(refreshWallpaperIfDue, { timeout: 2000 }); }, 700);
  }

  setInterval(function () {
    var mins = settings.screensaverAfter;
    if (mins && ['frame', 'calendar', 'news', 'words', 'gallery', 'setup'].indexOf(zone) === -1 && !document.hidden &&
      Date.now() - lastInput > mins * 60000) enterFrame();
  }, 5000);

  // ---- rearranging ---------------------------------------------------------------------------

  /** Hold OK on a tile: it wiggles, the arrows move it, OK places it, Back puts everything back. */
  function startEdit() {
    var it = items[focused];
    if (!it) return;
    editing = { item: it, snapshot: items.slice() };
    it.el.classList.add('moving');
    document.body.classList.add('editing');
    toast(T('Mũi tên để di chuyển  ·  OK để đặt  ·  Back để hủy'));
  }

  function moveTo(to) {
    if (to < 0 || to >= items.length || to === focused) return;
    items.splice(to, 0, items.splice(focused, 1)[0]);
    focused = to;
    layout();
    focusTile(to);
  }

  function finishEdit(keep) {
    var it = editing.item;
    if (!keep) {
      items = editing.snapshot;
      layout();
    }
    editing = null;
    it.el.classList.remove('moving');
    document.body.classList.remove('editing');
    if (keep) saveOrder();
    focused = items.indexOf(it);
    focusTile(focused);
  }

  // ---- keys ----------------------------------------------------------------------------------

  var okDown = false, okTimer = null;

  Input.on(function (k, phase) {
    lastInput = Date.now();

    if (zone === 'frame') {   // any key wakes the home screen, and is not passed on
      if (phase === 'down') exitFrame();
      return;
    }

    // On tiles OK acts on release, so a held OK can start rearranging instead of opening the app.
    if (phase === 'up') {
      if (k !== 'ok') return;
      okDown = false;
      if (!okTimer) return;
      clearTimeout(okTimer);
      okTimer = null;
      if (zone === 'grid' && items[focused] && !editing) open(items[focused]);
      return;
    }
    if (k === 'ok' && (okDown || phase === 'repeat')) return;   // key repeat while held
    if (k === 'ok') okDown = true;

    if (zone === 'calendar') { Calendar.key(k); return; }
    if (zone === 'gallery') { galleryKey(k); return; }
    if (zone === 'setup') { if (k === 'back' || k === 'ok') closeSetup(); return; }
    if (!editing && k === 'green' && (zone === 'grid' || zone === 'top' || zone === 'none')) { unpinQuietly(); nextWallpaper(); return; }
    if (!editing && (k === 'yellow' || k === 'playpause' || k === 'play')) { enterFrame(); return; }
    if (!editing && k === 'blue') { if (zone === 'settings') closeSettings(); else { closePanels(); openSettings(); } return; }

    if (editing) {
      if (k === 'left') moveTo(focused - 1);
      else if (k === 'right') moveTo(focused + 1);
      else if (k === 'up') moveTo(focused - COLUMNS);
      else if (k === 'down') moveTo(Math.min(focused + COLUMNS, items.length - 1));
      else if (k === 'ok') finishEdit(true);
      else if (k === 'back') finishEdit(false);
    } else if (zone === 'settings') {
      settingsKey(k);
    } else if (zone === 'inputs') {
      if (k === 'up') focusInput(inputFocus - 1);
      else if (k === 'down') focusInput(inputFocus + 1);
      else if (k === 'ok') { var row = inputRows[inputFocus]; hideInputs(); row.run(); }
      else if (k === 'back' || k === 'left' || k === 'right') hideInputs();
    } else if (zone === 'shelf') {
      if (k === 'left') focusShelfCard(topShelf.index - 1);
      else if (k === 'right') focusShelfCard(topShelf.index + 1);
      else if (k === 'down' || k === 'back') leaveShelf();
      else if (k === 'up') { closeTopShelf(); focusPill(pillAbove(focused)); }
      else if (k === 'ok') openShelfCard();
    } else if (zone === 'news') {
      if (k === 'up') focusNews(newsFocus - 1);
      else if (k === 'down') focusNews(newsFocus + 1);
      else if (k === 'back' || k === 'left') closeNews();
    } else if (zone === 'words') {
      if (k === 'up') focusWordLine(lesson.focus - 1);
      else if (k === 'down') focusWordLine(lesson.focus + 1);
      else if (k === 'left') goWord(-1);
      else if (k === 'right') goWord(1);
      else if (k === 'ok') { if (lesson.lines.length) Words.speak(lesson.lines[lesson.focus]); }
      else if (k === 'back') closeWords();
    } else if (zone === 'top') {
      if (k === 'left') focusPill(pillFocus - 1);
      else if (k === 'right') focusPill(pillFocus + 1);
      else if (k === 'down') focusTile(rowOf(focused) === 0 ? focused : 0);
      else if (k === 'ok') activatePill(pillFocus);
      else if (k === 'back') focusTile(0);
    } else {
      var col = focused % COLUMNS, last = items.length - 1;
      if (k === 'left') { if (col > 0) focusTile(focused - 1); }
      else if (k === 'right') { if (col < COLUMNS - 1 && focused < last) focusTile(focused + 1); }
      else if (k === 'up') {
        if (rowOf(focused) === 0) {
          if (topShelf.data && topShelf.item === items[focused]) enterShelf();
          else { closeTopShelf(); focusPill(pillAbove(focused)); }
        } else focusTile(focused - COLUMNS);
      } else if (k === 'down') {
        if (rowOf(focused) < rowOf(last)) focusTile(Math.min(focused + COLUMNS, last));
      } else if (k === 'ok') {
        okTimer = setTimeout(function () { okTimer = null; startEdit(); }, LONG_PRESS_MS);
      } else if (k === 'back') {
        if (focused !== 0) focusTile(0);   // home screen: Back returns to the first tile, then goes nowhere
      } else if (/^[1-9]$/.test(k) && Number(k) <= Math.min(COLUMNS, items.length)) {
        open(items[Number(k) - 1]);
      }
    }
  });

  function closePanels() {
    ['settings', 'inputsPanel', 'newsView', 'wordsView'].forEach(function (id) { $(id).classList.add('hidden'); });
  }

  function activatePill(i) {
    if (i === 0) showInputs();
    else if (i === 1) openCalendar();
    else if (i === 2) openSettings();
    else enterFrame();   // the family photo opens the photo frame
  }

  function openCalendar() {
    pills[pillFocus].classList.remove('focused');
    zone = 'calendar';
    Calendar.open(function () { zone = 'none'; focusPill(1); }, { birthdays: C.birthdays || [] });
  }

  pills.forEach(function (p, i) {
    p.addEventListener('mouseover', function () { if (zone === 'top' || zone === 'grid') focusPill(i); });
    p.addEventListener('click', function () { focusPill(i); activatePill(i); });
  });

  // ---- lifecycle -----------------------------------------------------------------------------

  function loadApps() {
    Platform.listApps(function (apps) {
      var keep = items[focused] ? itemId(items[focused]) : null;
      build(apps);
      if (keep) items.forEach(function (it, i) { if (itemId(it) === keep) focused = i; });
      animateIn();
      zone = 'none';
      focusTile(focused, true);
    });
  }

  /**
   * Back from another app: keep the tile, and keep the first half second free for the GPU, which is
   * re-rasterising every layer it dropped while we were hidden. Anything that can wait (stats, weather,
   * wallpaper) runs once the TV is idle. Resumes and full reloads are counted (Cài đặt → Thông tin).
   */
  var idle = root.requestIdleCallback || function (fn) { return setTimeout(fn, 1); };
  function resume() {
    if (editing) finishEdit(false);
    lastInput = Date.now();
    S.set('resumes', (S.get('resumes', 0) || 0) + 1);
    updateClock();
    closePanels();
    pills.forEach(function (p) { p.classList.remove('focused'); });
    zone = 'none';
    focusTile(focused, true);
    setTimeout(function () {
      idle(function () { updateStats(); weatherFeed.refresh(); applyWallpaper(); refreshWallpaperIfDue(); syncProfile(); }, { timeout: 3000 });
    }, 600);
  }

  document.addEventListener('visibilitychange', function () { if (!document.hidden && zone !== 'frame') resume(); });
  // Re-opened through an app control (Smart Hub tile, the watch service) without a reload.
  document.addEventListener('appcontrol', function () { if (zone !== 'frame') resume(); });
  S.set('boots', (S.get('boots', 0) || 0) + 1);

  try {
    var back = sessionStorage.getItem('nhaminh.focus');
    if (back !== null) { focused = Number(back) || 0; sessionStorage.removeItem('nhaminh.focus'); }
  } catch (e) { /* none */ }
  updateClock();
  setInterval(updateClock, 10000);
  var weatherFeed = Weather.start(currentLocation, renderWeather);
  applyVisibility();
  applyWallpaper();
  setTimeout(refreshToday, 1500);   // after the first paint
  setTimeout(function () {          // later still: the YouTube row, and (once a day) the week ahead for the calendar
    idle(function () { Shelf.warm(); });
    var today = Backdrop.isoDate(new Date());
    if (S.get('calPrefetched', '') === today) return;
    S.set('calPrefetched', today);
    for (var d = 1; d <= 7; d++) {
      (function (d) {
        setTimeout(function () { idle(function () { History.prefetch(new Date(Date.now() + d * 86400000)); }); }, d * 5000);
      })(d);
    }
  }, 8000);
  setInterval(function () { if (!document.hidden) Shelf.warm(); }, 60 * 60000);
  loadApps();
  Platform.setTvScreenSaver(true);
  Platform.setServiceOption('closeAfter', settings.closeHidden);   // also starts the service
  Profile.applyAvatar($('btnFamily'));
  setTimeout(function () { idle(function () { Profile.publish(); syncProfile(); checkUpdate(); }); }, 4000);
  setInterval(function () { if (!document.hidden && zone !== 'setup') syncProfile(); }, 20000);
})(this);
