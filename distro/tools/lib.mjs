// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// What the distro tools share: the app definitions (distro/apps/ID/app.json),
// debs' control fields, and reads of what is published.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const APPS = path.join(ROOT, "distro/apps");
/** Where the published files are read from. */
export const SITE = (process.env.UEKO_SITE ?? "https://repo.vineelsai.dev/linux").replace(/\/+$/, "");

const ID = /^[a-z0-9][a-z0-9+.-]+$/; // Debian's package names
const VERSION = /^[0-9][A-Za-z0-9.+~]*$/;
const KEYS = new Set(["id", "version", "title", "desc", "depends", "arch", "copy", "command", "icon", "colors", "wayland", "waylandIds", "launcher"]);
const text = (v) => typeof v === "string" && v !== "" && !/[\r\n]/.test(v);
const texts = (v) => Array.isArray(v) && v.every(text);

/** app.json's problems, as messages (none: valid). */
export function appProblems(a, dir) {
	const p = [];
	const need = (ok, m) => { if (!ok) p.push(m); };
	for (const k of Object.keys(a)) need(KEYS.has(k), `unknown key ${k}`);
	need(text(a.id) && ID.test(a.id), "id: a Debian package name");
	need(a.id === dir, `id: the directory's name (${dir})`);
	need(text(a.version) && VERSION.test(a.version), "version: starts with a digit; letters, digits and .+~");
	need(text(a.title), "title: one line");
	need(text(a.desc), "desc: one line");
	need(a.depends === undefined || texts(a.depends), "depends: a list of package relations");
	need(a.arch === undefined || a.arch === "all" || a.arch === "arm64", 'arch: "all" or "arm64"');
	need(a.copy === undefined || (a.copy && Object.entries(a.copy).every(([to, from]) => /^\/(?!.*\.\.)/.test(to) && text(from) && !from.startsWith("/") && !from.includes(".."))), "copy: installed path to repository path");
	if (a.launcher) need(text(a.command), "command: what the launcher runs");
	need(a.colors === undefined || (texts(a.colors) && a.colors.length === 2), "colors: two CSS colours");
	need(a.waylandIds === undefined || texts(a.waylandIds), "waylandIds: a list");
	return p;
}

/** Every app, checked. */
export function loadApps() {
	const apps = [], bad = [];
	for (const e of readdirSync(APPS, { withFileTypes: true })) {
		if (!e.isDirectory()) continue;
		const file = path.join(APPS, e.name, "app.json");
		let a;
		try { a = JSON.parse(readFileSync(file, "utf8")); } catch (err) { bad.push(`${file}: ${err.message}`); continue; }
		bad.push(...appProblems(a, e.name).map((m) => `${file}: ${m}`));
		apps.push({ ...a, dir: path.join(APPS, e.name) });
	}
	if (bad.length) throw new Error(bad.join("\n"));
	return apps.sort((x, y) => (x.id < y.id ? -1 : 1));
}

/** A hash of everything an app's package is made from: its directory (names, modes, contents) and its `copy` sources. */
export function sourceHash(app) {
	const h = createHash("sha256");
	const add = (name, file) => {
		const st = lstatSync(file);
		if (st.isDirectory()) {
			for (const n of readdirSync(file).sort()) add(`${name}/${n}`, path.join(file, n));
		} else {
			const link = st.isSymbolicLink();
			h.update(`${name}\0${link ? "l" : st.mode & 0o111 ? "x" : "f"}\0`);
			h.update(link ? readlinkSync(file) : readFileSync(file)).update("\0");
		}
	};
	add("", app.dir);
	for (const [to, from] of Object.entries(app.copy ?? {})) add(`copy:${to}`, path.join(ROOT, from));
	return h.digest("hex");
}

/** A deb822 text's stanzas, as { fields: Map, text }. */
export function stanzas(s) {
	return s.split(/\n\n+/).map((t) => t.trim()).filter(Boolean).map((t) => {
		const fields = new Map();
		let key;
		for (const line of t.split("\n")) {
			const m = /^([A-Za-z0-9-]+):\s?(.*)$/.exec(line);
			if (m) fields.set(key = m[1], m[2]);
			else if (key) fields.set(key, `${fields.get(key)}\n${line}`);
		}
		return { fields, text: t };
	});
}

/**
 * A published text file, or null where there is none yet. A publishing run
 * reads the bucket's copy (UEKO_PUBLISHED: a directory publish.sh filled),
 * where a missing file is really missing; the public site answers 403 for
 * that, which a run that only builds may take as "not published": what it
 * then makes twice, the publishing run refuses.
 */
export async function published(rel) {
	if (process.env.UEKO_PUBLISHED) {
		const f = path.join(process.env.UEKO_PUBLISHED, rel);
		return existsSync(f) ? readFileSync(f, "utf8") : null;
	}
	const r = await fetch(`${SITE}/${rel}`, { cache: "no-store", headers: { "cache-control": "no-cache" } });
	if (r.status === 404 || r.status === 403) return null; // S3 says 403 for a missing key it may not list
	if (!r.ok) throw new Error(`${SITE}/${rel}: HTTP ${r.status}`);
	const t = await r.text();
	if (/^\s*<(!doctype|html|a )/i.test(t)) return null; // the listing page
	return t;
}

export const sha256 = (b) => createHash("sha256").update(b).digest("hex");
export const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts });
