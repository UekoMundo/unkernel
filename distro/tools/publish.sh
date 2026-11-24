#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Publish what a run built to the package bucket (repo.vineelsai.com/linux):
# the apt repository (linux/ueko/) and the images (linux/images/).
#
#   distro/tools/publish.sh [--dry-run] DEBS-DIR IMAGES-DIR
#
# Needs AWS credentials for the bucket and, unless --dry-run, the archive key
# $UEKO_ARCHIVE_KEY_ID in gpg's keyring. Nothing published is ever deleted or
# replaced but the indexes; content goes up first, the indexes that name it
# last, so a reader never sees a name without its file, and a run that stops
# halfway is finished by running it again.
set -euo pipefail

dry=()
if [ "${1:-}" = --dry-run ]; then dry=(--dryrun); shift; fi
debs=${1:?DEBS-DIR} images=${2:?IMAGES-DIR}
here="$(cd "$(dirname "$0")" && pwd)"
bucket="${UEKO_BUCKET:-repo.vineelsai.com}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export UEKO_PUBLISHED="$work/published"
mkdir -p "$UEKO_PUBLISHED/ueko/dists" "$UEKO_PUBLISHED/images"
# Any failure but "there is none" stops the run here.
aws s3 sync --only-show-errors "s3://$bucket/linux/ueko/dists/" "$UEKO_PUBLISHED/ueko/dists/"
aws s3 sync --only-show-errors --exclude '*' --include catalog.json "s3://$bucket/linux/images/" "$UEKO_PUBLISHED/images/"

out="$work/out"
key=()
[ ${#dry[@]} = 0 ] && key=(--key "${UEKO_ARCHIVE_KEY_ID:?}")
node "$here/apt-repo.mjs" "$debs" "$out" "${key[@]}"
node "$here/catalog.mjs" "$images" "$out"

put() { aws s3 cp "${dry[@]}" --only-show-errors --recursive "$@"; }
forever="public, max-age=31536000, immutable" now="public, max-age=0, s-maxage=60, must-revalidate"
[ ! -d "$out/ueko/pool" ] || put "$out/ueko/pool/" "s3://$bucket/linux/ueko/pool/" --cache-control "$forever" --content-type application/vnd.debian.binary-package
put "$out/images/" "s3://$bucket/linux/images/" --exclude '*' --include '*.erofs' --cache-control "$forever" --content-type application/octet-stream
d="$out/ueko/dists/" t="s3://$bucket/linux/ueko/dists/"
put "$d" "$t" --exclude '*' --include '*/by-hash/*' --cache-control "$forever" --content-type application/octet-stream
put "$d" "$t" --exclude '*Release*' --exclude '*/by-hash/*' --cache-control "$now" --content-type text/plain
put "$d" "$t" --exclude '*' --include '*/Release' --include '*/Release.gpg' --cache-control "$now" --content-type text/plain
put "$d" "$t" --exclude '*' --include '*/InRelease' --cache-control "$now" --content-type text/plain
put "$out/images/" "s3://$bucket/linux/images/" --exclude '*' --include catalog.json --cache-control "$now" --content-type application/json
echo "published${dry[*]:+ (dry run)}"
