# Hướng dẫn cài đặt từ đầu

Khoảng 15–20 phút. Cần:

- TV Samsung chạy Tizen, đời 2017 trở đi (đã thử kỹ trên UA50TU8500, đời 2020, Tizen 5.5).
- Một máy Mac (Intel hoặc Apple Silicon), còn trống khoảng 1 GB.
- **TV và Mac cùng một mạng**, tức là cùng router. Nhà có router phụ (Xiaomi, TP-Link…) thì để nó ở chế độ AP/Access
  Point, hoặc cắm cả hai vào cùng một router. Router phụ chạy chế độ router thường sẽ chặn Mac nói chuyện với TV.

> Máy Windows hay Linux: các script trong `tools/` viết cho macOS. Cài
> [Tizen Studio CLI](https://developer.tizen.org/development/tizen-studio/download) cho máy của bạn rồi làm theo các
> lệnh `tizen` và `sdb` trong `tools/setup-mac.sh` và `tools/deploy.sh`.

## 1. Lấy địa chỉ IP

**IP của máy Mac**: *Cài đặt hệ thống → Wi-Fi →* bấm **Chi tiết…** bên cạnh mạng đang dùng *→ TCP/IP*. Hoặc gõ trong
Terminal:

```bash
ipconfig getifaddr en0      # Wi-Fi; nếu Mac cắm dây mạng thì thử en1
```

**IP của TV**: *Cài đặt → Tổng quát → Mạng → Trạng thái mạng → Cài đặt IP*. Ghi lại dạng `192.168.1.x`.

Nên đặt **IP cố định** (DHCP reservation) cho cả TV và Mac trong trang quản trị router. Nếu không, khi IP đổi phải làm
lại bước 2.

## 2. Bật Developer Mode trên TV

1. Bấm nút **Home** trên remote → chọn **Ứng dụng** (Apps).
2. Ở màn Ứng dụng, bấm lần lượt **1 2 3 4 5**.
   - Remote thông minh (One Remote) không có phím số: bấm nút **123** (có remote phải giữ nút ⏯ hoặc nút tròn nhiều
     màu) để hiện bàn phím số trên màn hình, rồi chọn 1, 2, 3, 4, 5.
   - Hoặc dùng bàn phím số trong app SmartThings trên điện thoại.
3. Hộp **Developer Mode** hiện ra: chuyển sang **On**, ô **Host PC IP** nhập **IP của máy Mac** (bước 1), bấm **OK**.
4. **Khởi động lại TV hẳn**: giữ nút nguồn trên remote khoảng 5 giây, đến khi TV tắt rồi hiện logo Samsung. Bấm tắt
   bình thường chỉ là cho TV ngủ, Developer Mode chưa có tác dụng.
5. Kiểm tra: mở lại **Ứng dụng**, thấy chữ **Developer Mode** ở góc trên màn hình là được.

Developer Mode có thể tự tắt sau khi TV cập nhật phần mềm. Khi đó làm lại bước này.

## 3. Chuẩn bị máy Mac (một lần)

```bash
git clone https://github.com/meocong/prj-tv-samsung.git
cd prj-tv-samsung
tools/setup-mac.sh
```

`setup-mac.sh` làm những việc sau, chạy lại nhiều lần cũng không sao:

- Cài Rosetta 2 trên Mac Apple Silicon (công cụ của Tizen là bản x86_64).
- Tải Tizen Studio 6.1 CLI (khoảng 280 MB) vào `~/tizen-studio`.
- Tạo chứng chỉ ký app (author certificate) và security profile tên `nhaminh`. Mật khẩu ngẫu nhiên nằm ở
  `~/tizen-studio-data/nhaminh.pass`, không bao giờ vào repo. Không cần tài khoản Samsung.
- Tạo môi trường Python `tools/.venv` cho các công cụ phụ (`tv.py`, `photos.py`, `sync_apps.py`).

## 4. Kết nối thử

```bash
~/tizen-studio/tools/sdb connect <IP TV>:26101
~/tizen-studio/tools/sdb devices
```

Thấy một dòng có tên model TV (ví dụ `UA50TU8500KXXV`) với trạng thái `device` là Mac đã nói chuyện được với TV.

## 5. Cá nhân hóa (tùy chọn)

Tên nhà, vị trí thời tiết, ảnh gia đình, avatar. Tất cả nằm trong thư mục `local/`, không lên Git:

```bash
cp -R local.example local
open -e local/config.local.js                                         # sửa tên nhà, vị trí
tools/.venv/bin/python tools/photos.py ~/Pictures/a.jpg ~/Pictures/b.jpg   # ảnh gia đình
cp ~/Pictures/avatar.jpg local/img/avatar.jpg                          # ảnh tròn góc phải
```

Chi tiết: [README → Cá nhân hóa](../README.md#cá-nhân-hóa).

## 6. Cài lên TV

```bash
TV_HOST=<IP TV> tools/deploy.sh
```

Lệnh này kiểm tra code, đóng gói, ký, cài và mở app. Thấy `Đã cài … lên TV` và màn hình chính hiện trên TV là xong. Mỗi
lần sửa gì, chạy lại đúng lệnh này.

Sau đó:

- **Đưa app lên đầu thanh Home**: Home → chọn ô app (mặc định **Nhà Mình**) → bấm xuống → **Di chuyển**.
- **Đồng bộ danh sách app** của TV bạn (app đã cài, icon, số lần mở). Lần đầu TV hỏi cho phép điều khiển, chọn
  **Cho phép**:

  ```bash
  TV_HOST=<IP TV> tools/.venv/bin/python tools/sync_apps.py && TV_HOST=<IP TV> tools/deploy.sh
  ```

## 7. Cài đặt TV

Tắt quảng cáo và theo dõi, đặt DNS chặn quảng cáo, chỉnh hình ảnh, cho TV tự tắt khi quên, và cách để bật TV là vào thẳng
màn hình chính: [docs/cai-dat-tv.md](cai-dat-tv.md).

## Gặp lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| `Không thấy TV ở …` hoặc `sdb devices` trống | Developer Mode đã bật và TV đã khởi động lại hẳn chưa? Host PC IP có đúng IP **hiện tại** của Mac không? Thử `ping <IP TV>`. Router phụ phải ở chế độ AP. |
| `sdb` báo `protocol fault` hay `target not found` | `~/tizen-studio/tools/sdb kill-server`, rồi `sdb connect <IP TV>:26101` lại. |
| Cài báo lỗi chữ ký hoặc chứng chỉ (signature, certificate) | Một số TV đời mới chỉ nhận chứng chỉ Samsung: cài [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download) bản có giao diện, mở **Certificate Manager**, tạo chứng chỉ **Samsung** (cần tài khoản Samsung, chọn TV đang kết nối), rồi chạy `TIZEN_PROFILE=<tên profile mới> tools/deploy.sh`. |
| Cài xong không thấy app | Home → **Ứng dụng** → kéo xuống cuối danh sách. |
| Mac đổi IP | Vào lại Developer Mode trên TV (bước 2) và sửa Host PC IP. |
| Muốn xem lỗi trong app | Xem mục *Phát triển* trong [README](../README.md#phát-triển): debug bằng `sdb` và `tools/inspect.js`. |

Gỡ bỏ toàn bộ: cuối [docs/cai-dat-tv.md](cai-dat-tv.md#gỡ-bỏ-toàn-bộ).
