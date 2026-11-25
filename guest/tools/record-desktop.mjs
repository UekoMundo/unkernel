#!/usr/bin/env node
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2026 Vineel Sai
// Records what a desktop image reads until its desktop is up, and what its
// first applications read then: guest/distro/NAME/{desktop-files,apps-files}
// (guest/lib/image.sh lays the image out by them).
//
//   guest/tools/record-desktop.mjs NAME [SITE]
//
// NAME is an image of SITE's catalog (default https://linux.vineelsai.com)
// with a desktop. It makes a workspace of it in a headless Chromium ($CHROME,
// default chromium; software WebGL will do), with python3 and fanotify in the
// guest listing the files that are opened, in that order. Of those, a file is
// kept if it is small or enough of it is in memory at the end: a library of
// 100 MiB of which a session reads 5 is better read lazily.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [name, site = "https://linux.vineelsai.com"] = process.argv.slice(2);
if (!name) { console.error("usage: record-desktop.mjs NAME [SITE]"); process.exit(2); }
const APPS = {
	gnome: "nautilus gnome-text-editor gnome-control-center ptyxis gnome-terminal kgx",
	kde: "dolphin kate systemsettings konsole",
	xfce: "thunar mousepad xfce4-settings-manager xfce4-terminal",
};
const apps = APPS[Object.keys(APPS).find((k) => name.endsWith(k))] ?? "";
const PORT = 9400 + process.pid % 500;

const RECORDER = `
import ctypes, os, stat, struct
libc = ctypes.CDLL(None, use_errno=True)
fd = libc.fanotify_init(0x1 | 0x10, os.O_RDONLY)  # CLOEXEC, UNLIMITED_QUEUE
if fd < 0 or libc.fanotify_mark(fd, 0x1 | 0x100, ctypes.c_uint64(0x20 | 0x1000), -100, b"/") < 0:  # ADD FILESYSTEM, OPEN OPEN_EXEC
    raise SystemExit("fanotify: errno %d" % ctypes.get_errno())
out, seen = open("/run/kw-rec", "w", buffering=1), set()
while True:
    b, o = os.read(fd, 65536), 0
    while o < len(b):
        n, _, _, _, _, f, pid = struct.unpack_from("=IBBHQii", b, o)
        o += n
        if f < 0: continue
        try:
            p = os.readlink("/proc/self/fd/%d" % f)
            if p not in seen and stat.S_ISREG(os.fstat(f).st_mode) and pid != os.getpid():
                seen.add(p)
                out.write(p + "\\n")
        except OSError: pass
        os.close(f)
`;

