# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Ubuntu Desktop: GNOME with Ubuntu's session, dock and theme.
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
    ubuntu-desktop-minimal ubuntu-session ubuntu-wallpapers yaru-theme-gnome-shell yaru-theme-gtk yaru-theme-icon yaru-theme-sound \
    ptyxis gnome-text-editor gnome-calculator gnome-characters gnome-clocks gnome-disk-utility gnome-font-viewer gnome-keyring gnome-logs gnome-tweaks \
    baobab loupe papers resources seahorse file-roller gvfs-fuse firefox xdg-desktop-portal-gnome gsettings-ubuntu-schemas libpam-gnome-keyring \
    pipewire pipewire-pulse wireplumber libgl1-mesa-dri libegl-mesa0 libgles2 xwayland fonts-ubuntu fonts-noto-color-emoji fonts-noto-core xcursor-themes strace \
 && { userdel -r ubuntu 2>/dev/null || true; } && { groupdel ubuntu 2>/dev/null || true; } \
 && { groupadd -rf render; groupadd -rf input; } \
 && sed -i 's/^# en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/default/locale \
 && sed -i '/^Name: debconf\/frontend$/,/^$/ s/^Value: .*/Value: Noninteractive/' /var/cache/debconf/config.dat \
 && apt-get clean
# No lock screen (it needs GDM, which needs virtual terminals), no blanking
# and no first-run tour; updates only when asked for.
RUN printf '[org.gnome.desktop.lockdown]\ndisable-lock-screen=true\n[org.gnome.desktop.session]\nidle-delay=uint32 0\n[org.gnome.desktop.screensaver]\nlock-enabled=false\n[org.gnome.shell]\nwelcome-dialog-last-shown-version="999"\n[org.gnome.shell:ubuntu]\nfavorite-apps=["firefox.desktop","org.gnome.Nautilus.desktop","org.gnome.Ptyxis.desktop","org.gnome.TextEditor.desktop","yelp.desktop"]\n' > /usr/share/glib-2.0/schemas/90_kw.gschema.override \
 && if [ -e /usr/share/glib-2.0/schemas/org.gnome.software.gschema.xml ]; then printf '[org.gnome.software]\ndownload-updates=false\n' >> /usr/share/glib-2.0/schemas/90_kw.gschema.override; fi \
 && glib-compile-schemas /usr/share/glib-2.0/schemas
RUN printf 'XDG_CURRENT_DESKTOP=ubuntu:GNOME\nXDG_SESSION_DESKTOP=ubuntu\nDESKTOP_SESSION=ubuntu\n' > /usr/lib/kw-desktop.env \
 && printf 'exec gnome-session --session=ubuntu\n' > /usr/lib/kw-desktop
