#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# The Ubuntu image: Dockerfile plus what every image gets (guest/lib/oci.sh).
set -euo pipefail

. "$(dirname "$0")/../../lib/env.sh"
. "$guest/lib/stage.sh"
. "$guest/lib/image.sh"
. "$guest/lib/oci.sh"
. "$guest/distro/ubuntu/pins.sh"
oci_distro ubuntu UBUNTU "$UBUNTU_VERSION" etc/bash.bashrc
