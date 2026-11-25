# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
# Omarchy (https://omarchy.org, MIT) for aarch64, as its installer sets it up:
# its packages and its setup scripts on Arch Linux ARM's root file system, from
# its stable channel. Left out, for the download's size: the office suite, the
# containers, the proprietary applications and the AUR's build tools, which its
# Install menu and pacman still have.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2 AS fetch
RUN apt-get update -q && apt-get install -y -q --no-install-recommends curl ca-certificates gnupg dirmngr libarchive-tools
RUN set -e; cd /tmp; u=http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz; \
    curl -fsSL --retry 3 -o a.tar.gz $u; curl -fsSL --retry 3 -o a.tar.gz.sig $u.sig; \
    curl -fsSL --retry 3 "https://keyserver.ubuntu.com/pks/lookup?op=get&options=mr&search=0x68B3537F39A313B3E574D06777193F152BDBE6A6" | gpg --batch --import; \
    gpg --batch --status-fd 1 --verify a.tar.gz.sig a.tar.gz | grep -q 'VALIDSIG.*68B3537F39A313B3E574D06777193F152BDBE6A6'; \
    curl -fsSL --retry 3 -o /omarchy.asc https://keys.openpgp.org/vks/v1/by-fingerprint/40DFB630FF42BCFFB047046CF0134EE680CAC571; \
    mkdir /root-arch; bsdtar -xpf a.tar.gz -C /root-arch

FROM scratch
COPY --from=fetch /root-arch/ /
COPY --from=fetch /omarchy.asc /tmp/omarchy.asc
# Pacman's download sandbox needs Landlock and a user namespace, which the
# build's container (and the guest's kernel) may not have. The repositories
# are those of Omarchy's own pacman.conf for aarch64.
RUN set -e; \
    sed -i -e 's/^#DisableSandbox.*/DisableSandbox/' -e 's/^CheckSpace/#CheckSpace/' /etc/pacman.conf; \
    sed -i 's#^\[options\]#[options]\nNoExtract = usr/share/man/* usr/share/doc/* usr/share/info/* usr/share/locale/* usr/share/gtk-doc/* usr/share/help/*#' /etc/pacman.conf; \
    sed -i 's#^\[core\]#[omarchy]\nServer = https://pkgs.omarchy.org/stable/$arch\n\n[core]#' /etc/pacman.conf; \
    printf 'Server = https://arm-stable-mirror.omarchy.org/$arch/$repo\n' > /etc/pacman.d/mirrorlist; \
    pacman-key --init; pacman-key --populate archlinuxarm; \
    pacman-key --add /tmp/omarchy.asc; pacman-key --lsign-key 40DFB630FF42BCFFB047046CF0134EE680CAC571; \
    pacman -Rdd --noconfirm $(pacman -Qq | grep -E '^(linux-aarch64|linux-firmware.*|mkinitcpio.*)$') || true; \
    userdel -r alarm || true; groupdel alarm 2>/dev/null || true
RUN set -e; n=0; until pacman -Syyuu --noconfirm --needed omarchy-keyring sudo curl wget unzip less nano htop tmux git bash-completion zstd python \
      networkmanager polkit mesa xorg-xwayland pipewire pipewire-pulse pipewire-alsa wireplumber rtkit xdg-user-dirs xdg-utils noto-fonts noto-fonts-emoji \
      omarchy omarchy-settings omarchy-nvim omarchy-hyprland-titlebars omarchy-power-profiles-daemon \
      hyprland hyprland-guiutils hyprland-preview-share-picker hyprpicker hyprsunset uwsm quickshell xdg-desktop-portal-gtk xdg-desktop-portal-hyprland xdg-terminal-exec \
      aether bat brightnessctl btop chromium disktree-bin evince expac eza fakeroot fastfetch fcitx5 fcitx5-gtk fcitx5-qt fd ffmpeg ffmpegthumbnailer fontconfig foot fzf \
      gliff gnome-disk-utility gnome-keyring gnome-themes-extra grim gum herdr hype imagemagick imv inetutils inotify-tools inxi jq lazygit libsecret libyaml lua51 luarocks \
      mise-bin monologue mpv mpv-mpris nautilus nautilus-python neovim omacalc omacut omasnap omawrite owe pacman-contrib pamixer plocate python-gobject \
      qrencode qt6-declarative qt6-imageformats qt6-multimedia qt6-svg qt6-wayland ripgrep signed slurp socat starship sushi tldr tree-sitter-cli tobi-try \
      ttf-ia-writer ttf-jetbrains-mono-nerd-basic ttfx tzupdate udiskie usage wl-clipboard woff2-font-awesome wtype xorg-xsetroot yaru-icon-theme zbar zoxide; \
    do n=$((n + 1)); [ $n -lt 6 ] || exit 1; sleep 20; done
