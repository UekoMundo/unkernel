#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# The session page as a tarball of static files, for another site's build to
# serve: distro/tools/page.sh OUT.tar.gz. index.html is session.html there
# (the site has its own), the images come from the catalog, the network from
# the site's Wisp server, and the precompressed copies, which are for Nitro's
# server, are left out.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
out=$(realpath -m "${1:?OUT.tar.gz}")
tag=$(node -p 'require(process.argv[1]).tag' "$root/distro/kernel.json")
export KW_LOCAL=0 KW_KERNEL_RELEASE="$tag"
export KW_CATALOG="${KW_CATALOG:-https://repo.vineelsai.dev/linux/images/catalog.json}"
export VITE_KW_WISP="${VITE_KW_WISP:-wss://wisp.vineelsai.com/}"
pnpm -C "$root" build:web
pub="$root/web/.output/public"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -r "$pub/." "$work/"
# Nitro keeps the page's HTML in its server bundle: ask it.
port=$((20000 + RANDOM % 20000))
HOST=127.0.0.1 PORT=$port node "$root/web/.output/server/index.mjs" > "$work/.server.log" 2>&1 &
server=$!
for _ in $(seq 50); do
	curl -fsS -o "$work/session.html" "http://127.0.0.1:$port/" 2>/dev/null && break
	sleep 0.2
done
kill "$server"
rm -f "$work/.server.log"
grep -q '<script type="module"[^>]* src="/assets/' "$work/session.html" || { echo "page: no page from the built server" >&2; exit 1; }
rm -rf "$work/distros"
find "$work" \( -name '*.br' -o -name '*.gz' -o -name '*.zst' \) -delete
mv "$work/licenses.md" "$work/licenses.txt"
grep -rlF '/licenses.md' "$work" --include='*.js' --include='*.html' | xargs -r sed -i 's#/licenses\.md#/licenses.txt#g'
rm -f "$work/index.html" "$work/manifest.webmanifest" "$work/smp-probe.html" "$work/profile.html"
git -C "$root" rev-parse HEAD > "$work/session-version.txt"
tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@0 -C "$work" -cf - . | gzip -n9 > "$out"
sha256sum "$out"
