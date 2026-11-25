# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Fedora KDE Plasma Desktop Edition. Its repositories are set as guest/distro/fedora's.
FROM fedora:44@sha256:15da97ed9aa94dd3d92c3925eb89520f6c80e07ea7ee24cba848d1f8b6912b3e
RUN printf 'install_weak_deps=False\ntsflags=nodocs\n' >> /etc/dnf/dnf.conf \
 && dnf install -y systemd systemd-pam systemd-udev dbus-daemon polkit NetworkManager \
    curl wget ca-certificates unzip procps-ng less nano xz zstd iproute htop tmux sudo git which tar file bash-completion glibc-langpack-en \
    mesa-dri-drivers mesa-libEGL libglvnd-gles xorg-x11-server-Xwayland pipewire pipewire-pulseaudio pipewire-alsa wireplumber \
    default-fonts-core-sans default-fonts-core-emoji default-fonts-core-mono xdg-user-dirs xdg-utils util-linux strace \
    fedora-release-identity-kde-desktop --allowerasing \
 && dnf install -y plasma-desktop plasma-workspace kwin plasma-nm plasma-pa plasma-systemmonitor plasma-discover kscreen kscreenlocker \
    polkit-kde plasma-breeze breeze-icon-theme breeze-gtk kde-gtk-config kdeplasma-addons kinfocenter kmenuedit systemsettings xdg-desktop-portal-kde \
    konsole dolphin kwrite kate ark kcalc gwenview okular spectacle filelight firefox \
 && groupadd -rf input && groupadd -rf audio && groupadd -rf video && groupadd -rf users && groupadd -rf render \
 && printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf \
 && for r in fedora:releases/\$releasever/Everything/\$basearch/os fedora-updates:updates/\$releasever/Everything/\$basearch; do \
      f=/etc/yum.repos.d/${r%%:*}.repo; \
      sed -i "0,/^metalink=/s#^metalink=.*#baseurl=http://dl.fedoraproject.org/pub/fedora/linux/${r#*:}/#" $f && grep -q '^baseurl=http://dl.fedoraproject.org/' $f || exit 1; \
    done \
 && dnf clean all
# No lock screen or blanking: the user has no password to come back with.
RUN mkdir -p /etc/xdg && printf '[Daemon]\nAutolock=false\nLockOnResume=false\n' > /etc/xdg/kscreenlockerrc \
 && printf '[Basic Settings]\nIndexing-Enabled=false\n' > /etc/xdg/baloofilerc
RUN printf 'XDG_CURRENT_DESKTOP=KDE\nXDG_SESSION_DESKTOP=KDE\nDESKTOP_SESSION=plasma\n' > /usr/lib/kw-desktop.env \
 && printf 'exec startplasma-wayland\n' > /usr/lib/kw-desktop
