# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
FROM ubuntu:26.04@sha256:d66b366dac61b575bee2aef07e9c26e8070096fbe84a3d4d3eb0da069b5d76db
ENV DEBIAN_FRONTEND=noninteractive
# No docs or locales in the image, now or after a later install.
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/man/*\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc \
 && rm -rf /usr/share/doc/* /usr/share/man/* /usr/share/locale/* /usr/share/info/*
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    curl wget ca-certificates unzip procps less nano xz-utils zstd iproute2 htop tmux sudo git foot fonts-dejavu-core \
 && { userdel -r ubuntu 2>/dev/null || true; } && { groupdel ubuntu 2>/dev/null || true; } && groupadd -rf input \
 && printf 'APT::Install-Recommends "false";\nDpkg::Use-Pty "false";\n' > /etc/apt/apt.conf.d/90kw \
 && rm -rf /var/log/apt /var/log/dpkg.log /var/cache/apt/archives/*.deb /var/lib/apt/lists/*
