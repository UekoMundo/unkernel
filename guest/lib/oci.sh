# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Sourced by the build.sh of a distro that is a Dockerfile (bash, after
# env.sh, stage.sh and image.sh): its root file system is built by docker for
# linux/arm64 (natively on an arm64 host, else through qemu binfmt), then
# gets what every image needs, like the upstream ones (guest/README.md).
#
#   oci_distro NAME VAR VERSION BASHRC
#       NAME/Dockerfile -> NAME.erofs. VAR_TARBALL=file is used instead of a
#       docker build. BASHRC: the image's file for interactive shells.
#       oci_extra, when defined, runs on $stage before the image is made.
#
# The Dockerfile must leave: bash, sudo, a sudo (or wheel) group and the
# groups audio, video, input and users, and nobody with uid or gid 1000.
# The rest comes from guest/distro/debian's rootfs (PID 1, poweroff, the
# sudo rule, the prompt) and from NAME/rootfs, when there is one.

oci_shared=(usr/local/sbin/kw-init usr/local/sbin/poweroff usr/local/sbin/halt usr/local/sbin/reboot
	etc/sudoers.d/kw-user etc/profile.d/kw-prompt.sh)

oci_tarball() {
	local name=$1 t="$2_TARBALL"
	[ -z "${!t:-}" ] || return 0
	printf -v "$t" '%s' "$dl/$name-rootfs.tar.gz"
	mkdir -p "$dl"
	echo "$name: docker build" >&2
	docker buildx build --platform linux/arm64 --provenance=false --output "type=tar,dest=$dl/$name-rootfs.tar" "$guest/distro/$name" >&2
	gzip -nf1 "$dl/$name-rootfs.tar"
}

# The image's relay for Wayland apps as windows in the page: Debian's pin.
oci_wlandr() {
	(
		. "$guest/distro/debian/pins.sh"
		fetch_verified "$WLANDR_URL" "$dl/$WLANDR_TARBALL" "$WLANDR_SHA256"
		mkdir -p "$1/usr/lib/kw"
		tar -xzf "$dl/$WLANDR_TARBALL" -O wlandr > "$1/usr/lib/kw/wlandr"
		chmod 755 "$1/usr/lib/kw/wlandr"
	)
}

oci_distro() {
	local name=$1 var=$2 version=$3 bashrc=$4 f g admin shared
	umask 022
	oci_tarball "$name" "$var"
	distro_unpack "$name" "$var"
	local tarball="$2_TARBALL"
	for g in bash sudo; do
		[ -x "$stage/usr/bin/$g" ] || [ -L "$stage/usr/bin/$g" ] || { echo "$name: no /usr/bin/$g" >&2; exit 1; }
	done
	# What a container build leaves behind.
	rm -rf "$stage/.dockerenv" "${stage:?}/dev" "${stage:?}/proc" "${stage:?}/sys" "${stage:?}/run" "${stage:?}/tmp"
	mkdir -p "$stage"/{dev,proc,sys,run,tmp,data}
	chmod 1777 "$stage/tmp"
	rm -f "$stage/etc/resolv.conf" "$stage/etc/hostname" "$stage/etc/hosts" "$stage/usr/sbin/policy-rc.d"
	: > "$stage/etc/resolv.conf"
	echo "$name" > "$stage/etc/hostname"
	printf '127.0.0.1\tlocalhost\n127.0.1.1\t%s\n::1\tlocalhost ip6-localhost ip6-loopback\n' "$name" > "$stage/etc/hosts"
	shared=$(mktemp -d)
	for f in "${oci_shared[@]}"; do
		mkdir -p "$shared/$(dirname "$f")"
		cp -a "$guest/distro/debian/rootfs/$f" "$shared/$f"
	done
	install_tree "$shared" "$stage"
	rm -rf "$shared"
	chmod 440 "$stage/etc/sudoers.d/kw-user"
	[ ! -d "$guest/distro/$name/rootfs" ] || install_tree "$guest/distro/$name/rootfs" "$stage"
	install_common "$stage"
	oci_wlandr "$stage"
	[ -e "$stage/$bashrc" ] || { echo "$name: no /$bashrc" >&2; exit 1; }
	printf '\n%s\n%s\n' '# unkernel: the kw profile files in interactive shells that are not login shells too' \
		'[ -r /usr/lib/kw/shrc ] && . /usr/lib/kw/shrc' >> "$stage/$bashrc"
	if grep -q '^sudo:' "$stage/etc/group"; then admin=sudo; else admin=wheel; fi
	install_user "$stage" /bin/bash "$admin" audio video input users
	[ -e "$stage/home/user/README" ] || cat > "$stage/home/user/README" <<EOF
$(. "$stage/etc/os-release"; echo "$PRETTY_NAME") on a Linux kernel compiled to WebAssembly.

You are "user"; sudo needs no password. Changes are kept on this
workspace's disk, in your browser. Source: https://github.com/UekoMundo/unkernel
EOF
	! declare -F oci_extra >/dev/null || oci_extra "$name" "$stage"
	# The warm set (image.sh), which the page fetches in the background after
	# the boot: what the first commands read, over the network otherwise a
	# file at a time.
	KW_WARM_SCRIPT="${KW_WARM_SCRIPT:-} sudo -u user sudo -n true; df >/dev/null; less --version >/dev/null
		! command -v apt-cache >/dev/null || { apt-cache policy bash; apt-get -s install git; dpkg -l; } >/dev/null 2>&1
		! command -v dnf >/dev/null || dnf --version >/dev/null 2>&1
		! command -v pacman >/dev/null || pacman -Q >/dev/null 2>&1
		! command -v python3 >/dev/null || python3 -c pass
		true"
	KW_WARM_EXCLUDE="var/lib/apt/lists/*"
	KW_DISTRO_FORMATS="${KW_OCI_FORMATS:-erofs}" distro_images "$name" "$stage" "${!tarball}" "$name-$version" "${user_owner[@]}"
}
