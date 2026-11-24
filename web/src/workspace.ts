// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// Workspaces: several independent machines on one origin. A load with ?ws=ID
// is the workspace ID: its data disk, suspended session, settings and this
// tab's notes are its own, so machines run side by side (tabs, or frames of
// a workspace manager, which share localStorage and sessionStorage) and
// never meet. Without ?ws= every name is upstream's, unchanged.
// The manager owns the ids; it deletes a workspace by deleting
// wsDataDisk()'s and wsSessionDb()'s databases and its scoped settings key
// (the names are its contract: apps/linux in UekoMundo/kenkon).

/** ?ws=, or null (none, or not a valid id: such a load is the plain page). */
export function workspaceId(search: string): string | null {
	const id = new URLSearchParams(search).get("ws");
	return id && /^[a-z0-9][a-z0-9-]{0,39}$/.test(id) ? id : null;
}

/** This load's workspace. */
export const WS: string | null = typeof location === "undefined" ? null : workspaceId(location.search);

/** A localStorage or sessionStorage key, of this workspace. */
export const scoped = (key: string, ws: string | null = WS): string => (ws ? `${key}@${ws}` : key);
/** The data disk's name (IndexedDB "kwdisk:<name>-<version>"). */
export const wsDataDisk = (name: string, ws: string | null = WS): string => (ws ? `ws-${ws}` : name);
/** The suspended session's database. */
export const wsSessionDb = (db: string, ws: string | null = WS): string => (ws ? `${db}@${ws}` : db);
