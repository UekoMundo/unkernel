// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The distro tools: node --test distro/tools/*.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ROOT, appProblems, loadApps, sha256, sourceHash, stanzas } from "./lib.mjs";

const tool = (name, args, env = {}) => execFileSync("node", [path.join(ROOT, "distro/tools", name), ...args], { encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });

test("every app is valid and hashes the same twice", () => {
	for (const a of loadApps()) assert.equal(sourceHash(a), sourceHash(a));
});

test("app.json's problems", () => {
	const ok = { id: "abc", version: "1.0", title: "A", desc: "B" };
	assert.deepEqual(appProblems(ok, "abc"), []);
	for (const bad of [{ id: "x" }, { version: "v1" }, { desc: "two\nlines" }, { extra: 1 }, { arch: "amd64" }, { launcher: true }, { copy: { "/usr/../etc/x": "a" } }, { copy: { "/a": "../x" } }])
		assert.equal(appProblems({ ...ok, ...bad }, "abc").length > 0, true, JSON.stringify(bad));
});

test("the repository keeps what is published, refuses a second build of a version, and its hashes match", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "ueko-"));
	try {
		const deb = (id, version, out) => {
			const t = path.join(dir, "t");
			rmSync(t, { recursive: true, force: true });
			mkdirSync(path.join(t, "DEBIAN"), { recursive: true });
			writeFileSync(path.join(t, "DEBIAN/control"), `Package: ${id}\nVersion: ${version}\nArchitecture: all\nMaintainer: x <x@example.test>\nDescription: ${id}\n`);
			mkdirSync(out, { recursive: true });
			execFileSync("dpkg-deb", ["--root-owner-group", "--build", t, path.join(out, `${id}_${version}_all.deb`)], { stdio: "ignore" });
		};
		const site = path.join(dir, "site"), next = path.join(dir, "next");
		deb("one", "1.0", path.join(dir, "a"));
		tool("apt-repo.mjs", [path.join(dir, "a"), site], { UEKO_PUBLISHED: path.join(dir, "none") });
		deb("two", "1.0", path.join(dir, "b"));
		tool("apt-repo.mjs", [path.join(dir, "b"), next], { UEKO_PUBLISHED: site });
		const dist = path.join(next, "ueko/dists/stable");
		const packages = readFileSync(path.join(dist, "main/binary-arm64/Packages"));
		const s = stanzas(packages.toString());
		assert.deepEqual(s.map((x) => x.fields.get("Package")), ["one", "two"]);
		assert.equal(s[1].fields.get("SHA256"), sha256(readFileSync(path.join(next, "ueko", s[1].fields.get("Filename")))));
		assert.match(readFileSync(path.join(dist, "Release"), "utf8"), new RegExp(` ${sha256(packages)} ${packages.length} main/binary-arm64/Packages\n`));
		assert.equal(readdirSync(path.join(dist, "main/binary-arm64/by-hash/SHA256")).length, 2);
		assert.throws(() => tool("apt-repo.mjs", [path.join(dir, "a"), path.join(dir, "again")], { UEKO_PUBLISHED: site }), /published already/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("the catalog keeps published images of this ABI, and names new ones by content", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "ueko-"));
	try {
		const abi = Number(/^#define KW_ABI_VERSION (\d+)$/m.exec(readFileSync(path.join(ROOT, "include/kw_emu.h"), "utf8"))[1]);
		mkdirSync(path.join(dir, "pub/images"), { recursive: true });
		const was = (name, a) => ({ name, url: `${name}-0.erofs`, size: 1, sha256: "0", image: `${name}-x`, abi: a });
		writeFileSync(path.join(dir, "pub/images/catalog.json"), JSON.stringify({ abi, images: [was("alpine", abi), was("debian", abi - 1)] }));
		mkdirSync(path.join(dir, "in"));
		const head = Buffer.alloc(2048);
		head.write("KWDISTRO", 0, "latin1");
		head.write("ueko", 32);
		head.write("ueko-1.0-abc", 64);
		writeFileSync(path.join(dir, "in/ueko.erofs"), head);
		tool("catalog.mjs", [path.join(dir, "in"), path.join(dir, "out")], { UEKO_PUBLISHED: path.join(dir, "pub") });
		const c = JSON.parse(readFileSync(path.join(dir, "out/images/catalog.json"), "utf8"));
		assert.deepEqual(c.images.map((i) => [i.name, i.url]), [["ueko", `ueko-${sha256(head).slice(0, 16)}.erofs`], ["alpine", "alpine-0.erofs"]]);
		assert.equal(c.images[0].image, "ueko-1.0-abc");
		assert.equal(c.images[0].title, "Ueko Linux");
		assert.ok(c.apps.some((a) => a.id === "ueko-notes"));
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
