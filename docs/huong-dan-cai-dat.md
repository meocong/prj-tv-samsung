# Hướng dẫn cài đặt

Khoảng 10–15 phút, không cần biết lập trình. Bạn cài app vào TV bằng **Apps2Samsung**: công cụ miễn phí, mã nguồn mở,
có giao diện tiếng Việt, chạy trên **Windows, macOS, Linux** và **điện thoại Android**. Nhà Mình có sẵn trong danh sách ứng
dụng của Apps2Samsung, không cần tự tải file.

**Cần có**
- TV Samsung chạy Tizen, đời 2017 trở đi. Đã kiểm tra kỹ trên đời 2020 (UA50TU8500, Tizen 5.5).
- Một máy tính (Windows, macOS, Linux) **hoặc** một điện thoại Android, **cùng Wi-Fi với TV**.
- Một **tài khoản Samsung** (miễn phí, tạo ở [account.samsung.com](https://account.samsung.com)). Apps2Samsung dùng nó một
  lần để tạo chứng chỉ ký app cấp *Partner*: nhờ chứng chỉ này TV cho dịch vụ nền của Nhà Mình chạy ngay khi TV khởi
  động, nên rút điện hay mất điện xong bật lại vẫn vào thẳng màn hình chính.

> Nhà có router phụ (Xiaomi, TP-Link…) thì để router phụ ở chế độ **AP / Access Point**, hoặc cho TV và máy dùng để cài
> vào cùng một router. Hai thiết bị ở hai mạng khác nhau thì không thấy nhau.

**Các bước:** [1. Lấy IP](#1-lấy-địa-chỉ-ip) → [2. Bật Developer Mode](#2-bật-developer-mode-trên-tv) →
[3. Tải Apps2Samsung](#3-tải-apps2samsung) → [4. Cài Nhà Mình](#4-cài-nhà-mình) →
[5. Đưa lên đầu thanh Home](#5-đưa-ô-nhà-mình-lên-đầu-thanh-home) → [6. Cá nhân hóa](#6-cá-nhân-hóa-bằng-điện-thoại-hoặc-máy-tính) →
[7. Cài đặt TV](#7-cài-đặt-tv) → [8. App hay nên cài thêm](#8-cài-thêm-app-hay-không-bắt-buộc) ·
[Cập nhật](#cập-nhật-bản-mới) · [Gặp lỗi](#gặp-lỗi)

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

Vào [github.com/Apps2Samsung/Apps2Samsung/releases/latest](https://github.com/Apps2Samsung/Apps2Samsung/releases/latest),
mục **Assets**:

| Máy | File tải |
|---|---|
| Windows | `Apps2Samsung-…-win-x64.msi` (hoặc gõ `winget install Apps2Samsung.Apps2Samsung`) |
| macOS chip Apple (M1, M2…) | `Apps2Samsung-…-macos-arm64.dmg` |
| macOS chip Intel | `Apps2Samsung-…-macos-x64.dmg` |
| Linux | `Apps2Samsung-…-linux-x64.AppImage` (cho quyền chạy: `chmod +x`), hoặc `.deb` / `.rpm` |
| Android | `Apps2Samsung-…-android.apk` (cho phép cài app từ nguồn này khi được hỏi) |

- **Windows** có thể hiện "Windows đã bảo vệ máy tính của bạn": bấm **Thông tin thêm → Vẫn chạy**.
- **macOS** có thể báo không mở được vì không xác định được nhà phát triển: chuột phải vào app → **Mở** → **Mở**.

## 4. Cài Nhà Mình

1. Mở Apps2Samsung. Bấm **Quét để tìm TV**, hoặc nhập IP của TV. Chọn TV của bạn.
2. Ở **Chọn một ứng dụng**, tìm **Nhà Mình** (nhóm *Khác / Other*) rồi bấm **Cài ngay**.
3. **Lần đầu**, Apps2Samsung mở trình duyệt để đăng nhập tài khoản Samsung và tạo chứng chỉ. Đăng nhập **ngay** (trang chờ
   khoảng 10 phút); xong thì quay lại Apps2Samsung, việc cài tự chạy tiếp. Lần sau không phải đăng nhập nữa.
4. Thấy báo đã cài là xong. Trên TV: **Home → Ứng dụng → Nhà Mình**.

**Không thấy Nhà Mình trong danh sách** (Apps2Samsung bản cũ): tải file **`NhaMinh-<phiên bản>.wgt`** ở
[bản phát hành mới nhất](https://github.com/meocong/prj-tv-samsung/releases/latest), rồi ở **Chọn một ứng dụng** chọn
**Custom WGT / TPK** → **Duyệt…** → chọn file đó → **Cài ngay**. Điện thoại: lưu file vào thư mục Tải xuống trước.

## 5. Đưa ô Nhà Mình lên đầu thanh Home

Trên thanh Home của Samsung: chọn ô **Nhà Mình** → bấm xuống → **Di chuyển**, đưa về đầu tiên. Từ giờ bật TV là vào màn
hình chính, thoát app nào cũng quay về đây.

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

<img src="screenshots/setup-phone.jpg" alt="Trang cài đặt trên điện thoại" width="300">

Giao diện trên TV theo ngôn ngữ menu của TV: tiếng Việt, hoặc tiếng Anh cho mọi ngôn ngữ khác. Đổi ở **Cài đặt →
Ngôn ngữ / Language**.

## 7. Cài đặt TV

Để TV bớt quảng cáo và theo dõi, nhẹ hơn, hình đẹp hơn: làm theo [cai-dat-tv.md](cai-dat-tv.md) (mất khoảng 5 phút).

## 8. Cài thêm app hay (không bắt buộc)

Các app dưới đây đều có trong danh sách của Apps2Samsung: cài như bước 4, chọn tên app thay cho Nhà Mình. Cài xong,
app tự hiện thành một ô trên màn hình chính (ở các hàng dưới; giữ OK trên ô để di chuyển).

| App | Là gì | Ghi chú |
|---|---|---|
| **TizenTube** | YouTube không quảng cáo, tự bỏ qua đoạn tài trợ | Chọn file `TizenTubeOld.wgt` cho TV 2017–2020, `TizenTubeCobalt.wgt` cho TV 2021+ (xem [bên dưới](#youtube-không-quảng-cáo-tizentube)). Có YouTube Premium thì không cần. |
| **Aerial Screensaver** | 115 video màn hình chờ của Apple TV, 4K | |
| **Shmup Cup** | game bắn máy bay chơi bằng remote | đã thử trên TV 2020 |
| **Overscan** | trình duyệt web, chế độ máy tính, con trỏ bằng mũi tên | |
| **Moonlight**, **Tizen Steam Link**, **Chiaki-Tizen** | chơi game của PC, Steam Deck, PS4/PS5 trên TV | cần máy chơi game trong nhà |
| **Jellyfin**, **Tessel** | xem phim từ máy chủ phim, ổ chia sẻ (SMB), USB | cần NAS hoặc ổ USB |
| **Reolink Viewer**, **go2rtc**, **Camera PiP** | xem camera trong nhà | cần camera |

Cài nhiều app một lượt bằng dòng lệnh: tải `apps2samsung-cli` ở mục Assets của
[bản phát hành Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases) (file `Apps2Samsung-cli-…`), rồi:

```bash
apps2samsung-cli install "Nhà Mình" --tv <IP TV>
apps2samsung-cli install TizenTube --file TizenTubeOld.wgt --tv <IP TV>    # TV 2021+: --file TizenTubeCobalt.wgt
apps2samsung-cli install "Shmup Cup" --tv <IP TV>
apps2samsung-cli install "Aerial Screensaver" --tv <IP TV>
```

### YouTube không quảng cáo (TizenTube)

[TizenTube](https://github.com/reisxd/TizenTube) (mã nguồn mở, GPL-3.0, không thuộc dự án này) là YouTube bỏ quảng cáo
và tự bỏ qua đoạn tài trợ (SponsorBlock). Nó là bản sửa của bên thứ ba; dùng hay không là lựa chọn của bạn.

- Trong Apps2Samsung, chọn **TizenTube** rồi chọn file: **`TizenTubeOld.wgt`** cho TV 2017–2020 (Tizen 3 đến 5.5),
  **`TizenTubeCobalt.wgt`** cho TV 2021+ (Tizen 6+).
- Trên màn hình chính, TizenTube là một ô riêng; YouTube gốc vẫn ở dock. Muốn TizenTube thay YouTube trên dock: giữ OK
  trên ô để di chuyển. Hàng video trên dock vẫn mở bằng YouTube gốc: gửi một video sang TizenTube thì nó chỉ mở trang chủ.

**Host PC IP và TizenBrew.** TizenBrew, và TizenTube bản cho TV cũ khi muốn chạy ổn định nhất, cần ô *Host PC IP* trong
Developer Mode (bước 2) là **`127.0.0.1`**: chúng tự gắn trình gỡ lỗi của TV vào chính mình. Với IP của máy tính hay
điện thoại, TizenBrew không mở được module, còn TizenTube bản cũ chạy kiểu proxy (đôi khi phát video kém hơn). Màn hình
chính không cần Host PC IP để chạy, nên có thể để `127.0.0.1` hằng ngày; chỉ khi cài hay cập nhật app mới đổi tạm về IP
của máy dùng để cài, cài xong đổi lại rồi khởi động lại TV.

## Cập nhật bản mới

Khi có bản mới, màn hình chính báo ở **Cài đặt → Thông tin**. Cài lại **bằng đúng cách đã cài lần trước** (bước 4):
Apps2Samsung cài đè, giữ nguyên cài đặt và ảnh trên TV.

**Từ bản 1.3.1 trở về trước lên 1.4.0**: từ 1.4.0 app được ký cấp Partner (để TV khởi động hẳn vẫn tự mở màn hình
chính), nên TV coi là chứng chỉ khác: Apps2Samsung hỏi gỡ bản cũ, hoặc báo "author certificate not match". Gỡ bản cũ
(đồng ý, hoặc Ứng dụng → ⚙ → Nhà Mình → Xóa) rồi cài lại; cài đặt, ảnh gửi từ điện thoại và các từ tiếng Anh đã học trên
TV mất theo, đặt lại bằng điện thoại ở bước 6. (Ai dùng công cụ dev:
`tvdev.py partner --tv <IP TV>` chuyển sang chứng chỉ mới mà giữ dữ liệu.)

Đổi cách cài (ví dụ trước cài bằng công cụ dev, giờ dùng Apps2Samsung) cũng vậy: TV báo chứng chỉ không khớp ("author
certificate not match"); gỡ app trên TV (Ứng dụng → ⚙ → Nhà Mình → Xóa) rồi cài lại.

## Gặp lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| Apps2Samsung không thấy TV | TV đang bật? TV và máy cùng Wi-Fi? Router phụ có ở chế độ AP không? Thử nhập IP của TV thay vì quét. |
| Báo Developer Mode tắt, hoặc IP không khớp | Mở lại hộp Developer Mode (bước 2): Developer Mode **On** và Host PC IP đúng là IP **hiện tại** của máy dùng để cài. Sửa xong thì rút điện TV 10–15 giây. |
| Đăng nhập Samsung xong, trình duyệt báo không mở được `localhost:4794` | Apps2Samsung đã thôi chờ (quá khoảng 10 phút). Bấm cài lại và đăng nhập ngay khi trang mở. |
| Báo "author certificate not match" | App đã được cài bằng cách hay chứng chỉ khác: gỡ app trên TV rồi cài lại (xem *Cập nhật bản mới*). |
| Báo lỗi chứng chỉ, hoặc không tạo được chứng chỉ | Đăng nhập tài khoản Samsung khi Apps2Samsung mở trình duyệt; tài khoản cần có địa chỉ email. |
| Cài xong không thấy app | Home → **Ứng dụng** → kéo xuống cuối danh sách. |
| Rút điện xong bật lại không vào màn hình chính | Cài bằng Apps2Samsung bản mới (ký Partner), và Developer Mode vẫn **On**. Xem nhật ký: `http://<IP TV>:8701/status` trên máy cùng mạng. |
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
trên Mac chip Apple, nó cài Rosetta 2 nếu chưa có. Chứng chỉ nó tạo là chứng chỉ Tizen thường: cài được lên TV đời
2017–2022 ở Developer Mode, nhưng TV không cho dịch vụ nền chạy lúc khởi động.

Để có đủ tính năng (và cho TV đời 2023+), ký bằng **chứng chỉ Samsung Partner** của Apps2Samsung:

```bash
apps2samsung-cli cert --tv <IP TV> --partner --prepare   # một lần: đăng nhập tài khoản Samsung trong trình duyệt
python3 tools/tvdev.py partner --tv <IP TV>              # từ giờ tvdev.py ký bằng chứng chỉ đó; chuyển app đang cài
                                                         # sang (sao lưu → gỡ → cài → trả dữ liệu)
```

Host PC IP trên TV phải là IP của máy chạy `tvdev.py`. Các lệnh khác (sao lưu, debug, xem thử trên trình duyệt):
[README → Cho người muốn sửa code](../README.md#cho-người-muốn-sửa-code).
