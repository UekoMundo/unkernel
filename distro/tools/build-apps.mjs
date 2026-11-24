#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// Build the .debs of distro/apps/ that are not published yet.
//
//   node distro/tools/build-apps.mjs [--out DIR] [--all] [--check] [ID...]
//
// --all: also those published (a local build); --check: only validate, and
// say what would be built. A published version with other sources fails: a
// package never changes under its version, so bump it.
//
// An app is app.json plus, as it needs: root/ (installed as it is), build.sh
// (run in a debian:trixie arm64 container with the app at /src, its output
// in $DESTDIR), postinst and prerm (maintainer scripts).
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, loadApps, published, run, sourceHash, stanzas } from "./lib.mjs";

const args = process.argv.slice(2);
let out = path.join(ROOT, "distro/out"), all = false, check = false;
const ids = [];
while (args.length) {
	const a = args.shift();
	if (a === "--out") out = path.resolve(args.shift());
	else if (a === "--all") all = true;
	else if (a === "--check") check = true;
	else ids.push(a);
}

const apps = loadApps();
for (const id of ids) if (!apps.some((a) => a.id === id)) throw new Error(`no app ${id}`);
const have = new Map();
if (!all) for (const { fields } of stanzas(await published("ueko/dists/stable/main/binary-arm64/Packages") ?? "")) have.set(`${fields.get("Package")} ${fields.get("Version")}`, fields);

let built = 0;
for (const app of apps) {
	if (ids.length && !ids.includes(app.id)) continue;
	const source = sourceHash(app);
	const old = have.get(`${app.id} ${app.version}`);
	if (old) {
		if (old.get("X-Source-Hash") !== source) throw new Error(`${app.id} ${app.version} is published with other sources: bump its version in app.json`);
		continue;
	}
	built++;
	const arch = app.arch ?? "all", name = `${app.id}_${app.version}_${arch}`;
	console.log(`${check ? "would build" : "building"} ${name}.deb`);
	if (check) continue;
	const tree = path.join(out, "tree", name);
	rmSync(tree, { recursive: true, force: true });
	mkdirSync(path.join(tree, "DEBIAN"), { recursive: true });
	if (existsSync(path.join(app.dir, "root"))) cpSync(path.join(app.dir, "root"), tree, { recursive: true, verbatimSymlinks: true });
	for (const [to, from] of Object.entries(app.copy ?? {})) {
		mkdirSync(path.join(tree, path.dirname(to)), { recursive: true });
		cpSync(path.join(ROOT, from), path.join(tree, to));
	}
	if (existsSync(path.join(app.dir, "build.sh"))) {
		run("docker", ["run", "--rm", "--platform", "linux/arm64", "-v", `${app.dir}:/src:ro`, "-v", `${tree}:/out`, "-e", "DESTDIR=/out",
			"-w", "/src", "debian:trixie", "sh", "-c", `bash ./build.sh && chown -R ${process.getuid()}:${process.getgid()} /out`], { stdio: "inherit" });
	}
	const doc = path.join(tree, "usr/share/doc", app.id);
	mkdirSync(doc, { recursive: true });
	if (!existsSync(path.join(doc, "copyright"))) writeFileSync(path.join(doc, "copyright"), `Copyright 2026 Vineel Sai. Licensed under the MIT License.\nSource: https://github.com/UekoMundo/unkernel/tree/ueko/distro/apps/${app.id}\n`);
	run("sh", ["-c", 'cd "$1" && find . -path ./DEBIAN -prune -o -type d -exec chmod 755 {} + -o -type f -perm -100 -exec chmod 755 {} + -o -type f -exec chmod 644 {} +', "sh", tree]);
	const kib = run("du", ["-sk", "--exclude=DEBIAN", tree]).split("\t")[0];
	writeFileSync(path.join(tree, "DEBIAN/control"), [
		`Package: ${app.id}`, `Version: ${app.version}`, `Architecture: ${arch}`, "Section: ueko", "Priority: optional",
		"Maintainer: Vineel Sai <noreply@vineelsai.com>", `Installed-Size: ${kib}`,
		...(app.depends?.length ? [`Depends: ${app.depends.join(", ")}`] : []),
		"Homepage: https://linux.vineelsai.com/", `X-Source-Hash: ${source}`, `Description: ${app.desc}`, "",
	].join("\n"));
	for (const s of ["postinst", "prerm", "postrm"]) {
		const f = path.join(app.dir, s);
		if (!existsSync(f)) continue;
		writeFileSync(path.join(tree, "DEBIAN", s), readFileSync(f));
		chmodSync(path.join(tree, "DEBIAN", s), 0o755);
	}
	const epoch = run("git", ["log", "-1", "--format=%ct", "--", app.dir], { cwd: ROOT }).trim() || "1764000000";
	mkdirSync(path.join(out, "debs"), { recursive: true });
	run("dpkg-deb", ["-Zxz", "--root-owner-group", "--build", tree, path.join(out, "debs", `${name}.deb`)], { env: { ...process.env, SOURCE_DATE_EPOCH: epoch } });
}
console.log(`${built} to build, ${apps.length - built} published or not asked for`);
if (!check && existsSync(path.join(out, "debs"))) console.log(readdirSync(path.join(out, "debs")).map((f) => `  ${f}`).join("\n"));
