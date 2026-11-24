# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Arch Linux ARM with GNOME, as archinstall's profile sets it up.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2 AS fetch
RUN apt-get update -q && apt-get install -y -q --no-install-recommends curl ca-certificates gnupg dirmngr libarchive-tools
RUN set -e; cd /tmp; u=http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz; \
    curl -fsSL --retry 3 -o a.tar.gz $u; curl -fsSL --retry 3 -o a.tar.gz.sig $u.sig; \
    curl -fsSL --retry 3 "https://keyserver.ubuntu.com/pks/lookup?op=get&options=mr&search=0x68B3537F39A313B3E574D06777193F152BDBE6A6" | gpg --batch --import; \
    gpg --batch --status-fd 1 --verify a.tar.gz.sig a.tar.gz | grep -q 'VALIDSIG.*68B3537F39A313B3E574D06777193F152BDBE6A6'; \
    mkdir /root-arch; bsdtar -xpf a.tar.gz -C /root-arch

FROM scratch AS sys
COPY --from=fetch /root-arch/ /
# Pacman's download sandbox needs Landlock and a user namespace, which the
# build's container (and the guest's kernel) may not have.
# The mirror rotates between servers that are not always in step: a file an
# index names may be missing on the next, so the install is tried again.
RUN sed -i -e 's/^#DisableSandbox.*/DisableSandbox/' -e 's/^CheckSpace/#CheckSpace/' /etc/pacman.conf \
 && sed -i 's#^\[options\]#[options]\nNoExtract = usr/share/man/* usr/share/doc/* usr/share/info/* usr/share/locale/* usr/share/gtk-doc/* usr/share/help/*#' /etc/pacman.conf \
 && pacman-key --init && pacman-key --populate archlinuxarm \
 && { pacman -Rdd --noconfirm $(pacman -Qq | grep -E '^(linux-aarch64|linux-firmware.*|mkinitcpio.*)$') || true; } \
 && { n=0; until pacman -Syyu --noconfirm --needed sudo curl wget unzip less nano htop tmux git bash-completion zstd python \
    networkmanager polkit mesa xorg-xwayland pipewire pipewire-pulse pipewire-alsa wireplumber noto-fonts noto-fonts-emoji ttf-dejavu xdg-user-dirs xdg-utils firefox \
    gnome-shell gnome-session gnome-settings-daemon gnome-control-center gnome-backgrounds gnome-keyring gnome-console gnome-text-editor gnome-calculator gnome-calendar gnome-characters gnome-clocks gnome-disk-utility gnome-font-viewer gnome-logs gnome-system-monitor gnome-tweaks gnome-weather baobab loupe papers nautilus file-roller gvfs sushi xdg-desktop-portal-gnome; do n=$((n + 1)); [ $n -lt 6 ] || exit 1; sleep 20; done; } \
 && { userdel -r alarm || true; } && { groupdel alarm 2>/dev/null || true; } && groupadd -rf input && groupadd -rf render \
 && sed -i 's/^#en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf \
 && ln -sf /usr/lib/systemd/system/NetworkManager.service /etc/systemd/system/multi-user.target.wants/NetworkManager.service \
 && ln -sf /dev/null /etc/systemd/system/systemd-networkd.service && ln -sf /dev/null /etc/systemd/system/systemd-resolved.service && ln -sf /dev/null /etc/systemd/system/sshd.service \
 && { gpgconf --homedir /etc/pacman.d/gnupg --kill all; find /var/cache/pacman/pkg /boot /usr/lib/modules /usr/lib/firmware /usr/include /usr/share/man /usr/share/doc /usr/share/info /usr/share/locale /usr/share/gtk-doc -type f -delete; }
# No lock screen (it needs GDM, which needs virtual terminals), no blanking
# and no first-run tour; updates only when asked for.
RUN printf '[org.gnome.desktop.lockdown]\ndisable-lock-screen=true\n[org.gnome.desktop.session]\nidle-delay=uint32 0\n[org.gnome.desktop.screensaver]\nlock-enabled=false\n[org.gnome.shell]\nwelcome-dialog-last-shown-version="999"\n' > /usr/share/glib-2.0/schemas/90_kw.gschema.override \
 && if [ -e /usr/share/glib-2.0/schemas/org.gnome.software.gschema.xml ]; then printf '[org.gnome.software]\ndownload-updates=false\n' >> /usr/share/glib-2.0/schemas/90_kw.gschema.override; fi \
 && glib-compile-schemas /usr/share/glib-2.0/schemas
RUN printf 'XDG_CURRENT_DESKTOP=GNOME\nXDG_SESSION_DESKTOP=gnome\nDESKTOP_SESSION=gnome\n' > /usr/lib/kw-desktop.env \
 && printf 'exec gnome-session\n' > /usr/lib/kw-desktop

# The wallpaper is a 16-megapixel JPEG XL, which takes the emulated CPU more
# than a minute to decode, and the shell waits for it: the same one as a JPEG.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2 AS wall
RUN apt-get update -q && apt-get install -y -q --no-install-recommends libjxl-tools imagemagick
COPY --from=sys /usr/share/backgrounds /b
RUN mkdir /o && djxl /b/gnome/adwaita-l.jxl /tmp/l.png && djxl /b/gnome/adwaita-d.jxl /tmp/d.png \
 && for i in l d; do convert /tmp/$i.png -resize 2560x2560 -quality 92 -strip /o/default-$i.jpg; done

FROM sys
COPY --from=wall /o /usr/share/backgrounds/kw
RUN printf '[org.gnome.desktop.background]\npicture-uri="file:///usr/share/backgrounds/kw/default-l.jpg"\npicture-uri-dark="file:///usr/share/backgrounds/kw/default-d.jpg"\n[org.gnome.desktop.screensaver]\npicture-uri="file:///usr/share/backgrounds/kw/default-l.jpg"\n' > /usr/share/glib-2.0/schemas/91_kw.gschema.override \
 && glib-compile-schemas /usr/share/glib-2.0/schemas
