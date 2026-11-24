# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Fedora Workstation: GNOME. Its repositories are set as guest/distro/fedora's.
FROM fedora:44@sha256:15da97ed9aa94dd3d92c3925eb89520f6c80e07ea7ee24cba848d1f8b6912b3e
RUN printf 'install_weak_deps=False\ntsflags=nodocs\n' >> /etc/dnf/dnf.conf \
 && dnf install -y systemd systemd-udev dbus-daemon polkit NetworkManager \
    curl wget ca-certificates unzip procps-ng less nano xz zstd iproute htop tmux sudo git which tar file bash-completion glibc-langpack-en \
    mesa-dri-drivers mesa-libEGL libglvnd-gles xorg-x11-server-Xwayland pipewire-pulseaudio pipewire-alsa wireplumber \
    default-fonts-core-sans default-fonts-core-emoji default-fonts-core-mono xdg-user-dirs xdg-utils util-linux strace \
    fedora-release-identity-workstation --allowerasing \
 && dnf install -y --exclude=gnome-initial-setup gnome-shell gnome-session-wayland-session gnome-settings-daemon gnome-control-center gnome-software gnome-text-editor nautilus ptyxis \
    gnome-backgrounds f44-backgrounds-gnome desktop-backgrounds-gnome gnome-calculator gnome-calendar gnome-characters gnome-clocks gnome-contacts gnome-disk-utility gnome-font-viewer gnome-logs \
    gnome-system-monitor gnome-tweaks gnome-weather gnome-maps baobab loupe papers decibels snapshot file-roller gvfs-fuse gvfs-smb \
    gnome-shell-extension-background-logo fedora-workstation-backgrounds adwaita-fonts-all xdg-desktop-portal-gnome gnome-keyring gnome-keyring-pam firefox \
 && groupadd -rf input && groupadd -rf audio && groupadd -rf video && groupadd -rf users && groupadd -rf render \
 && printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf \
 && for r in fedora:releases/\$releasever/Everything/\$basearch/os fedora-updates:updates/\$releasever/Everything/\$basearch; do \
      f=/etc/yum.repos.d/${r%%:*}.repo; \
      sed -i "0,/^metalink=/s#^metalink=.*#baseurl=http://dl.fedoraproject.org/pub/fedora/linux/${r#*:}/#" $f && grep -q '^baseurl=http://dl.fedoraproject.org/' $f || exit 1; \
    done \
 && dnf clean all
# No lock screen (it needs GDM, which needs virtual terminals), no blanking
# and no first-run tour; updates only when asked for.
RUN printf '[org.gnome.desktop.lockdown]\ndisable-lock-screen=true\n[org.gnome.desktop.session]\nidle-delay=uint32 0\n[org.gnome.desktop.screensaver]\nlock-enabled=false\n[org.gnome.shell]\nwelcome-dialog-last-shown-version="999"\n' > /usr/share/glib-2.0/schemas/90_kw.gschema.override \
 && if [ -e /usr/share/glib-2.0/schemas/org.gnome.software.gschema.xml ]; then printf '[org.gnome.software]\ndownload-updates=false\n' >> /usr/share/glib-2.0/schemas/90_kw.gschema.override; fi \
 && glib-compile-schemas /usr/share/glib-2.0/schemas
RUN printf 'XDG_CURRENT_DESKTOP=GNOME\nXDG_SESSION_DESKTOP=gnome\nDESKTOP_SESSION=gnome\n' > /usr/lib/kw-desktop.env \
 && printf 'exec gnome-session\n' > /usr/lib/kw-desktop
