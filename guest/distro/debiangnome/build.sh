#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# debiangnome: Dockerfile plus what every native image gets (guest/lib/oci.sh).
set -euo pipefail

. "$(dirname "$0")/../../lib/env.sh"
. "$guest/lib/stage.sh"
. "$guest/lib/image.sh"
. "$guest/lib/oci.sh"
. "$guest/distro/debiangnome/pins.sh"
native_distro debiangnome DEBIANGNOME "$DEBIANGNOME_VERSION" etc/bash.bashrc
