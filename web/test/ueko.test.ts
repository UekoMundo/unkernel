// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The catalog and the workspaces' names: node --test web/test/ueko.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { fetchRoutes } from "../../js/core/net-fetch.ts";
import { parseCatalog } from "../src/catalog.ts";
import { scoped, workspaceId, wsDataDisk, wsSessionDb } from "../src/workspace.ts";

test("a catalog's images and apps", () => {
	const c = parseCatalog({
		abi: 4,
		images: [
			{ name: "ueko", url: "ueko-0.erofs", size: 5, image: "ueko-1", title: "Ueko Linux", family: "debian", gl: true, abi: 4 },
			{ name: "old", url: "old.erofs", size: 5, abi: 3 },
			{ name: "Bad Name", url: "x", size: 5 }, { name: "nosize", url: "x" }, null, 7,
		],
		apps: [
			{ id: "notes", title: "Notes", command: "notes", packages: ["notes"], distros: ["ueko"], wayland: true, colors: ["#000", "#fff"] },
			{ id: "nocommand", title: "x", packages: [], distros: [] },
		],
	}, "https://example.test/linux/images/catalog.json", 4);
	assert.deepEqual(c.images, [{ name: "ueko", url: "https://example.test/linux/images/ueko-0.erofs", size: 5, imageId: "ueko-1", title: "Ueko Linux", family: "debian", gl: true }]);
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
