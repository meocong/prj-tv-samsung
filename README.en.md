# Nhà Mình: an Apple TV–style home screen for Samsung TVs

*Nhà Mình* ("our home" in Vietnamese) takes the place of the home screen on a Samsung Tizen TV (2017 and later): an
Apple TV–style dock and grid of your apps, photo wallpapers that change through the day, weather and air quality, a lunar
calendar, news, an English word a day, a YouTube row and remote-friendly games. **Turn the TV on and you land here; leave
any app and you come back here.** English or Vietnamese UI. Installs through the TV's Developer Mode, no root.

**[⬇ Latest release](https://github.com/meocong/prj-tv-samsung/releases/latest)** ·
**[📖 Step-by-step install (Vietnamese)](docs/huong-dan-cai-dat.md)** ·
**[🧩 Apps worth adding](#apps-worth-adding)** ·
**[Tiếng Việt](README.md)**

![Home screen in English](docs/screenshots/home-en.jpg)

## Install in 10 minutes

You need a Samsung TV from 2017 on, a computer (Windows, macOS, Linux) or an Android phone on the same Wi-Fi, and a
Samsung account (free; used once to sign the app).

1. **Turn on Developer Mode on the TV**: open *Apps*, press `1 2 3 4 5` (no number keys: press **123** for the on-screen
   keypad), switch *Developer mode* **On**, set *Host PC IP* to the IP of the computer or phone you install from, then
   unplug the TV for 10–15 seconds.
2. **Get [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases/latest)** for your device (free, open source).
3. **Install Nhà Mình**: Apps2Samsung → *Scan for TVs* → pick the TV → pick **Nhà Mình** in the app list → *Install*.
   The first time, sign in to your Samsung account when the browser opens (right away: the page waits about 10 minutes).
   No Nhà Mình in the list (an older Apps2Samsung)? Download `NhaMinh-<version>.wgt` from the
   [latest release](https://github.com/meocong/prj-tv-samsung/releases/latest) and install it with *Custom WGT / TPK*.
4. **Move its tile first** on Samsung's Home bar (select it → down → *Move*).
5. **Personalise from a phone**: on the TV, *Settings → Set up from a phone or computer*, scan the QR code, and set the
   family name, the city, birthdays, family photos and an avatar.

Then see [docs/cai-dat-tv.md](docs/cai-dat-tv.md) (Vietnamese, with the TV's English menu names in brackets) for the TV
settings worth changing: fewer ads, less tracking, a lighter TV.

**Why the Samsung sign-in:** Apps2Samsung signs the app with a Samsung *Partner* certificate. Only Partner-signed apps
may start a service when the TV boots, which is what brings the home screen up after the TV was unplugged or lost power.

**Compatibility:** Samsung Tizen TVs from 2017 on. Tested in depth on a 2020 model (UA50TU8500, Tizen 5.5).

## Features

| | |
|---|---|
| ![Apps and games](docs/screenshots/apps-games.jpg) **Apps and games**, found on the TV; hold OK to move a tile | ![Word of the Day](docs/screenshots/words.jpg) **Word of the Day**: read aloud, meanings, examples |

*(The other screenshots, in Vietnamese, are in the [Vietnamese README](README.md#có-gì).)*

- **Starts with the TV, comes back after every app**: the background service starts when the TV boots and brings the
  home screen up, keeps it in front for the first seconds after the TV wakes (Smart Hub or the TV's last app may come up
  late), and returns to it when an app you opened closes, usually within a second.
- **Apps**: the apps installed on the TV, found automatically. A dock of four (VTV GO, YouTube, Netflix and VieON by
  default; keys 1–4 open them), a grid of the other apps and four games. Hold OK on a tile to move it; hide apps in
  *Settings → Apps*.
- **YouTube row**: rest on the YouTube tile and the newest videos of a set of channels slide up above the dock. ▲ to pick,
  OK plays the video straight away, ▼ folds the row away. No API key.
- **Word of the Day**: a new English word every day, chosen by topic, with IPA, definitions, examples and synonyms (plus
  Vietnamese meanings when the UI is Vietnamese). OK reads it aloud (again: slowly), ▲ ▼ pick an example to hear, ◀ ▶ go
  back through the words learned or learn one more. Basic, Intermediate and Advanced levels. Words come from a public
  source (Datamuse) by topic, and every word learned becomes a future topic, so it never runs out.
- **Today block**, taking turns: a saying, *On this day* (English Wikipedia), the latest news (VnExpress International,
  BBC World), the English word, the gold price and USD rate in Vietnam.
- **Weather and AQI** (Open-Meteo), **Coming up** (holidays, full and new moons, birthdays, a countdown to Lunar New Year),
  a **lunar calendar** with day details.
- **Wallpaper**: Bing photos from 13 countries, a store that grows to 120 photos, a new one every hour (adjustable), kept
  on schedule across TV restarts; a gallery to use a photo for now or keep it. **Screensaver** after 3 idle minutes.
- **Setup from a phone or laptop** (English or Vietnamese page), **two UI languages** following the TV's menu language
  (*Settings → Ngôn ngữ / Language*), **frees memory** by closing apps left in the background, **light on the TV**
  (everything stored on the TV, fetched only when due; runs on Tizen 5.5's Chromium 69).

## Apps worth adding

All of these are in Apps2Samsung's list: install them like Nhà Mình, and each shows as a tile on the home screen.

| App | What it is | Note |
|---|---|---|
| **TizenTube** | YouTube without ads, sponsored segments skipped | pick `TizenTubeOld.wgt` for 2017–2020 TVs, `TizenTubeCobalt.wgt` for 2021+; third party (GPL-3.0) |
| **Aerial Screensaver** | Apple TV's aerial screensaver videos in 4K | |
| **Shmup Cup** | a shoot-'em-up played with the remote | tested on a 2020 TV |
| **Overscan** | a web browser with desktop mode and a D-pad cursor | |
| **Moonlight**, **Tizen Steam Link**, **Chiaki-Tizen** | play games from a PC, a Steam Deck or a PS4/PS5 | |
| **Jellyfin**, **Tessel** | films from a media server, a network share or USB | |
| **Reolink Viewer**, **go2rtc**, **Camera PiP** | home cameras | |

Several at once from a terminal, with `apps2samsung-cli` (in the Assets of an
[Apps2Samsung release](https://github.com/Apps2Samsung/Apps2Samsung/releases)):

```bash
apps2samsung-cli install "Nhà Mình" --tv <TV IP>
apps2samsung-cli install TizenTube --file TizenTubeOld.wgt --tv <TV IP>    # 2021+ TVs: --file TizenTubeCobalt.wgt
apps2samsung-cli install "Shmup Cup" --tv <TV IP>
apps2samsung-cli install "Aerial Screensaver" --tv <TV IP>
```

TizenBrew, and TizenTube on older TVs at its best, need Developer Mode's *Host PC IP* set to `127.0.0.1`. The home screen
keeps working with that; switch to your computer's IP only while installing or updating apps.

## Updating

*Settings → About* tells you when a new version is out; install it the same way as before and your settings stay.
**From 1.3.1 or earlier to 1.4.0** the app moves to the Partner certificate, so the TV sees a different certificate:
remove the old copy when Apps2Samsung asks (or on the TV: *Apps → ⚙ → Nhà Mình → Delete*), then install. What was stored
on the TV goes with it; set it again from the phone.

## Limitations

- The **Home** button always opens Samsung's own Home bar; no app can take it over.
- No root in Developer Mode, so Samsung's system services cannot be switched off.
- "Continue watching" in YouTube or Netflix lives inside those apps; Samsung lets no other app read it.
- Starting with the TV after a cold boot needs a Partner-signed install (Apps2Samsung does it). A build signed with a plain
  Tizen certificate starts only once its tile is opened, or with [`tools/autostart.py`](tools/autostart.py) on an
  always-on device.

---

## Development

Needs Python 3.9+ and Node.js; works on Windows (`py` instead of `python3`), macOS and Linux.

```bash
git clone https://github.com/meocong/prj-tv-samsung.git && cd prj-tv-samsung
python3 tools/tvdev.py setup                  # once: Tizen Studio CLI, signing certificate, tools/.venv
python3 tools/tvdev.py deploy --tv <TV IP>    # check, package (with local/), install on the TV, open the app
```

| Command | What it does |
|---|---|
| `tvdev.py check` | rejects JS/CSS that the TV's Chromium 69 does not understand |
| `tvdev.py debug --tv <IP>` | opens the app in debug mode; then `node tools/inspect.js --port 9333 --eval "…"` runs JS, sends keys |
| `tvdev.py partner --tv <IP>` | signs with Apps2Samsung's Samsung Partner certificate from now on (make it once with `apps2samsung-cli cert --tv <IP> --partner --prepare`), and moves the installed app over, keeping its data |
| `tvdev.py backup --tv <IP>` · `restore --tv <IP> file` | saves and restores the app's data on the TV (settings, photos from the phone, words learned) under `local/backup/` |
| `tvdev.py install --tv <IP> app.wgt` | re-signs another `.wgt` (TizenTube, a game…) with the current certificate and installs it |
| `tvdev.py release` | packages the public build (no `local/`) into `dist/` |
| `tools/preview.py 8765 --public` | preview in Chrome at `http://localhost:8765` |
| `node --test tests/*.test.js` | tests: lunar calendar, holidays, sayings, prices, apps, service, English strings, word choice… |

- **Text on screen**: strings are written in Vietnamese inside `T('…')` (numbers and names as `T('Còn {0} ngày', n)`); the
  English goes in [app/js/i18n-en.js](app/js/i18n-en.js). Fixed text in `index.html` carries a `data-t` attribute.
  `tests/i18n.test.js` lists any string without an English version.
- **Defaults** live in [app/config.js](app/config.js); a household's own configuration can go in `local/` (ignored by Git),
  laid over `app/` by `tvdev.py deploy` and `preview.py` (see `local.example/`). What is set from a phone wins.
- **Releases**: push a tag `v<version>` (the version comes from `app/config.xml`);
  [release.yml](.github/workflows/release.yml) runs the tests, packages the app and attaches `NhaMinh-<version>.wgt` to the
  GitHub Release; the release notes are written by hand. Apps2Samsung's catalog picks up new releases by itself.

## How it works

- **Apps** come from the TV itself (`tizen.application.getAppsInfo`), filtered to what the *Apps* screen shows.
- **Background service** ([app/service/watch.js](app/service/watch.js)), since Samsung lets no sideloaded app take the
  Home button: it starts at boot (`on-boot="true"`, which Tizen honours only for Partner-signed apps, and Apps2Samsung signs
  at that level when it sees the attribute) and restarts if stopped; it polls the TV's own REST API (`127.0.0.1:8001`) and
  reopens the home screen when the app it watches closes or stays in the background; after the TV wakes or boots it keeps
  the home screen in front for a while (logged in `/status`); it lets TizenBrew and TizenTube restart themselves under the
  debugger; it closes apps left in the background; and it serves the phone setup page on port 8701 (writes need the PIN
  shown on the TV).
- **Two languages** ([app/js/i18n.js](app/js/i18n.js)): the language is decided once when the app opens (`auto` follows
  the TV's `navigator.language`); changing it reloads the app. Each content source has a version per language.
- **Word of the Day** ([app/js/words.js](app/js/words.js)): the next topic in a queue → Datamuse returns related words
  with how common they are → keep single words of the chosen level not learned yet → the word learned joins the queue as
  a topic. Content from Google Translate, IPA from the Free Dictionary API (Wiktionary), Datamuse as a fallback; speech is
  Google Translate's voice. The Lexend font has no IPA symbols, so phonetics use a small subset of Noto Sans.

## License

[MIT](LICENSE) © 2026 Nguyễn Trọng Hoàng Việt. Third-party code keeps its own license (see [NOTICE](NOTICE)).

## Credits

Inspired by [cleanyourtv](https://github.com/Gathin23/cleanyourtv) (Android TV); UI ported from
[webos-vibehack](https://github.com/OmkarK97/webos-vibehack). Installed with
[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung). Data: Bing Image of the Day,
[Open-Meteo](https://open-meteo.com) (CC BY 4.0), Wikipedia and Wikiquote (CC BY-SA), [ZenQuotes](https://zenquotes.io),
PNJ, Vietcombank, the RSS feeds of VnExpress, VnExpress International, Thanh Niên, Dân Trí, the BBC and the YouTube
channels; Word of the Day: [Datamuse](https://www.datamuse.com/api/), [Free Dictionary API](https://dictionaryapi.dev)
(Wiktionary, CC BY-SA), Google Translate. Lunar calendar algorithm after Hồ Ngọc Đức. App logos in `app/icons/` belong to
their owners.
