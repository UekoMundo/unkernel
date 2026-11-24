<!-- SPDX-License-Identifier: GPL-2.0-or-later -->
<!-- Copyright (C) 2026 Vineel Sai -->
# Ueko

This fork of [unkernel](https://github.com/pithings/unkernel) runs
[linux.vineelsai.com](https://linux.vineelsai.com): Linux workspaces in a
browser tab. `main` follows upstream; `ueko` (the default branch) adds:

| Path | What |
| --- | --- |
| `guest/distro/{ueko,ubuntu,fedora,arch,kali}/` | distro images, each a `Dockerfile` (`guest/lib/oci.sh`) |
| `distro/apps/ID/` | Ueko Linux's own packages |
| `distro/catalog.json` | what people see of each image |
| `distro/kernel.json` | the upstream release whose kernel everything runs on |
| `distro/tools/` | builds, the apt repository, the catalog, publishing |
| `web/src/{workspace,catalog}.ts` | the page: several machines per origin, images and apps from a catalog |
| `.github/workflows/ueko.yml` | all of it, on a push to `ueko` |

Published (nothing there is ever replaced but the indexes):

- packages: `deb http://repo.vineelsai.com/linux/ueko stable main`
- images: `https://repo.vineelsai.dev/linux/images/catalog.json`
- the session page: a release `page-<commit>` here, pinned by `apps/linux` in
  UekoMundo/kenkon, which is the workspace manager and the deployment

A new image or app shows up on the site by itself; only a change of `web/`,
`js/` or `distro/kernel.json` needs the pin in Kenkon moved.

## Build an app

```sh
node distro/tools/new-app.mjs hello          # or: hello gui (GTK 3, a Wayland window)
node distro/tools/build-apps.mjs hello       # distro/out/debs/hello_0.1_all.deb
git commit && git push                       # publishes it
```

`app.json`: `id` (the package and directory name), `version`, `title`, `desc`,
`depends`, `arch` (`all`, or `arm64` with compiled code), `command` and
`launcher: true` (a tile in the page's Ueko folder), `icon` (an emoji),
`colors`, `wayland` and `waylandIds` (the window's app id). `root/` is installed
as it is. `build.sh` compiles in a `debian:trixie` arm64 container from `/src`
into `$DESTDIR`; `copy` takes files from elsewhere in the repository;
`postinst`, `prerm` and `postrm` are maintainer scripts. A package never
changes under its version: bump `version` with every change. In a workspace:
`ueko apps`, `ueko install hello`, `ueko update`.

## Add a distro

1. `guest/distro/NAME/` with a `Dockerfile` (the rules are at the top of
   `guest/lib/oci.sh`), `pins.sh` and `build.sh` (copy another's).
2. An entry in `distro/catalog.json`.
3. Push: CI builds it on arm64, boots it (`distro/tools/smoke.sh`) and
   publishes it. A workspace keeps its changes over a new image of its distro.

Locally (needs Docker with arm64, Zig 0.16, Node 24):

```sh
pnpm install && distro/tools/kernel.sh
guest/build.sh distro NAME
distro/tools/smoke.sh vendor/build/bundle/unkernel.wasm vendor/build/distro/NAME.erofs
node js/cli.ts --kernel vendor/build/bundle/unkernel.wasm --distro vendor/build/distro/NAME.erofs
```

## Follow upstream

Fast-forward `main`, merge it into `ueko`, then move `distro/kernel.json` to the
release of that commit (the `unkernel.wasm` must have the checkout's
`KW_ABI_VERSION`). Images of another ABI leave the catalog until rebuilt; that
push rebuilds them all.

## Keys

The archive key signs `dists/`. Its public half is
`guest/distro/ueko/rootfs-image/usr/share/keyrings/ueko-archive-keyring.asc`;
the private one is the Actions secret `UEKO_ARCHIVE_KEY` (a copy:
`/vscloud/prod/platform/linux/ueko-archive-key` in SSM). Publishing uses the
role `UEKO_PUBLISH_ROLE`, which can write `linux/ueko/` and `linux/images/` of
the bucket and nothing else, from the branch `ueko` only.
