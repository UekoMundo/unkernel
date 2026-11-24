# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Its repositories are the master server over plain http instead of the https
# metalink: the page answers that host from its CORS mirror. Packages are
# signed (gpgcheck); their metadata is not, as on any baseurl mirror.
FROM fedora:44@sha256:15da97ed9aa94dd3d92c3925eb89520f6c80e07ea7ee24cba848d1f8b6912b3e
RUN printf 'install_weak_deps=False\ntsflags=nodocs\n' >> /etc/dnf/dnf.conf \
 && dnf install -y curl wget ca-certificates unzip procps-ng less nano xz zstd iproute htop tmux sudo git foot dejavu-sans-mono-fonts which tar \
 && groupadd -rf input && groupadd -rf audio && groupadd -rf video && groupadd -rf users \
 && for r in fedora:releases/\$releasever/Everything/\$basearch/os fedora-updates:updates/\$releasever/Everything/\$basearch; do \
      f=/etc/yum.repos.d/${r%%:*}.repo; \
      sed -i "0,/^metalink=/s#^metalink=.*#baseurl=http://dl.fedoraproject.org/pub/fedora/linux/${r#*:}/#" $f && grep -q '^baseurl=http://dl.fedoraproject.org/' $f || exit 1; \
    done \
 && dnf clean all && rm -rf /var/log/dnf* /var/cache/* /var/lib/dnf/history* /usr/share/doc/* /usr/share/man/*
