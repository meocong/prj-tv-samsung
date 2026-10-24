#!/usr/bin/env bash
# Đóng gói app/ thành .wgt, ký bằng security profile, cài lên TV và mở app.
# Thư mục local/ (cấu hình, ảnh riêng của nhà bạn; không lên Git) được ghép đè lên app/ trước khi đóng gói,
# và local/app-name.txt (nếu có) là tên app trên Smart Hub.
#
#   tools/deploy.sh                 # TV mặc định 192.168.1.7
#   TV_HOST=192.168.1.20 tools/deploy.sh
#   tools/deploy.sh --no-run        # chỉ cài, không mở
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TV="${TV_HOST:-192.168.1.7}:26101"
PROFILE="${TIZEN_PROFILE:-nhaminh}"
APP_ID="NhaMinh000.NhaMinh"
export PATH="$HOME/tizen-studio/tools:$HOME/tizen-studio/tools/ide/bin:$PATH"

"$ROOT/tools/check_compat.sh"

sdb connect "$TV" >/dev/null
if ! sdb devices | grep -q "^$TV[[:space:]]*device"; then
  echo "Không thấy TV ở $TV. Kiểm tra: TV đang bật, Developer Mode bật, Host PC IP = IP của máy này." >&2
  exit 1
fi

BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
rsync -a --exclude '.DS_Store' --exclude '*.wgt' --exclude 'img/icon.svg' "$ROOT/app/" "$BUILD/app/"
if [ -d "$ROOT/local" ]; then
  rsync -a --exclude '.DS_Store' --exclude 'app-name.txt' "$ROOT/local/" "$BUILD/app/"
  if [ -s "$ROOT/local/app-name.txt" ]; then
    NAME="$(head -1 "$ROOT/local/app-name.txt" | sed -e 's/&/\&amp;/g')"
    perl -0pi -e "s|<name>[^<]*</name>|<name>$NAME</name>|; " "$BUILD/app/config.xml"
    perl -0pi -e "s|<title>[^<]*</title>|<title>$NAME</title>|" "$BUILD/app/index.html"
  fi
fi

tizen package -t wgt -s "$PROFILE" -o "$BUILD/out" -- "$BUILD/app" >"$BUILD/package.log" 2>&1 || { cat "$BUILD/package.log"; exit 1; }
# The package is named after <name> ("Nhà Mình.wgt"); the installer wants a plain file name.
mkdir -p "$ROOT/dist"
mv "$BUILD"/out/*.wgt "$ROOT/dist/NhaMinh.wgt"

if ! tizen install -n NhaMinh.wgt -s "$TV" -- "$ROOT/dist" >"$BUILD/install.log" 2>&1 ||
    ! grep -q "successfully installed" "$BUILD/install.log"; then
  cat "$BUILD/install.log"; exit 1
fi
echo "Đã cài $(du -h "$ROOT/dist/NhaMinh.wgt" | cut -f1) lên TV $TV"
[ "${1:-}" = "--no-run" ] || tizen run -p "$APP_ID" -s "$TV" | tail -1
