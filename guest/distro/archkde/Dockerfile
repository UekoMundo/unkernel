# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Arch Linux ARM with KDE Plasma, as archinstall's profile sets it up.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2 AS fetch
RUN apt-get update -q && apt-get install -y -q --no-install-recommends curl ca-certificates gnupg dirmngr libarchive-tools
RUN set -e; cd /tmp; u=http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz; \
    curl -fsSL --retry 3 -o a.tar.gz $u; curl -fsSL --retry 3 -o a.tar.gz.sig $u.sig; \
    curl -fsSL --retry 3 "https://keyserver.ubuntu.com/pks/lookup?op=get&options=mr&search=0x68B3537F39A313B3E574D06777193F152BDBE6A6" | gpg --batch --import; \
    gpg --batch --status-fd 1 --verify a.tar.gz.sig a.tar.gz | grep -q 'VALIDSIG.*68B3537F39A313B3E574D06777193F152BDBE6A6'; \
    mkdir /root-arch; bsdtar -xpf a.tar.gz -C /root-arch

FROM scratch
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
    plasma-desktop plasma-workspace plasma-nm plasma-pa plasma-systemmonitor kscreen kinfocenter systemsettings breeze-gtk kde-gtk-config polkit-kde-agent xdg-desktop-portal-kde konsole dolphin kate ark kcalc gwenview okular spectacle; do n=$((n + 1)); [ $n -lt 6 ] || exit 1; sleep 20; done; } \
 && { userdel -r alarm || true; } && { groupdel alarm 2>/dev/null || true; } && groupadd -rf input && groupadd -rf render \
 && sed -i 's/^#en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf \
 && ln -sf /usr/lib/systemd/system/NetworkManager.service /etc/systemd/system/multi-user.target.wants/NetworkManager.service \
 && ln -sf /dev/null /etc/systemd/system/systemd-networkd.service && ln -sf /dev/null /etc/systemd/system/systemd-resolved.service && ln -sf /dev/null /etc/systemd/system/sshd.service \
 && { gpgconf --homedir /etc/pacman.d/gnupg --kill all; find /var/cache/pacman/pkg /boot /usr/include /usr/share/man /usr/share/doc /usr/share/info /usr/share/locale /usr/share/gtk-doc -type f -delete; }
# No lock screen or blanking: the user has no password to come back with.
RUN mkdir -p /etc/xdg && printf '[Daemon]\nAutolock=false\nLockOnResume=false\n' > /etc/xdg/kscreenlockerrc \
 && printf '[Basic Settings]\nIndexing-Enabled=false\n' > /etc/xdg/baloofilerc
RUN printf 'XDG_CURRENT_DESKTOP=KDE\nXDG_SESSION_DESKTOP=KDE\nDESKTOP_SESSION=plasma\n' > /usr/lib/kw-desktop.env \
 && printf 'exec startplasma-wayland\n' > /usr/lib/kw-desktop
