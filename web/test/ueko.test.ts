// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The catalog, the workspaces' names and the background apps' scripts: node --test web/test/ueko.test.ts
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fetchRoutes } from "../../js/core/net-fetch.ts";
import { START_SH, STATUS_SH, STOP_SH } from "../src/background-sh.ts";
import { parseCatalog } from "../src/catalog.ts";
import { scoped, workspaceId, wsDataDisk, wsSessionDb } from "../src/workspace.ts";

test("a catalog's images and apps", () => {
	const c = parseCatalog({
		abi: 4,
		images: [
			{ name: "ueko", url: "ueko-0.erofs", size: 5, image: "ueko-1", title: "Ueko Linux", family: "debian", gl: true, abi: 4 },
			{ name: "fedora", url: "fedora-0.erofs", size: 6, ui: "display" }, { name: "kali", url: "kali-0.erofs", size: 7, ui: "nonsense" },
			{ name: "old", url: "old.erofs", size: 5, abi: 3 },
			{ name: "Bad Name", url: "x", size: 5 }, { name: "nosize", url: "x" }, null, 7,
		],
		apps: [
			{ id: "notes", title: "Notes", command: "notes", packages: ["notes"], distros: ["ueko"], wayland: true, colors: ["#000", "#fff"] },
			{ id: "nocommand", title: "x", packages: [], distros: [] },
		],
	}, "https://example.test/linux/images/catalog.json", 4);
	assert.deepEqual(c.images, [{ name: "ueko", url: "https://example.test/linux/images/ueko-0.erofs", size: 5, imageId: "ueko-1", title: "Ueko Linux", family: "debian", gl: true },
		{ name: "fedora", url: "https://example.test/linux/images/fedora-0.erofs", size: 6, gl: false, ui: "display" },
		{ name: "kali", url: "https://example.test/linux/images/kali-0.erofs", size: 7, gl: false }]);
	assert.deepEqual(c.apps.map((a) => [a.id, a.desc, a.wayland]), [["notes", "Notes", true]]);
	for (const bad of [null, [], "x", { images: {} }]) assert.deepEqual(parseCatalog(bad, "https://example.test/", 4), { images: [], apps: [] });
});

test("a workspace's names never meet another's", () => {
	assert.equal(workspaceId("?ws=my-box-1"), "my-box-1");
	for (const bad of ["", "?ws=", "?ws=A", "?ws=-a", "?ws=a/b", `?ws=${"a".repeat(41)}`]) assert.equal(workspaceId(bad), null);
	const names = (ws: string | null) => [scoped("kw.settings", ws), wsDataDisk("kwdata", ws), wsSessionDb("kwsnap:session-v2", ws)];
	assert.deepEqual(names(null), ["kw.settings", "kwdata", "kwsnap:session-v2"]);
	assert.deepEqual(names("a"), ["kw.settings@a", "ws-a", "kwsnap:session-v2@a"]);
	assert.equal(new Set([...names(null), ...names("a"), ...names("a-v1")]).size, 9);
});

test("a routed host's other ports go to the inner backend by name", async () => {
	const seen: string[] = [];
	const inner = {
		lookup: async () => ["198.18.0.1"],
		connect: ({ host, port }: { host: string; port: number }) => { seen.push(`${host}:${port}`); return {} as never; },
	};
	const ev = { onConnect() {}, onData() {}, onEnd() {}, onDrain() {}, onClose() {} };
	const net = fetchRoutes(inner as never, { "archive.example": "https://mirror.example/x" });
	const [ip] = await net.lookup("archive.example");
	net.connect({ host: ip!, port: 443 } as never, ev as never);
	net.connect({ host: ip!, port: 80 } as never, ev as never);
	net.connect({ host: "198.18.0.9", port: 443 } as never, ev as never);
	assert.deepEqual(seen, ["archive.example:443", "198.18.0.9:443"]);
	net.close();
	const err = await new Promise((onClose) => fetchRoutes(undefined, { "archive.example": "https://mirror.example/x" }).connect({ host: ip!, port: 443 } as never, { ...ev, onClose } as never));
	assert.match(String(err), /port 80 only/);
});

test("an app without a terminal runs once, says how it ended, and stops", async () => {
	const home = mkdtempSync(path.join(tmpdir(), "kw-home-"));
	const dir = path.join(home, ".apps/x");
	mkdirSync(dir, { recursive: true });
	const sh = (script: string) => execFileSync("sh", ["-c", script, "sh", ".apps/x"], { env: { ...process.env, HOME: home }, encoding: "utf8" }).trim();
	const run = (body: string) => writeFileSync(path.join(dir, "run.sh"), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
	const status = async () => {
		for (let i = 0; i < 50; i++) {
			const s = sh(STATUS_SH);
			if (s) return s;
			await new Promise((r) => setTimeout(r, 100));
		}
		return "";
	};
	try {
		run("echo out; echo err >&2; exit 3");
		assert.equal(sh(START_SH), "");
		assert.equal(await status(), "3");
		const log = readFileSync(path.join(dir, "run.log"), "utf8");
		assert.match(log, /out[^]*err/);
		// Standard input stays open, so a program that reads it waits; a second start finds it.
		run("read x; exit 0");
		assert.equal(sh(START_SH), "");
		await new Promise((r) => setTimeout(r, 300));
		assert.equal(sh(STATUS_SH), "");
		assert.equal(sh(START_SH), "running");
		sh(STOP_SH);
		assert.equal(await status(), "143");
		run("exit 0");
		assert.equal(sh(START_SH), "");
		assert.equal(await status(), "0");
	} finally {
		rmSync(home, { recursive: true, force: true });
	}
});

test("a machine's desktop has drawn when its screen is more than a pointer or a bar on black", async () => {
	const { clock, isPicture, restarts } = await import("../src/desktopstart.ts");
	const px = (n: number, colour: (i: number) => number[]) => Uint8ClampedArray.from(Array.from({ length: n }, (_, i) => [...colour(i), 255]).flat());
	assert.equal(isPicture(px(2304, () => [0, 0, 0])), false);
	assert.equal(isPicture(px(2304, (i) => (i < 64 ? [26, 27, 38] : i % 500 === 0 ? [200, 200, 200 + (i % 5)] : [0, 0, 0]))), false); // a bar and a pointer
	assert.equal(isPicture(px(2304, (i) => [i & 255, (i * 7) & 255, (i * 13) & 255])), true);
	assert.deepEqual([restarts("3\n"), restarts("0"), restarts(""), restarts(undefined), restarts("not found")], [3, 0, 0, 0, 0]);
	assert.deepEqual([clock(0), clock(61_900), clock(600_000)], ["0:00", "1:01", "10:00"]);
});
