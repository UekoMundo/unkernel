#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// Start an app: node distro/tools/new-app.mjs ID [cli|gui]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { APPS, appProblems } from "./lib.mjs";

const [id, kind = "cli"] = process.argv.slice(2);
if (!id || !["cli", "gui"].includes(kind)) {
	console.error("usage: new-app.mjs ID [cli|gui]");
	process.exit(2);
}
const dir = path.join(APPS, id), gui = kind === "gui";
const app = {
	id, version: "0.1", title: id, desc: `${id} for Ueko Linux`,
	depends: gui ? ["python3", "python3-gi", "gir1.2-gtk-3.0", "fonts-dejavu-core"] : ["bash"],
	command: id, icon: "✨", colors: ["#16a34a", "#052e16"], ...(gui ? { wayland: true, waylandIds: [id] } : {}), launcher: true,
};
const bad = appProblems(app, id);
if (bad.length) throw new Error(bad.join("\n"));
if (existsSync(dir)) throw new Error(`${dir} exists`);
mkdirSync(path.join(dir, "root/usr/bin"), { recursive: true });
writeFileSync(path.join(dir, "app.json"), `${JSON.stringify(app, null, 2)}\n`);
writeFileSync(path.join(dir, "root/usr/bin", id), gui ? `#!/usr/bin/python3
import gi

gi.require_version("Gtk", "3.0")
from gi.repository import GLib, Gtk  # noqa: E402

GLib.set_prgname("${id}")  # the window's app id (app.json waylandIds)
win = Gtk.Window(title="${id}", default_width=480, default_height=320)
win.add(Gtk.Label(label="Hello from ${id}"))
win.connect("destroy", Gtk.main_quit)
win.show_all()
Gtk.main()
` : `#!/bin/bash
set -euo pipefail
echo "Hello from ${id} on $(uname -srm)"
`, { mode: 0o755 });
console.log(`${dir}\nEdit it, then: node distro/tools/build-apps.mjs ${id} (builds distro/out/debs/), and open a pull request to ueko: its merge publishes it.`);
