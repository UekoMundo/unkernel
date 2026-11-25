#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Boot an image on a base bundle (Node, as the page boots it) and check what
# every workspace needs: distro/tools/smoke.sh KERNEL NAME.erofs
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
kernel=${1:?KERNEL} image=${2:?IMAGE}
name=$(basename "$image" .erofs)
node "$root/guest/tools/vm-run.ts" "$kernel" "$image" --mem 1024 --net --shm --append "kw.wayland=1" --timeout 300 "
	set -e
	[ \"\$(cat /usr/lib/kw-distro)\" = $name ]
	. /etc/os-release; echo \"os: \$PRETTY_NAME, \$(uname -srm)\"
	u() { su -s /bin/sh user -c \"\$1\" 2>&1; }
	[ \"\$(u 'id -un')\" = user ] || { echo 'no user'; exit 1; }
	[ $name = alpine ] || [ \"\$(u 'sudo -n id -u')\" = 0 ] || { echo 'sudo does not work'; u 'sudo -n id -u'; exit 1; }
	u 'cd && touch w && rm w'
	case $name in
	alpine) apk --version ;;
	fedora*) rpm -q bash ;;
	arch* | omarchy) pacman -Q bash ;;
	*) dpkg-query -W bash ;;
	esac
	[ $name != ueko ] || { ueko info; dpkg-query -W ueko-base ueko-tools; }
	# A machine with its own init (guest/common/native): all of it came up.
	[ ! -e /usr/lib/systemd/system/kw-tty.service ] || {
		for i in \$(seq 120); do s=\$(systemctl is-system-running) || true; case \$s in running | degraded) break ;; esac; sleep 1; done
		systemctl --failed --no-legend --plain
		[ \"\$s\" = running ] || { echo \"systemd is \$s\"; systemctl list-jobs --no-pager; exit 1; }
		# The console signs in through PAM: logind has its session, and the user's own systemd runs.
		waitfor() { for i in \$(seq 60); do \"\$@\" >/dev/null 2>&1 && return; sleep 1; done; echo \"not there: \$*\"; exit 1; }
		session() { loginctl list-sessions --no-legend | grep -q ' user '; }
		waitfor session
		[ ! -s /usr/lib/kw-desktop ] || {
			for u in dbus.socket pipewire.socket; do waitfor systemctl --user -M user@ is-active \$u; done
			patient() { [ \"\$(systemctl --user -M user@ show -P DefaultTimeoutStartUSec)\" = 10min ]; } # user.conf.d/90-kw.conf
			waitfor patient
		}
	}
	echo smoke-ok" | tee /dev/stderr | grep -qx smoke-ok
