# Nhà Mình: màn hình chính cho TV Samsung

Màn hình chính kiểu Apple TV cho Samsung UA50TU8500 (2020, Tizen 5.5), lấy cảm hứng từ
[cleanyourtv](https://github.com/Gathin23/cleanyourtv). Phần giao diện là bản port từ
[webos-vibehack](https://github.com/OmkarK97/webos-vibehack) (MIT). cleanyourtv chỉ chạy trên Android TV
(debloat bằng ADB). Trên Tizen không có ADB, không root, cũng không thay được nút Home. Vì vậy app web này
thay chỗ launcher, còn phần "debloat" làm bằng Cài đặt và DNS (xem [docs/cai-dat-tv.md](docs/cai-dat-tv.md)).

## Có gì

- **Màn hình chính:**
  - Dock 4 app: VTV GO, YouTube, Netflix, VieON (phím 1–4 trên remote mở thẳng).
  - Tên app hiện chữ lớn phía trên; khung kính sáng nhảy giữa các ô.
  - Giữ OK trên một ô để di chuyển ô đó.
  - **Hàng YouTube xổ ra:** di chuyển tới ô YouTube và dừng một lát thì video mới của các kênh Việt chọn sẵn hiện phía trên
    dock (tin tức, giải trí, âm nhạc, thiếu nhi). Bấm ▲ để chọn, OK để mở thẳng video, ▼ để gập lại. Lúc mở TV hay thoát app về, hàng này không tự
    bật, để khối Hôm nay và thời tiết luôn đọc được. Danh sách
    kênh nằm trong `youtubeChannels` của [app/config.js](app/config.js). Dùng RSS công khai, không cần API key.
  - **Tin mới:** ô đầu hàng thứ hai. Mở ra là 40 tin mới nhất từ VnExpress, Thanh Niên, Dân Trí, kèm ảnh và
    tóm tắt; ▲▼ để chọn, Back để đóng.
  - **Hôm nay:** xoay vòng *Ngày này năm xưa* (Wikipedia, cả thế giới), *Tin mới* và *Câu nói hay*. Mỗi lượt
    là một câu nói khác, luân phiên ba nguồn: 50 danh ngôn mới mỗi ngày của [ZenQuotes](https://zenquotes.io)
    (dịch sang tiếng Việt), ~130 câu chọn sẵn, và tục ngữ của Wikiquote tiếng Việt. Màn hình chờ đổi câu mỗi phút.
- **Góc trái:**
  - Lời chào và đồng hồ.
  - Ngày dương lịch và âm lịch.
  - Hàng "sắp tới" luôn hiện: Rằm/Mùng 1, ngày lễ hoặc sinh nhật, đếm ngược Tết.
- **Góc phải:** nút Nguồn vào (HDMI, truyền hình; đặt tên riêng cho cổng bằng `inputNames` trong
  [app/config.js](app/config.js)), Lịch, Cài đặt, avatar gia đình (bấm vào để mở màn hình chờ).
- **Widget thời tiết:** nhiệt độ, chất lượng không khí (AQI) kèm lời khuyên, dự báo 4 ngày tại Hà Nội,
  Hà Nội, và báo "có thể mưa sau ~N phút" khi sắp mưa trong 2 giờ tới. Dữ liệu từ Open-Meteo.
- **Lịch vạn niên** (nút Lịch): lưới tháng âm dương; OK trên một ngày mở trang *Xem ngày*: can chi, Trực,
  28 sao, nạp âm, giờ hoàng đạo, giờ xuất hành Lý Thuần Phong, hướng xuất hành, tuổi xung, Bành Tổ, ngày
  Tam nương/Nguyệt kỵ/Dương công, và ngày này năm xưa.
- **Hình nền:**
  - Ảnh Bing của 13 nước (mỗi nước có ảnh riêng mỗi ngày). Kho tự lớn dần tới 120 ảnh: mỗi lần làm mới thêm ảnh
    mới, ảnh cũ nhất rơi ra.
  - Tự đổi **mỗi giờ** (chỉnh được 5/15/30 phút, 3 giờ, mỗi ngày). Mốc lần đổi gần nhất được lưu lại: tắt TV một
    đêm, bật lên là có ảnh mới; chưa tới hạn thì vẫn ảnh cũ. Phím xanh lá: đổi ngay.
  - **Thư viện hình nền** (Cài đặt → Màn hình chính → Chọn hình nền): lưới ảnh Bing và ảnh gia đình; OK →
    *Dùng ảnh này* (đến hạn vẫn tự đổi) hoặc *Giữ cố định* (không đổi nữa, chọn *Bỏ cố định* để tự đổi lại).
  - Mở app là có ảnh ngay: ảnh đang dùng và ảnh kế tiếp được lưu trên TV (IndexedDB, tối đa 30 ảnh ≈ 12 MB, đầy
    thì xóa ảnh lâu không dùng nhất), kèm một bản 64×36 vẽ từ khung hình đầu tiên.
  - Hoặc *Ảnh gia đình*, *Kết hợp*, *Bầu trời theo giờ*, nền đen.
- **Màn hình chờ** sau 3 phút không bấm gì:
  - Ảnh chuyển mờ dần, xen ảnh gia đình.
  - Đồng hồ, ngày âm lịch, thời tiết.
  - Ban đêm tối hơn.
- **Thoát app là về đây:** một dịch vụ nền ([app/service/watch.js](app/service/watch.js)) theo dõi app vừa mở
  từ màn hình chính. App đó tắt thì dịch vụ mở lại màn hình chính (thường dưới 1 giây). Với YouTube, Back
  lùi trong app trước rồi mới hỏi "Thoát YouTube?"; nút Exit trên remote về thẳng.
- **Game** chơi bằng remote hoặc tay cầm Bluetooth (mã nguồn mở, MIT): Xếp gạch, 2048, Rắn săn mồi, Phá gạch.
- **Cài đặt** nhiều tầng như Apple TV (nút Cài đặt hoặc phím xanh dương):
  - Màn hình chờ.
  - Màn hình chính: hình nền, số ô mỗi hàng 4/5/6, đồng hồ, âm lịch, thời tiết, CPU/bộ nhớ.
  - Ứng dụng: ẩn/hiện từng app.
  - Thời tiết: chọn khu vực.
  - Thông tin TV, số lần mở lại / tải lại màn hình chính.
  - Cài đặt TV: mở thẳng cài đặt của Samsung (hẹn giờ tắt, hình, tiếng).

## Cập nhật lên TV (từ máy Mac)

Cần làm một lần: `tools/setup-mac.sh` (cài Tizen Studio CLI, tạo chứng chỉ ký app).

Trên TV, Developer Mode phải bật và **Host PC IP = IP của máy Mac**. Kiểm tra bằng cách mở Ứng dụng, bấm
`1 2 3 4 5`.

```bash
tools/deploy.sh                                 # kiểm tra, đóng gói, ký, cài, mở app
tools/.venv/bin/python tools/sync_apps.py       # sau khi cài/gỡ app trên TV: đồng bộ danh sách + icon
python3 tools/preview.py                        # xem thử trên Chrome: http://localhost:8765
node --test tests/*.test.js                     # test âm lịch, lịch vạn niên, ngày lễ, câu nói, ngày này năm xưa
```

- **Sửa mặc định:** chỉnh [app/config.js](app/config.js). Trong đó có tên gia đình, dock, vị trí thời tiết,
  sinh nhật người nhà (âm hoặc dương lịch), ảnh gia đình.
- **Thêm ảnh gia đình:** `tools/.venv/bin/python tools/photos.py ~/Downloads/anh1.jpg …` dựng ảnh 1920×1080 vào
  `app/img/family/` (ảnh dọc/vuông được đặt khung trên nền chính nó làm mờ) và tự cập nhật `familyPhotos`; rồi
  chạy `tools/deploy.sh`.
- **Debug trên TV:** `sdb shell 0 was_kill NhaMinh000.NhaMinh`, rồi `sdb shell 0 debug NhaMinh000.NhaMinh` in
  ra cổng; `sdb forward tcp:9333 tcp:PORT` (cổng máy Mac nên khác cổng TV, tránh trùng chương trình khác);
  rồi `node tools/inspect.js --port 9333 --eval "…"`.
- **Thử quay về:** `curl http://192.168.1.7:8001/api/v2/applications/<id>` cho biết app nào đang chạy/đang hiện.
- **Điều khiển TV từ máy:** `tools/.venv/bin/python tools/tv.py key KEY_HOME`.

## Cấu trúc

```
app/            app web Tizen (config.xml, index.html, css/, js/, games/, service/, icons/, fonts/)
tools/          setup-mac.sh, deploy.sh, check_compat.sh, sync_apps.py, tv.py, inspect.js, preview.py
docs/           cai-dat-tv.md: tắt theo dõi, quảng cáo, DNS, hình ảnh, AirPlay, gỡ bỏ
tests/          test âm lịch, lịch vạn niên (đối chiếu lichvannien.net), ngày lễ, nội dung
```

## Việc cần làm trên TV, hạn chế đã biết, gỡ bỏ

Xem [docs/cai-dat-tv.md](docs/cai-dat-tv.md): danh sách chốt ở đầu, hạn chế và cách gỡ ở cuối.
