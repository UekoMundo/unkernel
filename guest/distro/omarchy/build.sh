#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# omarchy: Dockerfile plus what every native image gets (guest/lib/oci.sh).
set -euo pipefail

. "$(dirname "$0")/../../lib/env.sh"
. "$guest/lib/stage.sh"
. "$guest/lib/image.sh"
. "$guest/lib/oci.sh"
. "$guest/distro/omarchy/pins.sh"
# Its lock screen asks for a password, and the user has none: an empty one, so
# that Enter opens it (Super+Escape, Lock); nothing locks by itself.
oci_extra() {
	sed -i 's/^user:\*:/user::/' "$2/etc/shadow"
	grep -q '^user::' "$2/etc/shadow"
}
native_distro omarchy OMARCHY "$OMARCHY_VERSION" etc/bash.bashrc