# Omarchy's setup of the system and of its user, the parts that apply to a
# machine without firmware, disks, printers and containers. The machine's user
# (guest/lib/stage.sh) starts from /etc/skel, so what was set up for one here
# goes there. No lock by itself; asked for, it opens with Enter.
RUN set -e; export OMARCHY_PATH=/usr/share/omarchy OMARCHY_INSTALL=/usr/share/omarchy/install OMARCHY_INSTALL_USER=user OMARCHY_FIRST_INSTALL=1 \
      PATH=/usr/share/omarchy/bin:/usr/local/bin:/usr/bin; \
    mkdir -p /var/lib/omarchy/image && printf 'format=1\nplatform=aarch64\n' > /var/lib/omarchy/image/target; \
    groupadd -rf input; groupadd -rf render; useradd -m -u 1000 -U -G wheel user; \
    for s in config/theme-system config/browser-policy config/increase-lockout-limit config/lockscreen-pam config/locale; do echo "== $s"; bash -eE -c "source $OMARCHY_INSTALL/$s.sh"; done; \
    su user -s /bin/bash -c 'export OMARCHY_PATH=/usr/share/omarchy PATH=/usr/share/omarchy/bin:/usr/local/bin:/usr/bin HOME=/home/user; cd; omarchy-provision-user --first-install'; \
    mkdir -p /home/user/.local/state/omarchy/toggles/hypr; \
    cp /usr/share/omarchy/default/hypr/toggles/no-animations.lua /usr/share/omarchy/default/hypr/toggles/window-opaque.lua /home/user/.local/state/omarchy/toggles/hypr/; \
    python3 -c 'import json; p="/home/user/.config/omarchy/shell.json"; c=json.load(open(p)); c["idle"]={"screensaver":0,"lock":0}; json.dump(c,open(p,"w"),indent=2)'; \
    rm -rf /etc/skel /var/lib/omarchy/image; cp -a /home/user /etc/skel; chown -R 0:0 /etc/skel; userdel -r user; \
    /usr/share/omarchy/bin/omarchy-apply-pacman stable; \
    sed -i -e 's/^CheckSpace/#CheckSpace/' -e 's/^DownloadUser.*/DisableSandbox/' /etc/pacman.conf; \
    sed -i 's#^\[options\]#[options]\nNoExtract = usr/share/man/* usr/share/doc/* usr/share/info/* usr/share/locale/* usr/share/gtk-doc/* usr/share/help/*#' /etc/pacman.conf
RUN sed -i 's/^#en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen && printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf \
 && mkdir -p /etc/systemd/system/multi-user.target.wants \
 && ln -sf /usr/lib/systemd/system/NetworkManager.service /etc/systemd/system/multi-user.target.wants/NetworkManager.service \
 && for s in systemd-networkd systemd-resolved sshd omarchy-provision-hardware omarchy-provision-owner limine-snapper-sync; do ln -sfn /dev/null /etc/systemd/system/$s.service; done \
 && { gpgconf --homedir /etc/pacman.d/gnupg --kill all; find /var/cache/pacman/pkg /boot /usr/include /usr/share/man /usr/share/doc /usr/share/info /usr/share/locale /usr/share/gtk-doc -type f -delete; rm -f /tmp/omarchy.asc; }
RUN printf 'XDG_CURRENT_DESKTOP=Hyprland\nXDG_SESSION_DESKTOP=Hyprland\nDESKTOP_SESSION=omarchy\n' > /usr/lib/kw-desktop.env \
 && printf 'exec uwsm start -g -1 -e -D Hyprland hyprland.desktop\n' > /usr/lib/kw-desktop
