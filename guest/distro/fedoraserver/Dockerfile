# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Fedora Server: systemd and a console. Its repositories are set as guest/distro/fedora's.
FROM fedora:44@sha256:15da97ed9aa94dd3d92c3925eb89520f6c80e07ea7ee24cba848d1f8b6912b3e
RUN printf 'install_weak_deps=False\ntsflags=nodocs\n' >> /etc/dnf/dnf.conf \
 && dnf install -y --allowerasing systemd systemd-udev dbus-daemon polkit NetworkManager util-linux fedora-release-identity-server \
    curl wget ca-certificates unzip procps-ng less nano vim-minimal xz zstd iproute htop tmux sudo git which tar file bash-completion glibc-langpack-en \
    openssh-clients bind-utils rsync jq gcc make python3 strace \
 && groupadd -rf input && groupadd -rf audio && groupadd -rf video && groupadd -rf users && groupadd -rf render \
 && printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf \
 && for r in fedora:releases/\$releasever/Everything/\$basearch/os fedora-updates:updates/\$releasever/Everything/\$basearch; do \
      f=/etc/yum.repos.d/${r%%:*}.repo; \
      sed -i "0,/^metalink=/s#^metalink=.*#baseurl=http://dl.fedoraproject.org/pub/fedora/linux/${r#*:}/#" $f && grep -q '^baseurl=http://dl.fedoraproject.org/' $f || exit 1; \
    done \
 && dnf clean all
