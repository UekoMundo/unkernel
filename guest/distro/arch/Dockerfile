# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Arch Linux ARM's own root file system, checked against its build system's
# signing key, without the board's kernel and firmware.
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
# The mirror rotates between servers that can be days apart, so a file that
# one's index names is missing on the next: the build names its servers, and
# pacman asks the next one for what the first does not have.
RUN sed -i -e 's/^#DisableSandbox.*/DisableSandbox/' -e 's/^CheckSpace/#CheckSpace/' /etc/pacman.conf \
 && printf '[options]\nNoExtract = usr/share/man/* usr/share/doc/* usr/share/info/* usr/share/locale/* usr/share/gtk-doc/*\n' > /tmp/noextract \
 && sed -i 's#^\[options\]#[options]\nNoExtract = usr/share/man/* usr/share/doc/* usr/share/info/* usr/share/locale/* usr/share/gtk-doc/*#' /etc/pacman.conf && rm /tmp/noextract \
 && pacman-key --init && pacman-key --populate archlinuxarm \
 && pacman -Rdd --noconfirm linux-aarch64 linux-firmware 2>/dev/null; \
    pacman -Rdd --noconfirm $(pacman -Qq | grep -E '^(linux-aarch64|linux-firmware.*|mkinitcpio.*)$') || true; \
    set -e; mv /etc/pacman.d/mirrorlist /etc/pacman.d/mirrorlist.own; \
    printf 'Server = http://%s.mirror.archlinuxarm.org/$arch/$repo\n' mi.us va.us fl.us ca.us de4 > /etc/pacman.d/mirrorlist; \
    n=0; until pacman -Syyu --noconfirm --needed sudo curl wget unzip less nano htop tmux git foot ttf-dejavu zstd; do n=$((n + 1)); [ $n -lt 6 ] || exit 1; sleep 20; done; \
    mv /etc/pacman.d/mirrorlist.own /etc/pacman.d/mirrorlist; \
    { userdel -r alarm || true; } && { groupdel alarm 2>/dev/null || true; } && groupadd -rf input \
 && gpgconf --homedir /etc/pacman.d/gnupg --kill all; \
    rm -rf /boot/* /usr/lib/modules/* /usr/lib/firmware/* /var/cache/pacman/pkg/* /var/lib/pacman/sync/* /var/log/pacman.log \
      /usr/share/man/* /usr/share/doc/* /usr/share/info/* /usr/share/locale/* /etc/pacman.d/gnupg/S.* /usr/include /usr/share/gtk-doc
