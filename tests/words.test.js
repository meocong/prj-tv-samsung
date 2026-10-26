'use strict';
// Học tiếng Anh: choosing the word of the day and reading the three sources (payloads shaped like the live ones).
const test = require('node:test');
const assert = require('node:assert/strict');
const Words = require('../app/js/words.js');

const DATAMUSE = [
  { word: 'family unit', tags: ['syn', 'n', 'f:1.257400'] },
  { word: 'kin', tags: ['syn', 'n', 'ipa_pron:kˈɪn', 'f:6.179429'] },
  { word: 'household', tags: ['n', 'adj', 'ipa_pron:hˈaʊshoʊɫd', 'f:29.127778'] },
  { word: 'the', tags: ['n', 'f:407.2'] },
  { word: 'rooms', tags: ['f:25.58'] },
  { word: 'kill', tags: ['v', 'f:40.1'] },
  { word: 'kinsfolk', tags: ['n', 'f:0.211612'] },
  { word: 'Smith', tags: ['n', 'prop', 'f:20'] },
  { word: 'children', tags: ['n', 'f:293.27'] },
  { word: 'household', tags: ['n', 'f:29.1'] }
];

test('words: Datamuse results → plain words with a part of speech, nothing unfit', () => {
  const c = Words.candidates(DATAMUSE);
  assert.deepEqual(c.map((x) => x.word), ['kin', 'household', 'kinsfolk', 'children']);
  assert.equal(c[0].ipa, 'kˈɪn');
  assert.equal(c[1].f, 29.127778);
});

test('words: the level keeps its band, the topic order stays, learned words and their forms are skipped', () => {
  const c = Words.candidates(DATAMUSE);
  assert.deepEqual(Words.pick(c, 'basic', {}).map((x) => x.word), ['household', 'children']);
  assert.deepEqual(Words.pick(c, 'middle', {}).map((x) => x.word), ['kin']);
  assert.deepEqual(Words.pick(c, 'advanced', {}).map((x) => x.word), ['kinsfolk']);
  assert.deepEqual(Words.pick(c, 'basic', { household: true }).map((x) => x.word), ['children']);
  const forms = Words.candidates([{ word: 'eating', tags: ['n', 'f:24'] }, { word: 'stopped', tags: ['v', 'f:20'] }]);
  assert.deepEqual(Words.pick(forms, 'basic', { eat: true, stop: true }), []);
  assert.ok(Words.formOf('rooms', { room: true }) && Words.formOf('baked', { bake: true }) && !Words.formOf('morning', {}));
});

// translate_a/single?…&dt=t&dt=bd&dt=md&dt=ex&dt=ss&dt=rm&q=train, trimmed.
const GOOGLE = [
  [['xe lửa', 'train', null, null, 10], [null, null, null, 'trān']],
  [['noun', ['đoàn tùy tùng', 'xe lửa', 'đoàn xe lửa'], [], 'train', 1], ['verb', ['huấn luyện', 'đào tạo'], [], 'train', 2]],
  'en', null, null, null, 1, [], [['en'], null, [1], ['en']], null, null,
  [['verb', [[['coach', 'teach', 'school'], 'id1'], [['nick', 'pinch'], 'id2', [['informal']]], [['aim', 'point'], 'id3']], 'train', 2]],
  [['noun', [['a series of railway carriages moved as a unit.', 'id4', 'the train was late']], 'train', 1],
    ['verb', [['teach (a person or animal) a skill.', 'id5', 'the plan is to train teachers'], ['be taught.', 'id6']], 'train', 2]],
  [[['she <b>trained</b> as a nurse', null, null, null, null, 'id7'], ['we took the <b>train</b> to Paris', null, null, null, null, 'id8'],
    ['the <b>train</b> was late', null, null, null, null, 'id9'], ['a <b>train</b> robbery with a gun', null, null, null, null, 'id10']]]
];

test('words: Google gives the everyday meaning, the dictionary senses, definitions, sentences and plain synonyms', () => {
  const g = Words.parseGoogle('train', GOOGLE);
  assert.equal(g.meaning, 'xe lửa');
  assert.deepEqual(g.senses[1], { pos: 'verb', vi: ['huấn luyện', 'đào tạo'] });
  assert.deepEqual(g.defs[0], { pos: 'noun', en: 'A series of railway carriages moved as a unit.', ex: 'The train was late' });
  assert.equal(g.defs.length, 3);
  assert.deepEqual(g.examples.map((e) => e.en), ['She trained as a nurse', 'We took the train to Paris']);
  assert.deepEqual(g.synonyms, ['coach', 'teach', 'school', 'aim', 'point']);
  assert.equal(g.respell, 'trān');
  assert.equal(Words.parseGoogle('xyzzy', [[['xyzzy', 'xyzzy']]]), null);   // no dictionary entry
});

test('words: dictionaryapi.dev and Datamuse fill in when Google is silent', () => {
  const d = Words.parseDictionary([{ word: 'kitchen', phonetics: [{ text: '/ˈkɪt͡ʃən/' }],
    meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'a room for preparing food.', example: 'she was in the kitchen' }],
      synonyms: ['galley', 'cook house'] }] }]);
  assert.deepEqual(d, { ipa: '/ˈkɪt͡ʃən/', defs: [{ pos: 'noun', en: 'A room for preparing food.', ex: 'She was in the kitchen' }],
    synonyms: ['galley'] });
  const m = Words.parseDatamuse([{ word: 'kitchen', tags: ['n', 'ipa_pron:kˈɪtʃʌn'],
    defs: ['n\tA room or area for preparing food. ', 'n\t(music) The percussion section of an orchestra. '] }]);
  assert.deepEqual(m, { ipa: '/ˈkɪtʃʌn/', defs: [{ pos: 'noun', en: 'A room or area for preparing food.', ex: '' }] });
  assert.equal(Words.tidyIpa('hˈaʊshoʊɫd'), 'ˈhaʊshoʊld');
  assert.equal(Words.tidyIpa('dʌmˈɛstɪk'), 'dʌˈmɛstɪk');
  assert.equal(Words.tidyIpa('trˈeɪn'), 'ˈtreɪn');

  const e = Words.merge('kitchen', null, d, m);
  assert.equal(e.ipa, '/ˈkɪt͡ʃən/');
  assert.equal(e.google, false);
  assert.deepEqual(e.examples, []);   // its one sentence is shown with the definition
  assert.equal(Words.merge('kitchen', null, null, m).defs[0].en, 'A room or area for preparing food.');
  assert.equal(Words.merge('xyzzy', null, null, null), null);
  assert.equal(Words.merge('train', Words.parseGoogle('train', GOOGLE), null, null).ipa, 'trān');
});
