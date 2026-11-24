#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# archgnome: Dockerfile plus what every native image gets (guest/lib/oci.sh).
set -euo pipefail

. "$(dirname "$0")/../../lib/env.sh"
. "$guest/lib/stage.sh"
. "$guest/lib/image.sh"
. "$guest/lib/oci.sh"
. "$guest/distro/archgnome/pins.sh"
native_distro archgnome ARCHGNOME "$ARCHGNOME_VERSION" etc/bash.bashrc
