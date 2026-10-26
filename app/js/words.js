/*
 * Học tiếng Anh: mỗi ngày một từ mới theo chủ đề, có phiên âm, nghĩa tiếng Việt, giải nghĩa tiếng Anh, câu ví dụ có
 * dịch và từ đồng nghĩa; bấm OK để nghe đọc. Không có danh sách từ đóng gói sẵn: từ lấy từ nguồn công khai, nên học
 * mãi không hết.
 *
 * Chọn từ của ngày:
 *   1. Chủ đề kế tiếp trong hàng chờ. Hàng chờ bắt đầu bằng vài chủ đề đời thường (TOPICS); mỗi từ học xong lại
 *      được xếp vào cuối hàng làm chủ đề về sau, nên hàng chờ không bao giờ cạn.
 *   2. Datamuse (api.datamuse.com, miễn phí, không cần key) trả các từ cùng nghĩa với chủ đề, rồi các từ hay đi cùng
 *      nó, xếp theo độ liên quan, kèm độ phổ biến (số lần trên một triệu từ, theo Google Books).
 *   3. Giữ từ đơn có từ loại, không phải từ chức năng (the, of…), đúng trình độ (Cơ bản: rất phổ biến · Trung cấp ·
 *      Nâng cao: ít gặp hơn), chưa học, không phải dạng biến đổi của từ đã có (eating khi đã có eat); lấy từ liên quan
 *      nhất. Từ không tra được nghĩa thì bỏ, lấy từ kế tiếp.
 *
 * Nội dung của một từ, từ ba nguồn gọi cùng lúc:
 *   translate.googleapis.com (không chính thức, cùng nguồn với bản dịch "Ngày này năm xưa"): nghĩa tiếng Việt theo từ
 *     loại, định nghĩa Oxford kèm ví dụ, thêm câu ví dụ, từ đồng nghĩa; sau đó dịch các câu sang tiếng Việt.
 *   api.dictionaryapi.dev (Wiktionary): phiên âm IPA; định nghĩa, ví dụ và từ đồng nghĩa khi Google không trả lời.
 *   Datamuse: định nghĩa và phiên âm dự phòng.
 * Thiếu phần tiếng Việt (Google không trả lời) thì lần mở sau, cách ít nhất một giờ, hỏi lại.
 * Đọc to: giọng đọc của Google Dịch (translate_tts) phát bằng <audio>; bấm OK lần nữa ngay sau đó thì đọc chậm.
 *
 * Kho trên TV (IndexedDB, giữ mãi): từng từ đã tải (word.<từ>) và words.state {days: {ngày: [từ…]}, queue}.
 * Mỗi ngày tải một từ (thêm từ khi bấm "học thêm"); từ cũ mở lại là có ngay, không cần mạng.
 *
 *   Words.today(level, cb)   cb(entry | null): từ của hôm nay, chọn và tải nếu chưa có (mất mạng: từ gần nhất)
 *   Words.more(level, cb)    thêm một từ mới cho hôm nay
 *   Words.history(cb)        cb([{day, word}]) mọi từ đã học, cũ nhất trước
 *   Words.get(word, cb)      cb(entry | null)
 *   Words.speak(text)        đọc to
 * entry: {word, ipa, meaning, senses: [{pos, vi: […]}], defs: [{pos, en, ex, vi, exVi}], examples: [{en, vi}],
 *         synonyms: […], topic}
 */
