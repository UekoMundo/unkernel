// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2026 Vineel Sai
// What DesktopStart.tsx shows while a machine's own desktop starts: the parts
// without a page, tested in test/ueko.test.ts.

/** m:ss */
export const clock = (ms: number): string => {
	const s = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Whether RGBA pixels are a desktop's picture: more than a black or plain
 * screen with a pointer, or a bar on one (what a compositor shows before its
 * shell has drawn).
 */
export function isPicture(rgba: ArrayLike<number>, atLeast = 24): boolean {
	const seen = new Set<number>();
	for (let i = 0; i + 2 < rgba.length; i += 4) {
		seen.add((rgba[i]! >> 3) << 10 | (rgba[i + 1]! >> 3) << 5 | rgba[i + 2]! >> 3);
		if (seen.size >= atLeast) return true;
	}
	return false;
}

/** The session's restarts from `systemctl show -P NRestarts`; 0 for anything else. */
export const restarts = (out: string | undefined): number => {
	const n = Number((out ?? "").trim() || NaN);
	return Number.isInteger(n) && n > 0 ? n : 0;
};

/** Root, in the guest: the session's restarts, and why it ended. */
export const RESTARTS_SH = "systemctl show -P NRestarts kw-desktop";
export const WHY_SH = "systemctl --user -M user@ --failed --no-legend --plain; journalctl -b --no-pager -o cat -n 400 | grep -iE 'error|fail|fatal|abort|signal|dumped|egl|opengl|drm' | tail -40";
