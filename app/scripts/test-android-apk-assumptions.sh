#!/usr/bin/env bash
# Verify Android APK packaging assumptions required by ThorCMS on Android.
#
# See Workaround 2 from docs/tech-caveats-and-choices.md: prefab templates and instances
# are shipped as .zip files because tauri-plugin-fs mishandles Android assets that
# are Stored (uncompressed) in the APK — openFd() reads the whole APK instead of the
# asset slice. Deflated (Defl:N) entries fail openFd() and use the InputStream path,
# which works.
#
# This script makes sure that the latest Android build tools would still choose to
# use Defl:N for assets with a .zip extension. (Otherwise, the same Tauri bug would
# also affect .zip assets)
#
# Usage:
#   ./scripts/test-android-apk-assumptions.sh [path/to/app.apk]
#
# With no argument, searches src-tauri/gen/android/app/build for a built APK.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFABS_ZIP_PREFIX="assets/prefabs/"
REQUIRED_ZIPS=(
  "assets/prefabs/instances/my-contact-card.zip"
  "assets/prefabs/templates/@tcms/template-example-info-card1.zip"
)

find_apk() {
  find "$APP_DIR/src-tauri/gen/android/app/build" \
    \( -path '*/outputs/apk/*' -o -path '*/intermediates/apk/*' \) \
    -name '*.apk' -type f 2>/dev/null | head -1
}

APK_PATH="${1:-}"
if [[ -z "$APK_PATH" ]]; then
  APK_PATH="$(find_apk || true)"
  if [[ -z "$APK_PATH" ]]; then
    echo "error: no APK found under src-tauri/gen/android/app/build/" >&2
    echo "Build one first (yarn tauri android build) or pass the APK path:" >&2
    echo "  $0 path/to/app.apk" >&2
    exit 1
  fi
fi

if [[ ! -f "$APK_PATH" ]]; then
  echo "error: APK not found: $APK_PATH" >&2
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "error: unzip is required" >&2
  exit 1
fi

echo "Checking Android APK assumptions: $APK_PATH"
echo

zip_listing="$(unzip -lv "$APK_PATH")"
failures=0
zip_count=0

while IFS= read -r line; do
  [[ "$line" == *"${PREFABS_ZIP_PREFIX}"* && "$line" == *.zip ]] || continue

  method="$(awk '{print $2}' <<<"$line")"
  entry_path="$(awk '{print $NF}' <<<"$line")"
  zip_count=$((zip_count + 1))

  if [[ "$method" == "Stored" ]]; then
    echo "FAIL  Stored (uncompressed): $entry_path"
    echo "      Stored .zip assets break tauri-plugin-fs on Android; use Defl:N or check noCompress."
    failures=$((failures + 1))
  elif [[ "$method" == Defl:* ]]; then
    echo "OK    $method: $entry_path"
  else
    echo "FAIL  unknown method '$method': $entry_path"
    failures=$((failures + 1))
  fi
done <<<"$zip_listing"

if [[ "$zip_count" -eq 0 ]]; then
  echo "error: no .zip entries under ${PREFABS_ZIP_PREFIX} in APK" >&2
  exit 1
fi

echo
echo "Required bundled zips:"
for required in "${REQUIRED_ZIPS[@]}"; do
  if grep -Fq " $required" <<<"$zip_listing"; then
    echo "OK    present: $required"
  else
    echo "FAIL  missing: $required"
    failures=$((failures + 1))
  fi
done

echo
if [[ "$failures" -gt 0 ]]; then
  echo "$failures assumption check(s) failed." >&2
  exit 1
fi

echo "All Android APK zip compression assumptions passed ($zip_count zip(s) under prefabs)."
