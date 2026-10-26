'use strict';
// Which of the TV's applications show up on the home screen (Platform.mergeApps).
const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
require('../app/js/apps.js');
const { Platform } = require('../app/js/platform.js');

const catalog = [
  { id: '9Ur5IzDKqV.TizenYouTube', storeId: '111299001912', title: 'YouTube', icon: 'icons/111299001912.jpg' },
  { id: 'org.tizen.netflix-app', storeId: '3201907018807', title: 'Netflix', icon: 'icons/3201907018807.jpg' }
];

test('catalog apps keep their artwork, other store apps come with the TV\'s own name and icon', () => {
  const tv = [
    { id: 'abcDEF1234.DisneyPlus', name: 'Disney+', iconPath: '/opt/usr/apps/abcDEF1234/shared/res/icon.png', show: true },
    { id: 'org.tizen.netflix-app', name: 'Netflix', show: true },
    { id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube', show: true },
    { id: 'NhaMinh000.NhaMinh', name: 'Nhà Mình', show: true },               // this app
    { id: 'NhaMinh000.WatchService', name: 'NhaWatch', show: false },
    { id: 'org.tizen.volume-panel', name: 'volume', show: false },          // system parts
    { id: 'Zx9Yw8Vu7T.PreviewService', name: 'Preview', show: true },
    { id: 'qtMHjALHus.TVDeviceCare', name: 'TVDeviceCare', show: true },   // seen on a 2020 TV
    { id: 'Qq1Ww2Ee3R.HiddenGame', name: 'Hidden', show: false }
  ];
  const apps = Platform.mergeApps(tv, catalog);
  assert.deepEqual(apps.map((a) => a.title), ['YouTube', 'Netflix', 'Disney+']);
  assert.equal(apps[0].icon, 'icons/111299001912.jpg');
  assert.match(apps[2].icon, /^file:\/\/\/opt\/usr\/apps\/abcDEF1234\/shared\/res\/icon\.png$/);
  assert.equal(apps[2].storeId, '');
});

test('the shipped catalog has what every entry needs (apps without artwork get a letter tile)', () => {
  assert.ok(window.TV_APPS.length > 10);
  window.TV_APPS.forEach((a) => { assert.ok(a.id && a.title, JSON.stringify(a)); });
});