// Bytes in memory, size and path of each file of /run/kw-list, in the image itself.
const RESIDENT = `
import ctypes, mmap, os
libc = ctypes.CDLL(None)
libc.mmap.restype = ctypes.c_void_p
libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
libc.mincore.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_char_p]
libc.munmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
with open("/run/kw-res", "w") as out:
    for line in open("/run/kw-list"):
        p = line.rstrip("\\n")
        try: f = os.open("/run/kw-lower/kw/distro" + p, os.O_RDONLY)
        except OSError: continue
        size, res = os.fstat(f).st_size, 0
        if size:
            m = libc.mmap(None, size, mmap.PROT_READ, mmap.MAP_SHARED, f, 0)
            v = ctypes.create_string_buffer((size + 4095) // 4096)
            if libc.mincore(m, size, v) == 0: res = sum(b & 1 for b in v.raw[:(size + 4095) // 4096]) * 4096
            libc.munmap(m, size)
        os.close(f)
        out.write("%d %d %s\\n" % (res, size, p[1:]))
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(path.join(process.env.KW_TMP ?? tmpdir(), "record-"));
const chrome = spawn(process.env.CHROME ?? "chromium", ["--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
	"--ignore-gpu-blocklist", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
const end = async (code) => { chrome.kill(); await sleep(2000); rmSync(profile, { recursive: true, force: true }); process.exit(code); };
try {
	let target;
	for (let i = 0; i < 60 && !target; i++) {
		await sleep(500);
		target = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page"), () => null);
	}
	const ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((r) => { ws.onopen = r; });
	let id = 0;
	const waiting = new Map();
	ws.onmessage = (m) => { const d = JSON.parse(m.data); waiting.get(d.id)?.(d); waiting.delete(d.id); };
	const send = (method, params = {}) => Promise.race([new Promise((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); }), sleep(150000).then(() => ({}))]);
	const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
	const sh = (script) => ev(`document.querySelector("iframe").contentWindow.KW.vm.exec("/bin/sh", ["-c", ${JSON.stringify(script)}], { user: "root", timeout: 120000 }).then((r) => r.stdout + r.stderr, () => undefined)`);
	const click = (find) => ev(`(() => { const b = [...document.querySelectorAll("button")].find(${find}); b?.click(); return !!b; })()`);
	const read = async (file) => {
		const parts = [];
		for (let n = 0; ; n++) {
			const b = Buffer.from(await sh(`dd if=${file} bs=60000 skip=${n} count=1 status=none | base64 -w0`) ?? "", "base64");
			parts.push(b);
			if (b.length < 60000) return Buffer.concat(parts).toString("utf8");
		}
	};
	/** The kept ones of the opened files from line `from` on. */
	const files = async (from) => {
		const out = await sh(`tail -n +${from} /run/kw-rec > /run/kw-list; echo ${Buffer.from(RESIDENT).toString("base64")} | base64 -d | python3 -I -`);
		if (out) throw new Error(`python3: ${out}`);
		return (await read("/run/kw-res")).split("\n").map((l) => /^(\d+) (\d+) (.*)$/.exec(l))
			.filter((m) => m && +m[2] > 0 && (+m[2] <= 262144 || +m[1] >= 0.35 * +m[2])).map((m) => m[3]);
	};

	await send("Page.navigate", { url: site });
	await sleep(8000);
	await click(`(b) => /^new workspace/i.test(b.innerText.trim())`);
	await sleep(1500);
	const set = (sel, value) => ev(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event("change", { bubbles: true })); return s.value; })()`);
	await set("#ws-distro", name.replace(/(gnome|kde|xfce)$/, ""));
	await sleep(500);
	if (await set("#ws-edition", name) !== name) throw new Error(`no image ${name} on ${site}`);
	await sleep(500);
	await click(`(b) => /^create/i.test(b.innerText.trim())`);
	const t0 = Date.now();
	while (!/^up/.test(await sh("echo up") ?? "")) { if (Date.now() - t0 > 300000) throw new Error("the guest does not start"); await sleep(500); }
	await sh(`echo ${Buffer.from(RECORDER).toString("base64")} | base64 -d > /run/kw-rec.py; setsid python3 -I /run/kw-rec.py > /run/kw-rec.log 2>&1 < /dev/null &`);
	while (!/up/.test(await sh("if test -e /run/user/1000/kw-desktop-ready || pgrep -x xfdesktop >/dev/null; then echo up; fi") ?? "")) { if (Date.now() - t0 > 900000) throw new Error("the desktop does not start"); await sleep(5000); }
	console.error(`${name}: the desktop is up after ${Math.round((Date.now() - t0) / 1000)} s`);
	await sleep(name.endsWith("xfce") ? 45000 : 20000);
	const n = Number(await sh("wc -l < /run/kw-rec"));
	const desktop = await files(1);
	await sh(`for a in ${apps}; do command -v $a >/dev/null && systemd-run --user -M user@ -q --collect $a; done; true`);
	await sleep(100000);
	const then = await files(n + 1);
	if (desktop.length < 200) throw new Error(`only ${desktop.length} files: ${await sh("cat /run/kw-rec.log")}`);
	const dir = path.join(import.meta.dirname, "../distro", name);
	const head = (what) => `# ${what}\n# Recorded by guest/tools/record-desktop.mjs ${name}; do not edit by hand.\n`;
	writeFileSync(path.join(dir, "desktop-files"), head(`What ${name} opens until its desktop is up, in that order (guest/lib/image.sh).`) + desktop.join("\n") + "\n");
	writeFileSync(path.join(dir, "apps-files"), head(`What the first applications in ${name} open (guest/lib/image.sh).`) + then.join("\n") + "\n");
	console.error(`${name}: ${desktop.length} + ${then.length} files`);
	if (process.env.KW_SHOT) writeFileSync(process.env.KW_SHOT, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
	await end(0);
} catch (e) {
	console.error(`${name}: ${e.message}`);
	await end(1);
}
