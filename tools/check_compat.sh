#!/usr/bin/env bash
# Chặn cú pháp JS và CSS mà Chromium 69 (Tizen 5.5) không hiểu, trước khi đưa lên TV.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0

# JS: ES2018 at most (no ?. ?? class fields, etc.)
for f in $(find "$ROOT/app" -name '*.js' -not -path '*/node_modules/*'); do
  if ! out=$(npx -y acorn@8 --ecma2018 --silent "$f" 2>&1); then
    echo "JS quá mới cho Tizen 5.5: ${f#$ROOT/}: $out"; fail=1
  fi
done

# CSS: properties and functions Chromium 69 lacks.
while IFS= read -r hit; do
  echo "CSS không chạy trên Tizen 5.5: ${hit#$ROOT/}"; fail=1
done < <(grep -nE '(^|[^-])inset:|backdrop-filter|aspect-ratio|:is\(|:where\(|clamp\(|[^a-z-]min\(|[^a-z-]max\(|(^|[;{ ])gap:|row-gap|column-gap' \
  $(find "$ROOT/app" -name '*.css') /dev/null | grep -v '^\s*/\*' | grep -vE '\.css:[0-9]+: \* ' || true)

[ $fail = 0 ] && echo "check_compat: OK"
exit $fail
