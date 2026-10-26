# Hướng dẫn cài đặt

Khoảng 15 phút, không cần biết lập trình. Bạn cài app vào TV bằng **Apps2Samsung**, một công cụ miễn phí, mã nguồn mở,
có giao diện tiếng Việt, chạy trên **Windows, macOS, Linux** và **điện thoại Android**.

**Cần có:**
- TV Samsung chạy Tizen, đời 2017 trở đi. Đã kiểm tra kỹ trên đời 2020 (UA50TU8500, Tizen 5.5).
- Một máy tính (Windows, macOS hoặc Linux) **hoặc** một điện thoại Android, **cùng Wi-Fi với TV**.
- TV đời 2023 trở đi: một tài khoản Samsung (Apps2Samsung dùng nó để tạo chứng chỉ ký app, chỉ lần đầu).

> Nhà có router phụ (Xiaomi, TP-Link…) thì để router phụ ở chế độ **AP / Access Point**, hoặc cho TV và máy dùng để cài
> vào cùng một router. Hai thiết bị ở hai mạng khác nhau thì không thấy nhau.

## 1. Lấy địa chỉ IP

Cần IP của **máy dùng để cài** (máy tính hoặc điện thoại) và IP của **TV**.

| Thiết bị | Cách xem IP |
|---|---|
| Windows | *Cài đặt → Mạng và Internet →* mạng đang dùng *→ Thuộc tính → Địa chỉ IPv4*. Hoặc gõ `ipconfig` trong Command Prompt. |
| macOS | *Cài đặt hệ thống → Wi-Fi →* **Chi tiết…** bên cạnh mạng đang dùng *→ TCP/IP*. |
| Linux | `ip addr` (dòng `inet 192.168…` của card mạng đang dùng). |
| Android | *Cài đặt → Wi-Fi →* bấm vào mạng đang dùng *→ Địa chỉ IP* (có máy ở mục *Nâng cao*). |
| TV | *Cài đặt → Tổng quát → Mạng → Trạng thái mạng → Cài đặt IP*. |

Nên đặt **IP cố định** (DHCP reservation) cho TV và máy dùng để cài trong trang quản trị router, để lần sau không phải
làm lại bước 2.

## 2. Bật Developer Mode trên TV

1. Bấm **Home** → chọn **Ứng dụng** (Apps).
2. Ở màn Ứng dụng, bấm lần lượt **1 2 3 4 5**. Remote không có phím số: bấm nút **123** để hiện bàn phím số trên màn
   hình (hoặc dùng bàn phím số trong app SmartThings trên điện thoại).
3. Hộp **Developer Mode** hiện ra: chuyển sang **On**, ô **Host PC IP** nhập IP của **máy dùng để cài** (bước 1), bấm
   **OK**.
4. **Khởi động lại TV hẳn**: rút điện TV 10–15 giây rồi cắm lại (hoặc giữ nút nguồn trên remote khoảng 5 giây đến khi
   hiện logo Samsung). Bấm tắt bình thường chỉ là cho TV ngủ, Developer Mode chưa có tác dụng.
5. Kiểm tra: mở lại **Ứng dụng**, thấy chữ **Developer Mode** ở góc trên là được.

Một số TV đảo ngược thứ tự số khi nhập IP. Nếu Apps2Samsung báo IP không khớp, mở lại hộp Developer Mode xem IP đã
lưu có đúng không.

## 3. Tải Apps2Samsung

