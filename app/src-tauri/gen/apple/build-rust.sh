#!/bin/sh
set -eu

YARN="$HOME/.local/bin/yarn-tcms"
if [ ! -e "$YARN" ]; then
	echo "error: $YARN not found (see README)" >&2
	exit 1
fi

# Xcode's PATH lacks nvm; yarn uses `#!/usr/bin/env node`. Prepend the Node bin
# directory from the yarn-tcms symlink so env resolves the correct Node.
YARN_REAL="$(readlink "$YARN" 2>/dev/null || true)"
if [ -n "$YARN_REAL" ]; then
	export PATH="$(dirname "$YARN_REAL"):$PATH"
fi

exec "$YARN" tauri ios xcode-script -v \
	--platform "${PLATFORM_DISPLAY_NAME:?}" \
	--sdk-root "${SDKROOT:?}" \
	--framework-search-paths "${FRAMEWORK_SEARCH_PATHS:?}" \
	--header-search-paths "${HEADER_SEARCH_PATHS:?}" \
	--gcc-preprocessor-definitions "${GCC_PREPROCESSOR_DEFINITIONS:-}" \
	--configuration "${CONFIGURATION:?}" \
	${FORCE_COLOR:-} \
	"${ARCHS:?}"
