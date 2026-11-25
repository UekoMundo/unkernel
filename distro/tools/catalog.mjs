#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The image catalog's next state (web/src/catalog.ts reads it, and the
// workspace manager): what is published plus the images of this run.
//
//   node distro/tools/catalog.mjs IMAGES-DIR OUT-DIR
//
// IMAGES-DIR has NAME.erofs files built for this checkout's kernel ABI (the
// distro header of each names it and its image id). OUT-DIR/images/ gets each
// under its content's name, and catalog.json: distro/catalog.json's entries
// (what people see) that have an image, and the launcher's apps. An entry
// whose published image is of another ABI is left out until it is rebuilt.
import { copyFileSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, loadApps, published, sha256 } from "./lib.mjs";

const [dir, outDir] = process.argv.slice(2);
if (!dir || !outDir) {
	console.error("usage: catalog.mjs IMAGES-DIR OUT-DIR");
	process.exit(2);
}
const abi = Number(/^#define KW_ABI_VERSION (\d+)$/m.exec(readFileSync(path.join(ROOT, "include/kw_emu.h"), "utf8"))[1]);
const meta = JSON.parse(readFileSync(path.join(ROOT, "distro/catalog.json"), "utf8"));
const old = JSON.parse(await published("images/catalog.json") ?? '{"images":[]}');
const out = path.join(outDir, "images");
mkdirSync(out, { recursive: true });

/** The distro header of an erofs image (js/core/distro.ts): its name and image id. */
function header(file) {
	const b = Buffer.alloc(136);
	readSync(openSync(file, "r"), b, 0, 136, 0);
	if (b.toString("latin1", 0, 8) !== "KWDISTRO") throw new Error(`${file}: no distro header`);
	const str = (at, n) => b.toString("utf8", at, at + n).replace(/\0.*$/s, "");
	return { name: str(32, 32), image: str(64, 64) };
}

const fresh = new Map();
for (const f of existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".erofs")) : []) {
	const name = f.slice(0, -6), file = path.join(dir, f);
	const h = header(file);
	if (h.name !== name) throw new Error(`${f}: its header says ${h.name}`);
	if (!meta.some((m) => m.name === name)) throw new Error(`${f}: distro/catalog.json has no entry ${name}`);
	const bytes = readFileSync(file), sum = sha256(bytes);
	const url = `${name}-${sum.slice(0, 16)}.erofs`;
	rmSync(path.join(out, url), { force: true });
	try { linkSync(file, path.join(out, url)); } catch { copyFileSync(file, path.join(out, url)); } // a link: the images are gigabytes together
	fresh.set(name, { url, size: bytes.length, sha256: sum, image: h.image, abi });
}
const images = [];
for (const m of meta) {
	const was = old.images.find((i) => i.name === m.name);
	const img = fresh.get(m.name) ?? (was && (was.abi ?? old.abi) === abi ? { url: was.url, size: was.size, sha256: was.sha256, image: was.image, abi } : null);
	if (img) images.push({ ...m, ...img });
	else console.error(`catalog: no image of ${m.name} for ABI ${abi}`);
}
const apps = loadApps().filter((a) => a.launcher).map((a) => ({
	id: a.id, title: a.title, desc: a.desc, version: a.version, distros: ["ueko"], packages: [a.id], command: a.command,
	icon: a.icon, colors: a.colors, wayland: a.wayland, waylandIds: a.waylandIds,
}));
writeFileSync(path.join(out, "catalog.json"), `${JSON.stringify({ schema: 1, abi, updated: new Date().toISOString(), images, apps }, null, 2)}\n`);
console.log(`${images.length} images (${fresh.size} new), ${apps.length} apps`);
