# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Ueko Linux: Debian trixie with Ueko's own package repository
# (repo.vineelsai.com/linux/ueko, built from distro/apps/ in this repository)
# and what its desktop needs: a Wayland terminal, fonts, Python with GTK.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2
ENV DEBIAN_FRONTEND=noninteractive
# No docs or locales in the image, now or after a later install.
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/man/*\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc \
 && rm -rf /usr/share/doc/* /usr/share/man/* /usr/share/locale/* /usr/share/info/*
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    curl wget ca-certificates unzip procps less nano vim-tiny xz-utils zstd iproute2 htop tmux sudo libatomic1 \
    sysv-rc git jq file bash-completion foot fonts-dejavu-core fonts-noto-color-emoji python3 \
 && update-rc.d sudo disable \
 && groupadd -rf input \
 && sed -i '/^Name: debconf\/frontend$/,/^$/ s/^Value: .*/Value: Noninteractive/' /var/cache/debconf/config.dat
COPY rootfs-image/ /
# Ueko's own packages, as distro/tools/build-apps.mjs made them (debs/: the
# newest, which may not be published yet).
COPY debs/ /debs/
RUN dpkg -i /debs/*.deb && rm -rf /debs
# The docker image's apt hooks drop the package lists' cache, which this
# image keeps: parsing the lists again takes seconds on the emulated CPU.
RUN rm -f /etc/apt/apt.conf.d/docker-clean \
 && printf 'DPkg::Post-Invoke { "rm -f /var/cache/apt/archives/*.deb || true"; };\nDir::Cache::pkgcache "";\nAcquire::Languages "none";\n' > /etc/apt/apt.conf.d/80ueko \
 && chmod 644 /etc/apt/apt.conf.d/80ueko /etc/apt/sources.list.d/ueko.sources /usr/share/keyrings/ueko-archive-keyring.asc \
 && apt-get update -q -o Dir::Etc::sourcelist=/etc/apt/sources.list.d/debian.sources -o Dir::Etc::sourceparts=- && apt-cache gencaches \
 && rm -rf /var/log/apt /var/log/dpkg.log /var/cache/apt/archives/*.deb
