#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The apt repository's next state: what is published plus new .debs.
//
//   node distro/tools/apt-repo.mjs DEBS-DIR OUT-DIR [--key FINGERPRINT]
//
// OUT-DIR/ueko/ gets the new packages (pool/) and the indexes over all
// (dists/stable/), signed with the key from gpg's keyring; without --key
// they stay unsigned (a local try). OUT-DIR is empty but for that: upload it
// over the published tree (publish.sh), pool/ first.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { published, run, sha256, stanzas } from "./lib.mjs";

const [debs, outDir, flag, key] = process.argv.slice(2);
if (!debs || !outDir || (flag && (flag !== "--key" || !key))) {
	console.error("usage: apt-repo.mjs DEBS-DIR OUT-DIR [--key FINGERPRINT]");
	process.exit(2);
}
const out = path.join(outDir, "ueko"), binary = "main/binary-arm64";
const old = stanzas(await published(`ueko/dists/stable/${binary}/Packages`) ?? "");
const id = (f) => `${f.get("Package")} ${f.get("Version")} ${f.get("Architecture")}`;
const entries = new Map(old.map((s) => [id(s.fields), s.text]));
let added = 0;
for (const f of existsSync(debs) ? readdirSync(debs).filter((n) => n.endsWith(".deb")).sort() : []) {
	const bytes = readFileSync(path.join(debs, f));
	const control = run("dpkg-deb", ["-f", path.join(debs, f)]).trim();
	const { fields } = stanzas(control)[0];
	if (entries.has(id(fields))) throw new Error(`${id(fields)} is published already`);
	const p = fields.get("Package");
	const rel = `pool/main/${p[0]}/${p}/${f}`;
	mkdirSync(path.join(out, path.dirname(rel)), { recursive: true });
	copyFileSync(path.join(debs, f), path.join(out, rel));
	const i = control.search(/^Description:/m);
	entries.set(id(fields), `${control.slice(0, i)}Filename: ${rel}\nSize: ${bytes.length}\nSHA256: ${sha256(bytes)}\n${control.slice(i)}`);
	added++;
}
const packages = Buffer.from([...entries.keys()].sort().map((k) => `${entries.get(k)}\n`).join("\n"));
const dist = path.join(out, "dists/stable");
mkdirSync(path.join(dist, binary), { recursive: true });
const files = [[`${binary}/Packages`, packages], [`${binary}/Packages.gz`, gzipSync(packages, { level: 9 })]];
for (const [rel, data] of files) writeFileSync(path.join(dist, rel), data);
// By hash too: an index a client asks for by the Release it has stays there
// while a newer one replaces the plain names.
for (const [, data] of files) {
	mkdirSync(path.join(dist, binary, "by-hash/SHA256"), { recursive: true });
	writeFileSync(path.join(dist, binary, "by-hash/SHA256", sha256(data)), data);
}
const date = new Date().toUTCString().replace("GMT", "UTC");
writeFileSync(path.join(dist, "Release"), ["Origin: Ueko Linux", "Label: Ueko Linux", "Suite: stable", "Codename: stable", `Date: ${date}`,
	"Architectures: arm64", "Components: main", "Acquire-By-Hash: yes", "Description: Ueko Linux packages", "SHA256:",
	...files.map(([rel, data]) => ` ${sha256(data)} ${data.length} ${rel}`), ""].join("\n"));
if (key) {
	const gpg = ["--batch", "--yes", "--local-user", key, "--digest-algo", "SHA512"];
	run("gpg", [...gpg, "--clearsign", "-o", path.join(dist, "InRelease"), path.join(dist, "Release")]);
	run("gpg", [...gpg, "--armor", "--detach-sign", "-o", path.join(dist, "Release.gpg"), path.join(dist, "Release")]);
}
console.log(`${added} added, ${entries.size} packages${key ? "" : " (unsigned)"}`);
