# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Kubuntu: Ubuntu with KDE Plasma.
FROM ubuntu:26.04@sha256:d66b366dac61b575bee2aef07e9c26e8070096fbe84a3d4d3eb0da069b5d76db
ENV DEBIAN_FRONTEND=noninteractive
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/man/*\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\npath-exclude=/usr/share/help/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc
# Ubuntu's Firefox is a snap, which needs squashfs mounts this kernel has not: Mozilla's packages instead.
RUN apt-get update -q && apt-get install -y -q --no-install-recommends ca-certificates wget \
 && wget -qO /usr/share/keyrings/mozilla.asc https://packages.mozilla.org/apt/repo-signing-key.gpg \
 && printf 'Types: deb\nURIs: https://packages.mozilla.org/apt\nSuites: mozilla\nComponents: main\nSigned-By: /usr/share/keyrings/mozilla.asc\n' > /etc/apt/sources.list.d/mozilla.sources \
 && printf 'Package: firefox*\nPin: origin packages.mozilla.org\nPin-Priority: 1000\n' > /etc/apt/preferences.d/mozilla
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    systemd systemd-sysv dbus-user-session libpam-systemd udev polkitd network-manager \
    curl wget ca-certificates unzip procps less nano xz-utils zstd iproute2 htop tmux sudo git file bash-completion locales python3 \
    plasma-desktop plasma-workspace plasma-nm plasma-pa plasma-systemmonitor plasma-discover kwin-wayland systemsettings kubuntu-settings-desktop \
    konsole dolphin kate ark kcalc gwenview okular kde-spectacle firefox kde-config-gtk-style breeze-gtk-theme kscreen \
    polkit-kde-agent-1 qt6-wayland xdg-desktop-portal-kde pipewire pipewire-pulse pipewire-alsa wireplumber \
    libgl1-mesa-dri libegl-mesa0 libgles2 xwayland fonts-noto-core fonts-noto-color-emoji fonts-hack xdg-user-dirs xdg-utils \
 && { userdel -r ubuntu 2>/dev/null || true; } && { groupdel ubuntu 2>/dev/null || true; } \
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
 && printf '[AC][Display]\nDimDisplayWhenIdle=false\nTurnOffDisplayWhenIdle=false\n[AC][SuspendAndShutdown]\nAutoSuspendAction=0\n' > /etc/xdg/powerdevilrc \
 && mkdir -p /etc/systemd/user && ln -sfn /dev/null /etc/systemd/user/plasma-ksplash.service
