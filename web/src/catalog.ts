// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The image catalog of a build with KW_CATALOG=<url> (vite.config.ts): a JSON
// file the page reads at load, so a distro or an app is published without
// building the page again (distro/tools/catalog.mjs writes it). URLs in it
// are relative to it; images are content-named, so they never change.

/** A distro image of the catalog. */
export interface CatalogImage {
	name: string;
	url: string;
	size: number;
	imageId?: string;
	/** Its name for people ("Ueko Linux"). */
	title?: string;
	/** Whose packages the launcher's apps name here ("debian" for a Debian derivative). */
	family?: string;
	/** Its Mesa has the virgl driver (guest GL). */
	gl?: boolean;
	/** What the page shows of it (config.ts Machine); none: the page's own desktop. */
	ui?: "display" | "console";
}

/** An app of the catalog: a package of one distro's repository, in the launcher. */
export interface CatalogApp {
	id: string;
	title: string;
	desc: string;
	/** The distro images it is for. */
	distros: string[];
	packages: string[];
	command: string;
	icon?: string;
	colors?: [string, string];
	wayland?: boolean;
	waylandIds?: string[];
}

export interface Catalog { images: CatalogImage[]; apps: CatalogApp[] }

const NAME = /^[a-z0-9][a-z0-9-]*$/;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * The entries of `json` (the catalog at `base`) this page can use: images
 * built for the kernel's `abi`, well formed; the rest are left out, so one
 * bad entry never takes the page down.
 */
export function parseCatalog(json: unknown, base: string, abi: number): Catalog {
	const j = (json ?? {}) as { abi?: unknown; images?: unknown; apps?: unknown };
	const images = (Array.isArray(j.images) ? j.images : []) as Record<string, unknown>[];
	const apps = (Array.isArray(j.apps) ? j.apps : []) as Record<string, unknown>[];
	return {
		images: images.filter((i) => typeof i?.name === "string" && NAME.test(i.name) && typeof i.url === "string" &&
			Number.isInteger(i.size) && (i.abi ?? j.abi) === abi).map((i) => ({
			name: i.name as string,
			url: new URL(i.url as string, base).href,
			size: i.size as number,
			...(typeof i.image === "string" ? { imageId: i.image } : {}),
			...(typeof i.title === "string" ? { title: i.title } : {}),
			...(typeof i.family === "string" ? { family: i.family } : {}),
			gl: i.gl === true,
			...(i.ui === "display" || i.ui === "console" ? { ui: i.ui } : {}),
		})),
		apps: apps.filter((a) => typeof a?.id === "string" && NAME.test(a.id) && typeof a.title === "string" &&
			typeof a.command === "string" && strings(a.packages) && strings(a.distros)).map((a) => ({
			id: a.id as string,
			title: a.title as string,
			desc: typeof a.desc === "string" ? a.desc : (a.title as string),
			distros: a.distros as string[],
			packages: a.packages as string[],
			command: a.command as string,
			...(typeof a.icon === "string" ? { icon: a.icon } : {}),
			...(strings(a.colors) && a.colors.length === 2 ? { colors: a.colors as [string, string] } : {}),
			wayland: a.wayland === true,
			...(strings(a.waylandIds) ? { waylandIds: a.waylandIds } : {}),
		})),
	};
}

/** The catalog at `url` (revalidated), or an empty one where it cannot be read. */
export async function loadCatalog(url: string, abi: number): Promise<Catalog> {
	try {
		const r = await fetch(url, { cache: "no-cache" });
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		return parseCatalog(await r.json(), url, abi);
	} catch (e) {
		console.error(`[catalog] ${url}: ${(e as Error)?.message ?? e}`);
		return { images: [], apps: [] };
	}
}
