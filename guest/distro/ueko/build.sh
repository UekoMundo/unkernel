#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# The Ueko Linux image: Dockerfile plus what every image gets (guest/lib/oci.sh).
set -euo pipefail

. "$(dirname "$0")/../../lib/env.sh"
. "$guest/lib/stage.sh"
. "$guest/lib/image.sh"
. "$guest/lib/oci.sh"
. "$guest/distro/ueko/pins.sh"

# Ueko's name in os-release; ID_LIKE keeps Debian's tools working, and
# VERSION_CODENAME stays Debian's, which third-party apt sources ask for.
oci_extra() {
	local stage=$2 codename archive suite path sum lists="$dl/debian-lists" contents=()
	# Debian's image's own files: services, the docker shim, apt's settings and
	# the package that provides a missing command (its map: Debian's pins).
	rm -f "$stage/etc/sudoers.d/kw-user"   # read-only by now
	install_tree "$guest/distro/debian/rootfs" "$stage"
	chmod 440 "$stage/etc/sudoers.d/kw-user"
	. "$guest/distro/debian/pins.sh"
	while read -r path sum; do
		[ -n "$path" ] || continue
		contents+=("$lists/$DEBIAN_LISTS_SNAPSHOT/debian/trixie/$path")
		fetch_verified "https://snapshot.debian.org/archive/debian/$DEBIAN_LISTS_SNAPSHOT/dists/trixie/$path" "${contents[-1]}" "$sum"
	done <<< "$DEBIAN_CONTENTS"
	read -r archive suite path sum _ < <(awk '$2 == "trixie" && $3 ~ /Packages/' <<< "$DEBIAN_LISTS")
	fetch_verified "https://snapshot.debian.org/archive/$archive/$DEBIAN_LISTS_SNAPSHOT/dists/$suite/$path" "$lists/Packages.xz" "$sum"
	python3 -I "$guest/distro/debian/tools/commands.py" <(xz -dc "$lists/Packages.xz") "${contents[@]}" > "$stage/usr/lib/kw-commands"
	codename=$(. "$stage/etc/os-release"; echo "$VERSION_CODENAME")
	rm -f "$stage/etc/os-release"
	cat > "$stage/usr/lib/os-release" <<EOF
PRETTY_NAME="Ueko Linux $UEKO_VERSION"
NAME="Ueko Linux"
VERSION_ID="$UEKO_VERSION"
VERSION="$UEKO_VERSION"
VERSION_CODENAME=$codename
ID=ueko
ID_LIKE=debian
HOME_URL="https://linux.vineelsai.com/"
SUPPORT_URL="https://github.com/UekoMundo/unkernel"
BUG_REPORT_URL="https://github.com/UekoMundo/unkernel/issues"
EOF
	ln -s ../usr/lib/os-release "$stage/etc/os-release"
	echo "Ueko Linux $UEKO_VERSION \\n \\l" > "$stage/etc/issue"
	install_readme "$stage" debian NAME="Ueko Linux" USERLAND="Debian's glibc, GNU coreutils, bash" PKG="apt install" \
		MIRROR="Debian's and Ueko's" AUTO=KW_AUTO_APT DISTRO=ueko REPO=https://github.com/UekoMundo/unkernel
}
oci_distro ueko UEKO "$UEKO_VERSION" etc/bash.bashrc
