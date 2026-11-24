#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# The kernel bundle the images are built for and booted on: upstream's
# release that distro/kernel.json names, as vendor/build/bundle/unkernel.wasm
# (guest/ and the page need no kernel toolchain with it). To move to a newer
# one: merge upstream's main, then its release's tag and sha256 here.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
. "$root/kernel/tools/env.sh"   # build, fetch_verified
read -r repo tag sum < <(node -p 'const k = require(process.argv[1]); `${k.repository} ${k.tag} ${k.sha256}`' "$root/distro/kernel.json")
fetch_verified "https://github.com/$repo/releases/download/$tag/unkernel.wasm" "$build/bundle/unkernel.wasm" "$sum"
echo "$build/bundle/unkernel.wasm ($tag)"
