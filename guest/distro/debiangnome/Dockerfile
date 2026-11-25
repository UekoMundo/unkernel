# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Debian's GNOME desktop, as its installer sets it up.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2
ENV DEBIAN_FRONTEND=noninteractive
RUN printf "path-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/man/*\npath-exclude=/usr/share/locale/*\npath-exclude=/usr/share/info/*\npath-exclude=/usr/share/help/*\n" > /etc/dpkg/dpkg.cfg.d/kw-nodoc
RUN apt-get update -q && apt-get install -y -q --no-install-recommends \
    systemd systemd-sysv systemd-timesyncd dbus-user-session libpam-systemd udev polkitd network-manager \
    curl wget ca-certificates unzip procps less nano vim-tiny xz-utils zstd iproute2 htop tmux sudo git file bash-completion locales python3 strace \
    gnome-core gnome-terminal gnome-tweaks firefox-esr loupe gnome-text-editor file-roller desktop-base libgl1-mesa-dri libegl-mesa0 libgles2 xwayland pipewire pipewire-pulse pipewire-alsa wireplumber \
    fonts-dejavu-core fonts-noto-color-emoji fonts-cantarell xdg-user-dirs xdg-utils \
 && { groupadd -rf render; groupadd -rf input; } \
 && sed -i 's/^# en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/default/locale \
 && sed -i '/^Name: debconf\/frontend$/,/^$/ s/^Value: .*/Value: Noninteractive/' /var/cache/debconf/config.dat \
 && apt-get clean
# No lock screen (it needs GDM, which needs virtual terminals), no blanking
# and no first-run tour; updates only when asked for.
RUN printf '[org.gnome.desktop.lockdown]\ndisable-lock-screen=true\n[org.gnome.desktop.session]\nidle-delay=uint32 0\n[org.gnome.desktop.screensaver]\nlock-enabled=false\n[org.gnome.shell]\nwelcome-dialog-last-shown-version="999"\nfavorite-apps=["firefox-esr.desktop","org.gnome.Nautilus.desktop","org.gnome.Terminal.desktop","org.gnome.TextEditor.desktop","org.gnome.Software.desktop"]\n' > /usr/share/glib-2.0/schemas/90_kw.gschema.override \
 && if [ -e /usr/share/glib-2.0/schemas/org.gnome.software.gschema.xml ]; then printf '[org.gnome.software]\ndownload-updates=false\n' >> /usr/share/glib-2.0/schemas/90_kw.gschema.override; fi \
 && glib-compile-schemas /usr/share/glib-2.0/schemas
RUN printf 'XDG_CURRENT_DESKTOP=GNOME\nXDG_SESSION_DESKTOP=gnome\nDESKTOP_SESSION=gnome\n' > /usr/lib/kw-desktop.env \
 && printf 'exec gnome-session\n' > /usr/lib/kw-desktop
