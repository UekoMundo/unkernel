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
#   native_distro NAME VAR VERSION BASHRC
#       the same for an image that boots as an installed machine does: its
#       own systemd as PID 1 and its own desktop on the display, or its
#       console where the image names no session in /usr/lib/kw-desktop
#       (guest/common/native and NAME/rootfs), nothing of the page's desktop.
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

native_distro() { native=1 KW_DISTRO_REPORT=0 KW_BOOT_MAX=6291456 oci_distro "$@"; }

# What a native image has instead of Debian's PID 1: systemd's units and the
# session, started as their [Install] sections say.
oci_native() {
	local stage=$1 units="$1/etc/systemd/system" f
	install_tree "$guest/common/native" "$stage"
	mkdir -p "$units/sysinit.target.wants" "$units/graphical.target.wants"
	ln -sfn /usr/lib/systemd/system/kw-tty.service "$units/sysinit.target.wants/kw-tty.service"
	if [ -s "$stage/usr/lib/kw-desktop" ]; then
		ln -sfn /usr/lib/systemd/system/kw-desktop.service "$units/graphical.target.wants/kw-desktop.service"
		ln -sfn /usr/lib/systemd/system/graphical.target "$units/default.target"
		mkdir -p "$stage/etc/systemd/user/graphical-session.target.wants"
		ln -sfn /usr/lib/systemd/user/kw-desktop-ready.service "$stage/etc/systemd/user/graphical-session.target.wants/kw-desktop-ready.service"
	else
		ln -sfn /usr/lib/systemd/system/multi-user.target "$units/default.target"
	fi
	# The desktop's own unit, so no display manager. And this machine has no
	# kernel modules, swap, disks or firmware to look after.
	for f in gdm gdm3 sddm lightdm plasmalogin display-manager systemd-modules-load systemd-vconsole-setup systemd-hwdb-update \
		systemd-rfkill systemd-oomd systemd-networkd-wait-online NetworkManager-wait-online systemd-firstboot \
		multipathd e2scrub_reap fwupd fwupd-refresh ModemManager plymouth-start plymouth-quit-wait smartmontools \
		dnf-makecache apt-daily apt-daily-upgrade; do
		ln -sfn /dev/null "$units/$f.service"
	done
	for f in apt-daily apt-daily-upgrade fwupd-refresh dnf-makecache e2scrub_all fstrim man-db unattended-upgrades; do
		ln -sfn /dev/null "$units/$f.timer"
	done
	# What a desktop does in the background for hours on a real disk and costs
	# this CPU its first minutes: file indexing (the kernel has no Landlock and
	# no file handles for it either) and looking for updates.
	mkdir -p "$stage/etc/systemd/user" "$stage/etc/xdg/autostart"
	for f in localsearch-3 localsearch-control-3 tracker-miner-fs-3 tracker-extract-3 kde-baloo plasma-baloorunner; do
		ln -sfn /dev/null "$stage/etc/systemd/user/$f.service"
	done
	for f in org.gnome.Software org.gnome.Evolution-alarm-notify gnome-software-service tracker-miner-fs-3 localsearch-3 baloo_file org.kde.discover.notifier \
		update-notifier orca-autostart org.freedesktop.problems.applet print-applet; do
		[ ! -e "$stage/etc/xdg/autostart/$f.desktop" ] || printf '[Desktop Entry]\nType=Application\nName=%s\nExec=true\nHidden=true\n' "$f" > "$stage/etc/xdg/autostart/$f.desktop"
	done
	ln -sfn /dev/null "$units/multipathd.socket"
	# Made at the first boot of each workspace, kept on its disk.
	: > "$stage/etc/machine-id"
	[ ! -d "$stage/var/lib/dbus" ] || ln -sfn /etc/machine-id "$stage/var/lib/dbus/machine-id"
}

oci_distro() {
	local name=$1 var=$2 version=$3 bashrc=$4 f g admin shared host
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
	# A machine's name is its distro's (debiangnome: debian).
	host=$name
	[ -z "${native:-}" ] || for f in gnome kde xfce server; do host=${host%"$f"}; done
	echo "$host" > "$stage/etc/hostname"
	printf '127.0.0.1\tlocalhost\n127.0.1.1\t%s\n::1\tlocalhost ip6-localhost ip6-loopback\n' "$host" > "$stage/etc/hosts"
	[ -z "${native:-}" ] || oci_shared=(etc/sudoers.d/kw-user)
	shared=$(mktemp -d)
	for f in "${oci_shared[@]}"; do
		mkdir -p "$shared/$(dirname "$f")"
		cp -a "$guest/distro/debian/rootfs/$f" "$shared/$f"
	done
	install_tree "$shared" "$stage"
	rm -rf "$shared"
	chmod 440 "$stage/etc/sudoers.d/kw-user"
	[ -z "${native:-}" ] || oci_native "$stage"
	[ ! -d "$guest/distro/$name/rootfs" ] || install_tree "$guest/distro/$name/rootfs" "$stage"
	install_common "$stage"
	[ -n "${native:-}" ] || oci_wlandr "$stage"
	[ -e "$stage/$bashrc" ] || { echo "$name: no /$bashrc" >&2; exit 1; }
	[ -n "${native:-}" ] || printf '\n%s\n%s\n' '# unkernel: the kw profile files in interactive shells that are not login shells too' \
		'[ -r /usr/lib/kw/shrc ] && . /usr/lib/kw/shrc' >> "$stage/$bashrc"
	if grep -q '^sudo:' "$stage/etc/group"; then admin=sudo; else admin=wheel; fi
	install_user "$stage" /bin/bash "$admin" audio video input users ${native:+render}
	[ -n "${native:-}" ] || [ -e "$stage/home/user/README" ] || cat > "$stage/home/user/README" <<EOF
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