(function (root, factory) {
  var mod = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.Words = mod;
})(this, function (root) {
  'use strict';

  var TOPICS = ['family', 'home', 'food', 'kitchen', 'school', 'travel', 'weather', 'health', 'body', 'sport', 'music',
    'nature', 'animal', 'city', 'work', 'money', 'shopping', 'clothes', 'feeling', 'technology', 'science', 'art',
    'time', 'transport', 'garden', 'ocean', 'space', 'holiday', 'friend', 'cooking', 'book', 'film', 'game',
    'computer', 'farm', 'river', 'mountain', 'festival', 'hospital', 'restaurant'];
  // Frequency bands in uses per million words (Datamuse's f: tag).
  var LEVELS = { basic: [8, Infinity], middle: [1.5, 8], advanced: [0.2, 1.5] };
  var FUNCTION = /^(the|and|but|nor|yet|for|from|with|without|within|into|onto|upon|over|under|above|below|between|among|through|during|before|after|about|against|along|around|across|behind|beyond|toward|towards|via|per|except|despite|inside|outside|have|has|had|having|does|did|will|would|can|could|shall|should|may|might|must|ought|been|being|are|was|were|you|your|yours|him|his|her|hers|its|our|ours|they|them|their|theirs|this|that|these|those|which|who|whom|whose|what|whatever|some|any|none|all|both|each|either|neither|every|much|many|more|most|few|less|least|such|other|another|not|very|too|also|just|only|even|still|already|ever|again|here|there|where|when|why|how|than|then|because|although|though|unless|while|whether|since|until|off|away|yes)$/;
  var UNSUITABLE = /^(sex|sexual|sexy|kill|killer|murder|gun|guns|drug|drugs|bomb|weapon|terror|terrorist|violence|violent|shoot|crime|criminal|abuse|suicide|rape|porn|damn|hell|gay|nude|naked|corpse|cocaine|heroin|whore|slave)$/;
  // Sentences a family screen leaves out ("domestic violence" is a fine phrase, not for the living room).
  var GRIM = /\b(sex|kill|murder|gun|drug|bomb|weapon|terror|violen|shoot|crime|criminal|abuse|suicide|rape|porn|naked|nude)/i;
  var POS = ['n', 'v', 'adj', 'adv'];
  var STATE = 'words.state', RETRY_MS = 3600000;

  function en() { return typeof I18n !== 'undefined' && I18n.en; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function strip(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function sentence(s) { s = strip(s); return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---- choosing a word (pure: tested in tests/words.test.js) ------------------------------------

  /** Datamuse results → [{word, f, ipa}] that could be learned: one plain word with a part of speech. */
  function candidates(list) {
    var out = [], seen = {};
    (list || []).forEach(function (w) {
      var word = String(w.word || ''), tags = w.tags || [], f = 0, ipa = '', pos = false;
      if (!/^[a-z]{3,16}$/.test(word) || FUNCTION.test(word) || UNSUITABLE.test(word) || seen[word]) return;
      tags.forEach(function (t) {
        if (t.indexOf('f:') === 0) f = parseFloat(t.slice(2)) || 0;
        else if (t.indexOf('ipa_pron:') === 0) ipa = t.slice(9);
        else if (POS.indexOf(t) !== -1) pos = true;
      });
      if (!pos) return;   // inflected forms ("rooms", "knives") come without one
      seen[word] = true;
      out.push({ word: word, f: f, ipa: ipa });
    });
    return out;
  }

  /** "eating" when "eat" is there too, "rooms" when "room" is: forms of a word we have, not new words. */
  function formOf(word, has) {
    var m = /^(.+?)(ing|ed|es|s)$/.exec(word);
    if (!m) return false;
    var base = m[1];
    return !!(has[base] || has[base + 'e'] || (base.length > 2 && base[base.length - 1] === base[base.length - 2] && has[base.slice(0, -1)]));
  }

  /** The candidates that fit the level and are new, most related to the topic first. */
  function pick(list, level, learned) {
    var band = LEVELS[level] || LEVELS.basic, has = {};
    learned = learned || {};
    list.forEach(function (c) { has[c.word] = true; });
    Object.keys(learned).forEach(function (w) { has[w] = true; });
    return list.filter(function (c) { return c.f >= band[0] && c.f < band[1] && !learned[c.word] && !formOf(c.word, has); });
  }

  /** translate_a/single with dt=t,bd,md,ex,ss,rm → {meaning, senses, defs, examples, synonyms, respell} or null. */
  function parseGoogle(word, j) {
    if (!j || !j[0]) return null;
    var senses = (j[1] || []).map(function (b) { return { pos: b[0], vi: (b[1] || []).slice(0, 4) }; })
      .filter(function (s) { return s.pos && s.vi.length; });
    var defs = [];
    (j[12] || []).forEach(function (g) {
      (g[1] || []).slice(0, 2).forEach(function (d) {
        if (d && d[0] && defs.length < 4) defs.push({ pos: g[0], en: sentence(d[0]), ex: d[2] && !GRIM.test(d[2]) ? sentence(d[2]) : '' });
      });
    });
    if (!senses.length && !defs.length) return null;
    // More sentences, leaving out the ones the definitions already show.
    var examples = [], shown = defs.map(function (d) { return d.ex.toLowerCase(); });
    ((j[13] || [])[0] || []).forEach(function (e) {
      var t = sentence(e && e[0]);
      if (t && examples.length < 4 && t.length < 160 && shown.indexOf(t.toLowerCase()) === -1 && !GRIM.test(t)) examples.push({ en: t });
    });
    // Synonyms: groups without a label ("informal", "archaic"…), a handful of plain words.
    var synonyms = [];
    (((j[11] || [])[0] || [])[1] || []).forEach(function (grp) {
      if (grp[2]) return;
      (grp[0] || []).forEach(function (s) { if (synonyms.length < 6 && s !== word && synonyms.indexOf(s) === -1) synonyms.push(s); });
    });
    // The plain translation is the everyday meaning ("train" → "xe lửa"); the dictionary lists the others A to Z.
    var first = j[0][0] || [], spell = j[0][1] && j[0][1][3], main = strip(first[0]);
    if (!main || main.toLowerCase() === word) main = senses.length ? senses[0].vi.slice(0, 3).join(', ') : '';
    return { meaning: main, senses: senses,
      defs: defs, examples: examples, synonyms: synonyms, respell: spell || '' };
  }

  /** dictionaryapi.dev → {ipa, defs, synonyms} or null. */
  function parseDictionary(j) {
    var e = j && j[0];
    if (!e || !e.meanings) return null;
    var p = (e.phonetics || []).filter(function (x) { return x.text; })[0];
    var defs = [], synonyms = [];
    e.meanings.forEach(function (m) {
      (m.definitions || []).slice(0, 2).forEach(function (d) {
        if (d.definition && defs.length < 4) defs.push({ pos: m.partOfSpeech, en: sentence(d.definition), ex: d.example && !GRIM.test(d.example) ? sentence(d.example) : '' });
      });
      (m.synonyms || []).forEach(function (s) { if (synonyms.length < 6 && synonyms.indexOf(s) === -1 && !/\s/.test(s)) synonyms.push(s); });
    });
    return { ipa: e.phonetic || (p ? p.text : ''), defs: defs, synonyms: synonyms };
  }

  var DM_POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
  var VOWEL = /[aeiouyæɑɒɔəɛɜɝɚɪʊʌ]/;

  /** Datamuse's IPA ("hˈaʊshoʊɫd") written the usual way: stress mark before the syllable, plain l ("ˈhaʊshoʊld"). */
  function tidyIpa(s) {
    var c = String(s || '').replace(/ɫ/g, 'l').split('');
    for (var i = 0; i < c.length; i++) {
      if (c[i] !== 'ˈ' && c[i] !== 'ˌ') continue;
      var j = c.slice(0, i).some(function (x) { return VOWEL.test(x); }) ? (i > 0 && !VOWEL.test(c[i - 1]) ? i - 1 : i) : 0;
      if (j !== i) c.splice(j, 0, c.splice(i, 1)[0]);
    }
    return c.join('');
  }

  /** Datamuse sp=word&md=dr&ipa=1 → {ipa, defs} or null. */
  function parseDatamuse(j) {
    var w = j && j[0];
    if (!w) return null;
    var ipa = ((w.tags || []).filter(function (t) { return t.indexOf('ipa_pron:') === 0; })[0] || '').slice(9);
    var defs = (w.defs || []).filter(function (d) { return !/^\w+\t\(/.test(d); }).slice(0, 3).map(function (d) {
      var t = d.split('\t');
      return { pos: DM_POS[t[0]] || t[0], en: sentence(t[1]), ex: '' };
    });
    return { ipa: ipa ? '/' + tidyIpa(ipa) + '/' : '', defs: defs };
  }

  /** One entry from what each source gave; null when no source knows the word. */
  function merge(word, g, d, m) {
    var defs = (g && g.defs.length ? g.defs : d && d.defs.length ? d.defs : m ? m.defs : []);
    if (!defs.length && !(g && g.senses.length)) return null;
    var examples = g ? g.examples : [];   // the dictionaries' sentences come with their definitions already
    return { word: word, ipa: (d && d.ipa) || (m && m.ipa) || (g && g.respell) || '', meaning: g ? g.meaning : '',
      senses: g ? g.senses : [], defs: defs, examples: examples.slice(0, 4),
      synonyms: g && g.synonyms.length ? g.synonyms : d ? d.synonyms : [], google: !!g };
  }

  // ---- fetching and the store on the TV ---------------------------------------------------------

  var GOOGLE = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=md&dt=ex&dt=ss&dt=rm&q=';

  function getJSON(url, cb) { Platform.getJSON(url, function (err, data) { cb(err ? null : data); }, 15000); }
  function save(e) { Platform.kv.set('word.' + e.word, e); }

  /** The Vietnamese parts, added once (only while the screen is in Vietnamese). */
  function addVietnamese(e, cb) {
    if (en() || typeof History === 'undefined') return cb(e);
    function translate() {
      if (e.tr) return cb(e);
      var texts = [];
      e.defs.forEach(function (d) { texts.push(d.en); if (d.ex) texts.push(d.ex); });
      e.examples.forEach(function (x) { texts.push(x.en); });
      History.translate(texts, function (vi) {
        if (vi === texts) return cb(e);   // offline: next time
        var k = 0;
        e.defs.forEach(function (d) { d.vi = vi[k++]; if (d.ex) d.exVi = vi[k++]; });
        e.examples.forEach(function (x) { x.vi = vi[k++]; });
        e.tr = true;
        save(e);
        cb(e);
      });
    }
    if (e.google || Date.now() - (e.askedAt || 0) < RETRY_MS) return translate();
    e.askedAt = Date.now();   // Google did not answer when the word was fetched: ask again for the meaning
    getJSON(GOOGLE + encodeURIComponent(e.word), function (j) {
      var g = parseGoogle(e.word, j);
      if (g) {
        e.google = true;
        e.meaning = g.meaning;
        e.senses = g.senses;
        if (g.defs.length) { e.defs = g.defs; e.tr = false; }
        if (g.examples.length) { e.examples = g.examples; e.tr = false; }
        if (g.synonyms.length) e.synonyms = g.synonyms;
      }
      save(e);
      translate();
    });
  }

  /** cb(entry | null): from the store, else from the three sources (then kept for good). */
  function get(word, cb, hint) {
    Platform.kv.get('word.' + word, function (have) {
      if (have) return addVietnamese(have, cb);
      var got = {}, left = 3;
      function done() {
        if (--left) return;
        var e = merge(word, got.g, got.d, got.m);
        if (!e) return cb(null);
        if (!e.ipa && hint && hint.ipa) e.ipa = '/' + tidyIpa(hint.ipa) + '/';
        e.topic = (hint && hint.topic) || '';
        e.at = Date.now();
        if (!e.google) e.askedAt = Date.now();
        save(e);
        addVietnamese(e, cb);
      }
      getJSON(GOOGLE + encodeURIComponent(word), function (j) { got.g = parseGoogle(word, j); done(); });
      // The query string matters: without it Cloudflare answers the TV with a 404 page it cached weeks ago.
      getJSON('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word) + '?src=nhaminh', function (j) {
        got.d = parseDictionary(j);
        done();
      });
      getJSON('https://api.datamuse.com/words?md=dr&ipa=1&max=1&sp=' + encodeURIComponent(word), function (j) {
        var m = parseDatamuse(j);
        got.m = m && j[0].word === word ? m : null;
        done();
      });
    });
  }

  function learnedSet(s) {
    var out = {};
    Object.keys(s.days).forEach(function (d) { s.days[d].forEach(function (w) { out[w] = true; }); });
    return out;
  }

  function loadState(cb) {
    Platform.kv.get(STATE, function (s) {
      s = s || {};
      s.days = s.days || {};
      // Topics that gave nothing are dropped; should the queue ever run dry, every learned word is a topic again.
      if (!s.queue || !s.queue.length) s.queue = TOPICS.concat(Object.keys(learnedSet(s)));
      cb(s);
    });
  }

  /** A new word for today: topic after topic until one gives a word of the level. cb(entry | null). */
  function chooseNew(s, level, cb) {
    var learned = learnedSet(s), tries = 0;
    (function nextTopic() {
      if (tries++ >= 6 || !s.queue.length) return cb(null);
      var topic = s.queue.shift();
      var q = encodeURIComponent(topic), base = 'https://api.datamuse.com/words?md=fpr&ipa=1&max=100&';
      getJSON(base + 'ml=' + q, function (a) {
        getJSON(base + 'rel_trg=' + q, function (b) {
          if (!a && !b) { s.queue.unshift(topic); return cb(null); }   // offline: the same topic next time
          var list = pick(candidates((a || []).concat(b || [])), level, learned), i = 0;
          (function tryWord() {
            if (i >= Math.min(list.length, 4)) return nextTopic();
            var c = list[i++];
            get(c.word, function (e) {
              if (!e) return tryWord();
              var day = dayKey(new Date());
              (s.days[day] = s.days[day] || []).push(e.word);
              s.queue.push(e.word);   // today's word is a topic one day
              Platform.kv.set(STATE, s);
              cb(e);
            }, { ipa: c.ipa, topic: topic });
          })();
        });
      });
    })();
  }

  /** One choice at a time: the Hôm nay block and the Học tiếng Anh screen may ask at once. */
  function serial(fn) {
    var busy = false, waiting = [];
    return function (level, cb) {
      waiting.push(cb);
      if (busy) return;
      busy = true;
      fn(level, function (e) {
        busy = false;
        var w = waiting;
        waiting = [];
        w.forEach(function (f) { f(e); });
      });
    };
  }

  var today = serial(function (level, cb) {
    loadState(function (s) {
      var list = s.days[dayKey(new Date())];
      if (list && list.length) return get(list[0], cb);
      chooseNew(s, level, function (e) {
        if (e) return cb(e);
        var all = [];   // offline: the last word learned, until a new one can be fetched
        Object.keys(s.days).sort().forEach(function (d) { all = all.concat(s.days[d]); });
        if (all.length) get(all[all.length - 1], cb); else cb(null);
      });
    });
  });

  var more = serial(function (level, cb) { loadState(function (s) { chooseNew(s, level, cb); }); });

  function history(cb) {
    loadState(function (s) {
      var out = [];
      Object.keys(s.days).sort().forEach(function (d) { s.days[d].forEach(function (w) { out.push({ day: d, word: w }); }); });
      cb(out);
    });
  }

  // ---- reading aloud ---------------------------------------------------------------------------

  var audio = null, last = { text: '', at: 0 };

  function speak(text) {
    text = String(text || '').slice(0, 200);
    if (!text) return;
    try {
      audio = audio || new Audio();
      var slow = last.text === text && Date.now() - last.at < 8000;   // the same text again right after: slowly
      last = { text: text, at: Date.now() };
      var url = 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&ttsspeed=' + (slow ? '0.4' : '1') +
        '&q=' + encodeURIComponent(text);
      audio.src = Platform.isTV ? url : '/proxy?u=' + encodeURIComponent(url);
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* no sound: nothing to do */ });
    } catch (e) { /* no audio element */ }
  }

  var POS_VI = { noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ', pronoun: 'đại từ',
    preposition: 'giới từ', conjunction: 'liên từ', interjection: 'thán từ', exclamation: 'thán từ', article: 'mạo từ',
    determiner: 'từ hạn định', abbreviation: 'viết tắt', prefix: 'tiền tố', suffix: 'hậu tố', phrase: 'cụm từ' };
  var POS_SHORT = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv' };

  /** "danh từ" / "noun", and "n" / "v" / "adj" / "adv" for the short form. */
  function posName(p) { return en() ? p : POS_VI[p] || p; }
  function posShort(p) { return POS_SHORT[p] || p; }

  return { today: today, more: more, history: history, get: get, speak: speak, posName: posName, posShort: posShort,
    candidates: candidates, pick: pick, formOf: formOf, parseGoogle: parseGoogle, parseDictionary: parseDictionary,
    parseDatamuse: parseDatamuse, tidyIpa: tidyIpa, merge: merge, dayKey: dayKey, LEVELS: LEVELS, TOPICS: TOPICS };
});
