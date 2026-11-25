// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The launcher's Ueko folder: the apps of Ueko Linux's own repository, which
// the catalog lists (../../catalog.ts; distro/apps/ in this repository), so a
// published app is in the launcher without building the page again.
import { apps } from "virtual:unkernel-kernel";
import { defineGroup, type Distro, type TerminalApp } from "../types.ts";

export default defineGroup({
	id: "ueko", title: "Ueko", desc: "Apps made for Ueko Linux",
	// A seed with two leaves.
	icon: { svg: '<path d="M12 22v-9M12 13C12 8 8.500 5 3 5c0 5.500 3.500 8 9 8Zm0-1.500C12 7.500 15 4 21 4c0 5-3 7.500-9 7.500Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' },
	colors: ["#16a34a", "#052e16"],
}, apps.map((a): TerminalApp => ({
	id: a.id,
	title: a.title,
	desc: a.desc,
	icon: a.icon,
	colors: a.colors ?? ["#16a34a", "#052e16"],
	needs: { net: true, wayland: a.wayland },
	packages: Object.fromEntries(a.distros.map((d) => [d as Distro, a.packages])),
	waylandIds: a.waylandIds,
	commands: [a.command],
})));
