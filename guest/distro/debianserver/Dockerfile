# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Debian as its installer leaves it without a desktop: systemd and a console.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2
ENV DEBIAN_FRONTEND=noninteractive
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\npath-exclude=/usr/share/help/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    systemd systemd-sysv dbus-user-session libpam-systemd udev polkitd network-manager vim-tiny man-db \
    curl wget ca-certificates unzip procps less nano xz-utils zstd iproute2 htop tmux sudo git file bash-completion locales python3 \
    openssh-client bind9-dnsutils rsync jq build-essential \
 && { groupadd -rf render; groupadd -rf input; } \
 && sed -i 's/^# en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/default/locale \
 && sed -i '/^Name: debconf\/frontend$/,/^$/ s/^Value: .*/Value: Noninteractive/' /var/cache/debconf/config.dat \
 && apt-get clean
