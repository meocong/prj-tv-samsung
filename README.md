# Nhà Mình: màn hình chính kiểu Apple TV cho TV Samsung

Một app thay chỗ màn hình Home cho TV Samsung chạy Tizen (đời 2017 trở đi). Giao diện kiểu Apple TV, hình nền đẹp đổi
theo giờ, thời tiết và chất lượng không khí, lịch vạn niên, tin tức, giá vàng và tỷ giá, hàng video YouTube, mỗi ngày một
từ tiếng Anh, game chơi bằng remote. **Bật TV là vào thẳng đây, thoát app nào cũng quay về đây.** Tiếng Việt hoặc tiếng
Anh. Cài bằng Developer Mode của TV, không cần root.

**[⬇ Tải bản mới nhất](https://github.com/meocong/prj-tv-samsung/releases/latest)** ·
**[📖 Hướng dẫn cài từng bước](docs/huong-dan-cai-dat.md)** ·
**[📺 Cài đặt TV nên làm](docs/cai-dat-tv.md)** ·
**[🧩 App hay nên cài thêm](docs/huong-dan-cai-dat.md#8-cài-thêm-app-hay-không-bắt-buộc)** ·
**[English](README.en.md)**

![Màn hình chính](docs/screenshots/home.jpg)

## Cài trong 10 phút

Không cần biết lập trình. Cần: TV Samsung đời 2017+, một máy tính (Windows, macOS, Linux) hoặc điện thoại Android cùng
Wi-Fi với TV, và một tài khoản Samsung (miễn phí, dùng một lần để ký app).

1. **Bật Developer Mode trên TV**: *Ứng dụng* → bấm `1 2 3 4 5` → *Developer mode*: **On**, *Host PC IP* = IP của máy
   dùng để cài → rút điện TV 10–15 giây rồi cắm lại.
2. **Cài [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases/latest)** (miễn phí, có tiếng Việt) lên máy
   tính hoặc điện thoại Android.
3. **Cài Nhà Mình**: Apps2Samsung → *Quét để tìm TV* → chọn TV → chọn **Nhà Mình** trong danh sách ứng dụng → *Cài ngay*.
   Lần đầu, đăng nhập tài khoản Samsung khi trình duyệt mở ra.
4. **Cá nhân hóa bằng điện thoại**: trên TV, *Cài đặt → Cài đặt bằng điện thoại / máy tính*, quét mã QR: đặt tên nhà,
   thành phố, sinh nhật, ảnh gia đình.

Từng bước chi tiết, cách xem IP trên từng máy, cách xử lý lỗi: **[docs/huong-dan-cai-dat.md](docs/huong-dan-cai-dat.md)**.

## Có gì

| | |
|---|---|
| ![Ứng dụng và game](docs/screenshots/apps-games.jpg) **Ứng dụng và game**: tự nhận app đã cài, giữ OK để sắp xếp | ![Hàng YouTube](docs/screenshots/youtube.jpg) **Hàng YouTube**: video mới của các kênh chọn sẵn, OK là phát |
| ![Học tiếng Anh](docs/screenshots/words.jpg) **Học tiếng Anh**: mỗi ngày một từ, nghe đọc, nghĩa, câu ví dụ | ![Giá vàng](docs/screenshots/gold.jpg) **Hôm nay**: giá vàng, tỷ giá, ngày này năm xưa, câu nói hay, tin mới |
| ![Lịch vạn niên](docs/screenshots/calendar.jpg) **Lịch vạn niên** âm dương | ![Xem ngày](docs/screenshots/xem-ngay.jpg) **Xem ngày**: trực, sao, giờ hoàng đạo, hướng xuất hành… |
| ![Tin mới](docs/screenshots/news.jpg) **Tin mới** từ VnExpress, Thanh Niên, Dân Trí | ![Thư viện hình nền](docs/screenshots/gallery.jpg) **Thư viện hình nền**: dùng tạm hoặc giữ cố định |
| ![Cài đặt bằng điện thoại](docs/screenshots/setup-tv.jpg) **Cài đặt bằng điện thoại**: quét QR, nhập PIN | ![Cài đặt](docs/screenshots/settings.jpg) **Cài đặt** nhiều tầng như Apple TV |
| ![Màn hình chờ](docs/screenshots/screensaver.jpg) **Màn hình chờ**: ảnh, đồng hồ, thời tiết, câu nói | ![Giao diện tiếng Anh](docs/screenshots/home-en.jpg) **Giao diện tiếng Anh**, theo ngôn ngữ của TV |

*Ảnh chụp từ bản xem thử với cấu hình mẫu; ảnh nền là ảnh Bing trong ngày.*

**Màn hình chính**
- **Bật TV là vào đây**, kể cả sau khi rút điện hay mất điện (dịch vụ nền chạy cùng TV), và **thoát app nào cũng về
  đây**, thường dưới 1 giây.
- **Ứng dụng**: tự nhận các app đã cài. Dock 4 app (mặc định VTV GO, YouTube, Netflix, VieON; phím 1–4 mở thẳng), lưới
  các app còn lại, 4 game có sẵn. Giữ OK trên một ô để di chuyển; ẩn hoặc hiện app ở *Cài đặt → Ứng dụng*.
- **Hàng YouTube**: dừng ở ô YouTube thì video mới của các kênh chọn sẵn hiện trên dock; ▲ để chọn, OK để phát thẳng
  video, ▼ để gập lại. Không cần API key.
- **Nguồn vào** (HDMI, truyền hình, đặt tên riêng cho cổng) và lối tắt vào cài đặt của TV.

**Thông tin trong ngày**
- **Thời tiết và AQI** (Open-Meteo): nhiệt độ, dự báo 4 ngày, chất lượng không khí kèm lời khuyên, "có thể mưa sau ~N phút".
- **Khối Hôm nay** xoay vòng: giá vàng (PNJ) và tỷ giá USD (Vietcombank), ngày này năm xưa (Wikipedia), tin mới, từ
  tiếng Anh của ngày, câu nói hay (50 danh ngôn mới mỗi ngày, ~130 câu chọn sẵn, tục ngữ).
- **Sắp tới**: Rằm, Mùng 1, ngày lễ dương và âm lịch, sinh nhật người nhà, đếm ngược Tết.
- **Lịch vạn niên**: lưới tháng âm dương; OK trên một ngày mở *Xem ngày* (can chi, Trực, 28 sao, nạp âm, giờ hoàng đạo,
  giờ Lý Thuần Phong, hướng xuất hành, tuổi xung, Bành Tổ…). Kết quả khớp lichvannien.net (có test).

**Học tiếng Anh**
- Mỗi ngày một từ mới theo chủ đề: phiên âm IPA, nghĩa tiếng Việt theo từ loại, giải nghĩa tiếng Anh có dịch, câu ví dụ
  có dịch, từ đồng nghĩa. **OK** nghe đọc (bấm lần nữa: đọc chậm), **▲ ▼** chọn câu để nghe, **◀ ▶** xem lại từ cũ hoặc
  học thêm từ mới. Ba trình độ: Cơ bản, Trung cấp, Nâng cao.
- Từ lấy từ nguồn công khai theo chủ đề, từ học xong lại thành chủ đề mới, nên **học mãi không hết**.

**Ảnh và màn hình chờ**
- **Hình nền**: ảnh Bing của 13 nước, kho tự lớn dần tới 120 ảnh, đổi mỗi giờ (chỉnh được) và giữ đúng nhịp qua các lần
  tắt TV. Có chế độ ảnh gia đình, kết hợp, bầu trời theo giờ, nền đen.
- **Màn hình chờ** sau 3 phút không bấm gì: ảnh chuyển mờ dần xen ảnh gia đình, đồng hồ, âm lịch, thời tiết, câu nói, từ
  tiếng Anh. Ban đêm tối hơn.

**Gia đình và TV**
- **Cài đặt bằng điện thoại hoặc laptop**: tên nhà, thành phố, sinh nhật, ảnh gia đình, avatar; mọi thứ lưu trên TV.
- **Hai thứ tiếng**: theo ngôn ngữ menu của TV, đổi ở *Cài đặt → Ngôn ngữ / Language*; tin tức, ngày này năm xưa, câu
  nói cũng chuyển theo.
- **Giải phóng RAM**: app chạy ẩn quá 5 phút (như Netflix khi thoát) được đóng lại.
- **Nhẹ trên TV**: mọi thứ lưu sẵn, mở app không chờ mạng, chỉ cập nhật khi tới hạn. Chạy trên Chromium 69 của Tizen 5.5.
- **Báo khi có bản mới** ở *Cài đặt → Thông tin*.

**App hay nên cài thêm** (không bắt buộc): YouTube không quảng cáo (TizenTube), màn hình chờ Apple TV (Aerial
Screensaver), game, trình duyệt, chơi game từ PC… đều có trong danh sách của Apps2Samsung và tự hiện thành ô trên màn
hình chính. Danh sách và cách cài một lượt: [hướng dẫn, mục 8](docs/huong-dan-cai-dat.md#8-cài-thêm-app-hay-không-bắt-buộc).

## Cá nhân hóa

Trên TV: *Cài đặt* (nút bánh răng, hoặc phím xanh dương) → *Cài đặt bằng điện thoại / máy tính*. TV hiện mã QR, địa chỉ
`http://<IP TV>:8701/` và mã PIN. Mở trên điện thoại hay laptop cùng Wi-Fi để đặt tên nhà (❤ hiện thành trái tim),
thành phố, sinh nhật (dương hoặc âm lịch), ảnh gia đình (thu nhỏ ngay trên máy, ảnh dọc được đặt khung trên nền mờ) và
ảnh avatar. Trang có tiếng Việt và tiếng Anh.

<img src="docs/screenshots/setup-phone.jpg" alt="Trang cài đặt trên điện thoại" width="320">

Các mục còn lại chỉnh ngay trong *Cài đặt* trên TV: màn hình chờ, hình nền và nhịp đổi, số ô mỗi hàng, ẩn/hiện app,
nơi xem thời tiết, giá vàng và tỷ giá, đóng app chạy ngầm, Học tiếng Anh (bật/tắt, trình độ), ngôn ngữ.

Nên làm thêm trong cài đặt của TV (bớt quảng cáo và theo dõi, TV nhẹ hơn): [docs/cai-dat-tv.md](docs/cai-dat-tv.md).

## Hạn chế

- Nút **Home** trên remote luôn mở thanh Home của Samsung; không app nào thay được nút này.
- Không tắt được dịch vụ hệ thống của Samsung: Developer Mode không có root hay shell.
- Gợi ý, "xem tiếp" của YouTube, Netflix nằm trong từng app; Samsung không cho app khác đọc.
- Tự lên sau khi TV khởi động hẳn cần app được ký cấp Partner. Apps2Samsung tự làm việc này; ai tự build bằng chứng chỉ
  thường thì xem [docs/cai-dat-tv.md, mục 2](docs/cai-dat-tv.md#2-bật-tv-là-vào-màn-hình-chính).

---

## Cho người muốn sửa code

Cần Python 3.9+ và Node.js; chạy được trên Windows (dùng `py` thay `python3`), macOS và Linux.

```bash
git clone https://github.com/meocong/prj-tv-samsung.git && cd prj-tv-samsung
python3 tools/tvdev.py setup                  # một lần: Tizen Studio CLI, chứng chỉ ký app, tools/.venv
python3 tools/tvdev.py deploy --tv <IP TV>    # kiểm tra, đóng gói (ghép local/), cài lên TV, mở app
```

| Lệnh | Làm gì |
|---|---|
| `tvdev.py check` | chặn cú pháp JS/CSS mà Chromium 69 của TV không hiểu |
| `tvdev.py debug --tv <IP>` | mở app ở chế độ debug; rồi `node tools/inspect.js --port 9333 --eval "…"` để chạy JS, gửi phím |
| `tvdev.py partner --tv <IP>` | ký bằng chứng chỉ Samsung Partner của Apps2Samsung (để TV khởi động hẳn vẫn tự mở màn hình chính); chuyển app đang cài sang chứng chỉ đó, giữ dữ liệu |
| `tvdev.py backup --tv <IP>` · `restore --tv <IP> file` | sao lưu và trả lại dữ liệu của app trên TV (cài đặt, ảnh từ điện thoại, từ đã học) vào `local/backup/` |
| `tvdev.py install --tv <IP> app.wgt` | ký lại một file `.wgt` khác (TizenTube, game…) bằng chứng chỉ đang dùng và cài |
| `tvdev.py release` | đóng gói bản công khai (không có `local/`) vào `dist/` |
| `tools/preview.py` · `preview.py 8765 --public` | xem thử trên Chrome ở `http://localhost:8765`, có hoặc không ghép `local/` |
| `node --test tests/*.test.js` | test: lịch vạn niên, ngày lễ, câu nói, giá vàng, danh sách app, dịch vụ nền, bản dịch, chọn từ… |

**Cấu hình riêng khi tự build.** Mặc định nằm trong [app/config.js](app/config.js): dock, app ẩn, kênh YouTube, tên cổng
HDMI, mặc định của Cài đặt (ngôn ngữ, Học tiếng Anh, hình nền…). Cấu hình riêng của một nhà để trong `local/` (không lên
Git); `tvdev.py deploy` và `preview.py` ghép `local/` đè lên `app/`. Cài đặt đặt bằng điện thoại được ưu tiên hơn.

| File trong `local/` | Dùng để |
|---|---|
| `config.local.js` | ghi đè `app/config.js`: `familyName`, `location`/`locations`, `familyPhotos`, `birthdays`… (mẫu: `local.example/`) |
| `app-name.txt` | tên app trên Smart Hub (dòng đầu); đổi tên thì phải gỡ app rồi cài lại |
| `img/avatar.jpg` | ảnh avatar góc phải |
| `img/family/*.jpg` | ảnh gia đình 1920×1080 (tạo bằng `tools/photos.py`) |
| `backup/` | bản sao lưu dữ liệu trên TV (`tvdev.py backup`) |

**Khác:**
- **Dịch vụ nền**: `http://<IP TV>:8701/status` cho biết dịch vụ chạy từ lúc nào, đang canh app nào, nhật ký gần đây
  (kể cả từng lần kiểm tra sau khi TV bật).
- **Trạng thái một app**: `curl http://<IP TV>:8001/api/v2/applications/<id>` (YouTube dùng mã store `111299001912`).
- **Danh mục app và icon** ([app/js/apps.js](app/js/apps.js), [app/icons/](app/icons/)): `tools/sync_apps.py` đọc app
  trên một TV và dựng icon; app không có trong danh mục vẫn hiện, với tên và icon của chính TV.
- **Thêm chữ trên màn hình**: viết câu tiếng Việt trong `T('…')` (số, tên: `T('Còn {0} ngày', n)`), thêm bản tiếng Anh vào
  [app/js/i18n-en.js](app/js/i18n-en.js); chữ cố định trong `index.html` gắn thuộc tính `data-t`. `tests/i18n.test.js`
  báo câu nào còn thiếu.
- **Phát hành**: đẩy tag `v<phiên bản>` (phiên bản lấy từ `app/config.xml`); workflow
  [release.yml](.github/workflows/release.yml) chạy test, đóng gói và gắn `NhaMinh-<phiên bản>.wgt` vào GitHub Release;
  release notes viết tay (`gh release edit v<phiên bản> --notes-file …`). Danh mục của Apps2Samsung tự lấy bản mới.

## Cách hoạt động

- **Danh sách app**: lấy từ chính TV (`tizen.application.getAppsInfo`), lọc ra các app người dùng thấy trong mục Ứng
  dụng. App có trong danh mục (`apps.js`) dùng icon và mô tả đẹp, app khác dùng tên và icon của TV.
- **Dịch vụ nền** ([app/service/watch.js](app/service/watch.js)), vì Samsung không cho app tự cài làm nút Home:
  - chạy khi TV khởi động (`on-boot="true"`; Tizen chỉ cho phép với app ký cấp Partner, Apps2Samsung tự ký cấp này khi
    thấy thuộc tính đó) và tự chạy lại nếu bị tắt (`auto-restart`);
  - hỏi REST API của chính TV (`127.0.0.1:8001`) mỗi 0,3 giây: app đang canh tắt, hoặc khuất quá 1,2 giây, thì mở lại
    màn hình chính; khi không có app nào được mở từ đây, vài giây một lần dò app đang hiện để canh luôn;
  - TV vừa bật (thức dậy hoặc khởi động hẳn): đưa màn hình chính lên và giữ ở trước trong 20 giây đầu (khởi động hẳn:
    gần 1 phút), vì Smart Hub hay app cuối cùng của TV có thể lên muộn; mở một app từ màn hình chính là thôi ngay;
  - TizenBrew, TizenTube tự tắt rồi mở lại dưới trình gỡ lỗi khi Host PC IP là `127.0.0.1`: dịch vụ chờ chúng mở lại;
  - đóng app chạy ẩn quá lâu để giải phóng RAM.
- **Trang cài đặt bằng điện thoại**: dịch vụ nền chạy một máy chủ web nhỏ ở cổng 8701, phục vụ
  [app/service/setup.html](app/service/setup.html). Những gì điện thoại gửi lên (bắt buộc kèm mã PIN) chờ trong dịch vụ,
  tới khi màn hình chính lấy về và lưu ([app/js/profile.js](app/js/profile.js)).
- **Mở thẳng video YouTube**: app-control `PAYLOAD` dạng `v=<mã video>&t=0`, giống điện thoại cast lên TV.
- **Hai thứ tiếng** ([app/js/i18n.js](app/js/i18n.js)): chữ trong code viết bằng tiếng Việt, bọc trong `T()`; giao diện
  tiếng Anh tra bảng [i18n-en.js](app/js/i18n-en.js). Ngôn ngữ chọn một lần lúc mở app (`auto` theo `navigator.language`
  của TV); đổi ngôn ngữ thì app tải lại. Mỗi nguồn nội dung có bản theo ngôn ngữ và kho riêng.
- **Học tiếng Anh** ([app/js/words.js](app/js/words.js)):
  - chọn từ: chủ đề kế tiếp trong hàng chờ → Datamuse trả các từ liên quan kèm độ phổ biến → giữ từ đơn, đúng trình độ,
    chưa học, không phải dạng biến đổi của từ đã học → từ học xong thành chủ đề về sau;
  - nội dung: Google Dịch (nghĩa tiếng Việt, định nghĩa, câu ví dụ, từ đồng nghĩa, dịch các câu), phiên âm IPA của
    dictionaryapi.dev (Wiktionary), Datamuse dự phòng; câu không hợp màn hình gia đình bị lọc;
  - phát âm: giọng đọc của Google Dịch phát bằng `<audio>`; phông Lexend thiếu ký hiệu IPA nên phiên âm dùng một phần nhỏ
    của Noto Sans (`app/fonts/NotoSans-IPA.ttf`, chỉ tải khi cần).
- **Mượt trên TV yếu**: hình nền vẽ sẵn vào canvas, chỉ 1–2 lớp toàn màn hình; các khối mờ dần có lớp riêng; ảnh giải mã
  xong mới chuyển; việc phụ dời sang lúc rảnh; thư viện webapis của Samsung tải sau khi màn hình chính đã hiện.

### Kho dữ liệu trên TV

Mở app là hiện ngay từ kho, chỉ tải mạng khi đã tới hạn. Kho nào cũng có giới hạn.

| Kho | Giữ | Làm mới |
|---|---|---|
| Ảnh nền (IndexedDB) | 30 ảnh ≈ 12 MB, xóa ảnh lâu không dùng nhất | ảnh kế tiếp tải sẵn |
| Ảnh gia đình, avatar (IndexedDB) | ảnh gửi từ điện thoại | khi gửi ảnh mới |
| Danh sách ảnh Bing | 120 ảnh gần nhất | mỗi ngày một lần |
| Câu nói hay | 600 danh ngôn (cộng dồn 50 câu mỗi ngày) và tục ngữ | mỗi ngày; tục ngữ mỗi tuần |
| Hàng YouTube | 12 video mới nhất | mỗi giờ |
| Tin mới | 40 tin | 20 phút |
| Giá vàng, tỷ giá | bản gần nhất | 30 phút |
| Ngày này năm xưa (IndexedDB) | mãi mãi, tối đa 366 trang ngày ≈ 1,5 MB | mỗi ngày chỉ tải một lần; tải sẵn 7 ngày tới |
| Thời tiết | mỗi nơi đã chọn một bản | khi bản đang có cũ hơn 20 phút |
| Học tiếng Anh (IndexedDB) | mọi từ đã học, mãi mãi (≈ 2 KB một từ), lịch sử từng ngày, hàng chờ chủ đề | mỗi ngày một từ; thêm từ khi bấm ▶ ở từ mới nhất |

Tin mới, ngày này năm xưa và câu nói hay có kho riêng cho từng ngôn ngữ.

## Cấu trúc

```
app/            app web Tizen: config.xml, index.html, css/, js/, service/ (dịch vụ nền, trang cài đặt), games/, icons/, img/
local.example/  mẫu cấu hình riêng khi tự build (chép thành local/, không lên Git)
tools/          tvdev.py (setup, check, deploy, debug, partner, backup, restore, install, release), tvdata/ (sao lưu,
                trả lại dữ liệu), preview.py, photos.py, sync_apps.py, tv.py, inspect.js, autostart.py
docs/           huong-dan-cai-dat.md, cai-dat-tv.md, screenshots/
tests/          test Node
.github/        workflow phát hành
```

## Giấy phép

[MIT](LICENSE) © 2026 Nguyễn Trọng Hoàng Việt. Mã của bên thứ ba giữ giấy phép riêng (xem [NOTICE](NOTICE)).

## Ghi công

Lấy cảm hứng từ [cleanyourtv](https://github.com/Gathin23/cleanyourtv) (Android TV). Giao diện port từ
[webos-vibehack](https://github.com/OmkarK97/webos-vibehack). Cài đặt nhờ [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung).
Game, font, thư viện QR và mã của bên thứ ba cùng giấy phép của chúng: xem [NOTICE](NOTICE).

Dữ liệu: Bing Image of the Day, [Open-Meteo](https://open-meteo.com) (CC BY 4.0), Wikipedia tiếng Việt, tiếng Anh và
Wikiquote tiếng Việt (CC BY-SA), [ZenQuotes](https://zenquotes.io), PNJ (giá vàng), Vietcombank (tỷ giá), RSS của
VnExpress, VnExpress International, Thanh Niên, Dân Trí, BBC và các kênh YouTube. Học tiếng Anh: [Datamuse](https://www.datamuse.com/api/),
[Free Dictionary API](https://dictionaryapi.dev) (dữ liệu Wiktionary, CC BY-SA), Google Dịch (nghĩa, bản dịch, giọng
đọc). Thuật toán âm lịch theo Hồ Ngọc Đức. Logo app trong `app/icons/` thuộc về chủ sở hữu của từng app.
