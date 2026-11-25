# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Debian's KDE Plasma desktop, as its installer sets it up.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2
ENV DEBIAN_FRONTEND=noninteractive
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/man/*\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\npath-exclude=/usr/share/help/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    systemd systemd-sysv systemd-timesyncd dbus-user-session libpam-systemd udev polkitd network-manager \
    curl wget ca-certificates unzip procps less nano vim-tiny xz-utils zstd iproute2 htop tmux sudo git file bash-completion locales python3 strace \
    plasma-desktop plasma-workspace plasma-nm plasma-pa plasma-systemmonitor plasma-discover kwin-wayland systemsettings \
    konsole dolphin kate ark kcalc gwenview okular firefox-esr kde-config-gtk-style breeze-gtk-theme kscreen \
    desktop-base polkit-kde-agent-1 qt6-wayland xdg-desktop-portal-kde \
    libgl1-mesa-dri libegl-mesa0 libgles2 xwayland pipewire pipewire-pulse pipewire-alsa wireplumber \
    fonts-dejavu-core fonts-noto-core fonts-noto-color-emoji fonts-hack xdg-user-dirs xdg-utils \
 && { groupadd -rf render; groupadd -rf input; } \
 && sed -i 's/^# en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/default/locale \
 && sed -i '/^Name: debconf\/frontend$/,/^$/ s/^Value: .*/Value: Noninteractive/' /var/cache/debconf/config.dat \
 && apt-get clean
# No lock screen or blanking: the user has no password to come back with.
RUN mkdir -p /etc/xdg && printf '[Daemon]\nAutolock=false\nLockOnResume=false\n' > /etc/xdg/kscreenlockerrc \
 && printf '[Basic Settings]\nIndexing-Enabled=false\n' > /etc/xdg/baloofilerc
RUN printf 'XDG_CURRENT_DESKTOP=KDE\nXDG_SESSION_DESKTOP=KDE\nDESKTOP_SESSION=plasma\n' > /usr/lib/kw-desktop.env \
 && printf 'exec startplasma-wayland\n' > /usr/lib/kw-desktop
# Plasma's units give themselves 40 seconds to start, which a first start on
# an emulated CPU does not keep; the splash screen never does.
RUN mkdir -p /usr/lib/systemd/user/plasma-.service.d && printf '[Service]\nTimeoutStartSec=10min\n' > /usr/lib/systemd/user/plasma-.service.d/90-kw.conf \
 && printf '[KSplash]\nEngine=none\nTheme=None\n' > /etc/xdg/ksplashrc \
 && mkdir -p /etc/systemd/user && ln -sfn /dev/null /etc/systemd/user/plasma-ksplash.service
