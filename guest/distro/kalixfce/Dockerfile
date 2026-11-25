# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Kali Linux with its Xfce desktop, menu and themes. Xfce runs on Wayland
# (labwc): an X server wants virtual terminals, which this kernel has none of.
FROM kalilinux/kali-rolling:latest@sha256:69a9a33d98a584a537bd0f7144d20c3b6d23f3bafa9ffcf0cadf4c5f186d02ff
ENV DEBIAN_FRONTEND=noninteractive
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/man/*\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\npath-exclude=/usr/share/help/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    systemd systemd-sysv dbus-user-session libpam-systemd udev polkitd network-manager \
    curl wget ca-certificates unzip procps less nano xz-utils zstd iproute2 htop tmux sudo git file bash-completion locales python3 \
    kali-desktop-xfce at-spi2-core adwaita-icon-theme kali-themes kali-menu kali-wallpapers-2025 labwc dbus-x11 xdg-desktop-portal-gtk firefox-esr \
    nmap netcat-openbsd dnsutils tcpdump hydra john sqlmap nikto whatweb gobuster \
    pipewire pipewire-pulse wireplumber libgl1-mesa-dri libegl-mesa0 libgles2 xwayland fonts-noto-color-emoji fonts-noto-core pipewire-alsa \
 && { groupadd -rf render; groupadd -rf input; } \
 && sed -i 's/^# en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/default/locale \
 && sed -i '/^Name: debconf\/frontend$/,/^$/ s/^Value: .*/Value: Noninteractive/' /var/cache/debconf/config.dat \
 && apt-get clean
# What xfdesktop shows on a monitor its settings do not name.
RUN mkdir -p /usr/share/images/desktop-base && ln -sfn /usr/share/backgrounds/kali-16x9/default /usr/share/images/desktop-base/default
RUN printf 'XDG_CURRENT_DESKTOP=XFCE\nXDG_SESSION_DESKTOP=xfce\nDESKTOP_SESSION=xfce\n' > /usr/lib/kw-desktop.env \
 && printf 'exec startxfce4 --wayland\n' > /usr/lib/kw-desktop