Vào [github.com/Apps2Samsung/Apps2Samsung/releases](https://github.com/Apps2Samsung/Apps2Samsung/releases), mục
**Assets** của bản mới nhất:

| Máy | File tải |
|---|---|
| Windows | `Apps2Samsung-…-win-x64.msi` (hoặc gõ `winget install Apps2Samsung.Apps2Samsung`) |
| macOS chip Apple (M1, M2…) | `Apps2Samsung-…-macos-arm64.dmg` |
| macOS chip Intel | `Apps2Samsung-…-macos-x64.dmg` |
| Linux | `Apps2Samsung-…-linux-x64.AppImage` (cho quyền chạy: `chmod +x`), hoặc `.deb` / `.rpm` |
| Android | `Apps2Samsung-…-android.apk` (cho phép cài app từ nguồn này khi được hỏi) |

- **Windows** có thể hiện "Windows đã bảo vệ máy tính của bạn": bấm **Thông tin thêm → Vẫn chạy**.
- **macOS** có thể báo không mở được vì không xác định được nhà phát triển: chuột phải vào app → **Mở** → **Mở**.

## 4. Tải file app

Vào [github.com/meocong/prj-tv-samsung/releases/latest](https://github.com/meocong/prj-tv-samsung/releases/latest), tải
file **`NhaMinh-<phiên bản>.wgt`** ở mục Assets về máy (điện thoại: lưu vào thư mục Tải xuống).

## 5. Cài lên TV

1. Mở Apps2Samsung. Bấm **Quét để tìm TV**, hoặc nhập IP của TV.
2. Chọn TV của bạn.
3. Ở **Chọn một ứng dụng**, chọn **Custom WGT / TPK**, bấm **Duyệt…** và chọn file `NhaMinh-….wgt` vừa tải.
4. Bấm **Cài ngay**.
5. TV đời 2023 trở đi: lần đầu, Apps2Samsung mở trình duyệt để đăng nhập tài khoản Samsung và tạo chứng chỉ. Đăng nhập
   xong, việc cài tự chạy tiếp.

Thấy báo đã cài là xong. Trên TV: **Home → Ứng dụng → Nhà Mình**. Đưa ô này lên đầu thanh Home: chọn ô → bấm xuống →
**Di chuyển**.

## 6. Cá nhân hóa bằng điện thoại hoặc máy tính

Trên TV, mở màn hình chính → **Cài đặt** (bánh răng, hoặc phím xanh dương) → **Cài đặt bằng điện thoại / máy tính**. TV
hiện mã QR, một địa chỉ dạng `http://192.168.x.x:8701/` và mã PIN 6 số.

Trên điện thoại hoặc laptop **cùng Wi-Fi**: quét mã QR (hoặc gõ địa chỉ vào trình duyệt), nhập mã PIN, rồi đặt:
- **Tên nhà** (có nút ❤ để chèn trái tim), hiện trong lời chào và trên màn hình chờ.
- **Thành phố** cho thời tiết và chất lượng không khí: gõ tên rồi chọn trong danh sách.
- **Sinh nhật** người nhà (dương hoặc âm lịch), hiện ở hàng "Sắp tới" và trong Lịch.
- **Ảnh gia đình**: chọn nhiều ảnh một lúc. Ảnh được thu nhỏ ngay trên máy rồi mới gửi; ảnh dọc được đặt khung trên nền
  mờ. Ảnh hiện trên màn hình chờ và trong hình nền.
- **Ảnh avatar** ở góc phải màn hình.

TV nhận và tự cập nhật sau vài giây. Mọi thứ lưu trên TV. Trang này có cả tiếng Anh (nút *English* ở góc trên).

Giao diện trên TV theo ngôn ngữ menu của TV: tiếng Việt, hoặc tiếng Anh cho mọi ngôn ngữ khác. Đổi ở **Cài đặt →
Ngôn ngữ / Language**.

## 7. Cài đặt TV

Để bật TV là vào màn hình chính, bớt quảng cáo và theo dõi, TV nhẹ hơn: làm theo [cai-dat-tv.md](cai-dat-tv.md).

## YouTube không quảng cáo (TizenTube, không bắt buộc)

[TizenTube](https://github.com/reisxd/TizenTube) (mã nguồn mở, GPL-3.0, không thuộc dự án này) là YouTube bỏ quảng cáo
và tự bỏ qua đoạn tài trợ (SponsorBlock). Có YouTube Premium thì không cần. Nó là bản sửa của bên thứ ba, dùng hay
không là lựa chọn của bạn.

1. Tải ở [bản phát hành mới nhất của TizenTube](https://github.com/reisxd/TizenTube/releases/latest):
   - TV đời 2017–2020 (Tizen 3 đến 5.5): **`TizenTubeOld.wgt`**;
   - TV đời 2021 trở đi (Tizen 6+): **`TizenTubeCobalt.wgt`**.
2. Cài như bước 5: Apps2Samsung → *Custom WGT / TPK* → chọn file vừa tải → *Cài ngay*. Với `TizenTubeCobalt.wgt`,
   trước khi cài mở cài đặt (bánh răng) của Apps2Samsung, bật *Force Samsung Certificate* và *Partner Signing*.
   Người dùng `tools/tvdev.py` cài bằng: `python3 tools/tvdev.py install --tv <IP TV> TizenTubeOld.wgt`.
3. Trên màn hình chính, TizenTube hiện thành một ô ở các hàng dưới. Muốn nó thay YouTube trên dock: giữ OK trên ô để di
   chuyển. Hàng video trên dock vẫn mở bằng YouTube gốc: gửi một video sang TizenTube thì nó chỉ mở trang chủ YouTube.

**Host PC IP và TizenBrew.** TizenBrew, và TizenTube bản cho TV cũ khi muốn chạy ổn định nhất, cần ô *Host PC IP* trong
Developer Mode (bước 2) là **`127.0.0.1`**: chúng tự gắn trình gỡ lỗi của TV vào chính mình. Với IP của máy tính hay
điện thoại, TizenBrew không mở được module, còn TizenTube bản cũ chạy kiểu proxy (đôi khi phát video kém hơn).
Màn hình chính không cần Host PC IP để chạy, nên có thể để `127.0.0.1` hằng ngày; chỉ khi cài hay cập nhật app bằng
Apps2Samsung hoặc `tvdev.py` mới đổi tạm về IP của máy dùng để cài, cài xong đổi lại rồi khởi động lại TV.

## Cập nhật bản mới

Khi có bản mới, màn hình chính báo ở **Cài đặt → Thông tin**. Tải file `.wgt` mới (bước 4) rồi cài **bằng đúng cách đã
cài lần trước** (bước 5): cài đè giữ nguyên cài đặt và ảnh.

Đổi cách cài (ví dụ trước cài bằng công cụ dev, giờ dùng Apps2Samsung) thì TV báo chứng chỉ không khớp ("author
certificate not match"). Khi đó gỡ app trên TV trước (Ứng dụng → ⚙ → Nhà Mình → Xóa) rồi cài lại; cài đặt và ảnh trên
TV mất theo, đặt lại bằng điện thoại ở bước 6.

## Gặp lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| Apps2Samsung không thấy TV | TV đang bật? TV và máy cùng Wi-Fi? Router phụ có ở chế độ AP không? Thử nhập IP của TV thay vì quét. |
| Báo Developer Mode tắt, hoặc IP không khớp | Mở lại hộp Developer Mode (bước 2): Developer Mode **On** và Host PC IP đúng là IP **hiện tại** của máy dùng để cài. Sửa xong thì rút điện TV 10–15 giây. |
| Báo "author certificate not match" | App đã được cài bằng cách khác: gỡ app trên TV rồi cài lại (xem *Cập nhật bản mới*). |
| TV 2023+ báo lỗi chứng chỉ | Đăng nhập tài khoản Samsung khi Apps2Samsung mở trình duyệt; tài khoản cần có địa chỉ email. |
| Cài xong không thấy app | Home → **Ứng dụng** → kéo xuống cuối danh sách. |
| Điện thoại không mở được trang cài đặt | Điện thoại phải cùng Wi-Fi với TV (không dùng 4G). Mở màn hình chính trên TV một lần rồi tải lại trang. |
| Developer Mode tự tắt | Thường sau khi TV cập nhật phần mềm: bật lại theo bước 2. |

---

## Cho người muốn sửa code

Cần **Python 3.9+** và **Node.js**. Trên Windows thay `python3` bằng `py`.

```bash
git clone https://github.com/meocong/prj-tv-samsung.git && cd prj-tv-samsung
python3 tools/tvdev.py setup                  # Tizen Studio CLI, chứng chỉ ký app, môi trường Python (một lần)
python3 tools/tvdev.py deploy --tv <IP TV>    # kiểm tra, đóng gói, cài lên TV, mở app
```

`setup` tải bộ cài Tizen Studio 6.1 CLI đúng hệ điều hành (khoảng 280 MB, vào `C:\tizen-studio` hoặc `~/tizen-studio`);
trên Mac chip Apple, nó cài Rosetta 2 nếu chưa có. Chứng chỉ ký app là chứng chỉ Tizen thường, dùng được cho TV đời
2017–2022 ở Developer Mode; TV đời 2023 trở đi cần chứng chỉ Samsung (tạo bằng Certificate Manager của Tizen Studio bản
có giao diện, rồi chạy với `TIZEN_PROFILE=<tên profile>`), hoặc cài file `.wgt` bằng Apps2Samsung.

Host PC IP trên TV phải là IP của máy chạy `tvdev.py`. Các lệnh khác, cách xem thử trên trình duyệt và cách debug: xem
[README → Phát triển](../README.md#phát-triển).
