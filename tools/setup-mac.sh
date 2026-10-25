#!/usr/bin/env bash
# Một lần trên máy Mac: Rosetta 2, Tizen Studio CLI, chứng chỉ ký app, security profile "nhaminh" và môi trường
# Python cho các công cụ phụ (tools/tv.py, photos.py, sync_apps.py).
# Chạy lại an toàn: bước nào đã xong thì bỏ qua.
#
#   tools/setup-mac.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
DATA="$HOME/tizen-studio-data"
PROFILE="${TIZEN_PROFILE:-nhaminh}"
CERT_DIR="$DATA/keystore/author"
PASS_FILE="$DATA/$PROFILE.pass"
INSTALLER_URL="https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_macos-64.bin"

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }

# sdb và JDK đi kèm của Tizen Studio là x86_64: Apple Silicon cần Rosetta 2.
if [ "$(uname -m)" = "arm64" ] && ! /usr/bin/arch -x86_64 /usr/bin/true 2>/dev/null; then
  say "Cài Rosetta 2"
  softwareupdate --install-rosetta --agree-to-license
fi

if [ ! -x "$TIZEN_HOME/tools/ide/bin/tizen" ]; then
  say "Tải và cài Tizen Studio 6.1 CLI vào $TIZEN_HOME (~280 MB)"
  tmp="$(mktemp -d)"
  curl -fL -o "$tmp/installer.bin" "$INSTALLER_URL"
  chmod +x "$tmp/installer.bin"
  "$tmp/installer.bin" --accept-license "$TIZEN_HOME"
  rm -rf "$tmp"
fi
export PATH="$TIZEN_HOME/tools:$TIZEN_HOME/tools/ide/bin:$PATH"

mkdir -p "$DATA"
if [ ! -f "$PASS_FILE" ]; then
  # Mật khẩu chỉ nằm trên máy này, không bao giờ vào repo.
  openssl rand -hex 12 >"$PASS_FILE"
  chmod 600 "$PASS_FILE"
fi
PASS="$(cat "$PASS_FILE")"

if [ ! -f "$CERT_DIR/$PROFILE.p12" ]; then
  say "Tạo author certificate $CERT_DIR/$PROFILE.p12"
  tizen certificate -a "$PROFILE" -p "$PASS" -c VN -ct "Ha Noi" -n "Nha Minh" -f "$PROFILE"
fi

if ! tizen security-profiles list 2>/dev/null | grep -qw "$PROFILE"; then
  say "Tạo security profile $PROFILE"
  tizen security-profiles add -n "$PROFILE" -a "$CERT_DIR/$PROFILE.p12" -p "$PASS"
fi
tizen cli-config "default.profiles.path=$DATA/profile/profiles.xml" >/dev/null 2>&1 || true

if [ ! -x "$ROOT/tools/.venv/bin/python" ]; then
  say "Tạo môi trường Python tools/.venv (samsungtvws, Pillow)"
  python3 -m venv "$ROOT/tools/.venv"
  "$ROOT/tools/.venv/bin/pip" install -q --upgrade pip
  "$ROOT/tools/.venv/bin/pip" install -q samsungtvws pillow
fi

say "Xong. Thêm vào ~/.zshrc nếu muốn gõ lệnh trực tiếp:"
echo "  export PATH=\"$TIZEN_HOME/tools:$TIZEN_HOME/tools/ide/bin:\$PATH\""
