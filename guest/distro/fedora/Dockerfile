# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
FROM fedora:44@sha256:15da97ed9aa94dd3d92c3925eb89520f6c80e07ea7ee24cba848d1f8b6912b3e
RUN printf 'install_weak_deps=False\ntsflags=nodocs\n' >> /etc/dnf/dnf.conf \
 && dnf install -y curl wget ca-certificates unzip procps-ng less nano xz zstd iproute htop tmux sudo git foot dejavu-sans-mono-fonts which tar \
 && groupadd -rf input && groupadd -rf audio && groupadd -rf video && groupadd -rf users \
 && dnf clean all && rm -rf /var/log/dnf* /var/cache/* /var/lib/dnf/history* /usr/share/doc/* /usr/share/man/*
