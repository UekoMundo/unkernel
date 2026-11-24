// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// Launcher apps that are more than their terminal (a Wayland window, a
// program on the display, a server the Browser shows) run with no terminal at
// all: run.sh is started in the guest in a session of its own, on a pty
// nobody sees (script(1), where the guest has util-linux's), with its output
// in run.log, its pid in run.pid while it runs and its exit status in
// run.status. Nothing of it is the page's, so it outlives a reload that
// resumes the machine. A failure is a toast that offers the log.
import type { TerminalApp } from "./apps/types.ts";
import { KW } from "./kw.ts";
import type { KernelHandle } from "./sdk.ts";
import { isHeld, isStopped, ui$ } from "./store.ts";

/** The app is not its terminal: it runs without one. */
export const inBackground = (d: TerminalApp): boolean => !!(d.needs?.wayland || d.needs?.display || d.ports?.length);

// In the app's directory ($1, relative to ~, or absolute): prints "running"
// when run.sh already runs, else starts it. The shell's descriptors are the
// exec's: the session has its own, or the exec would wait for it. Standard
// input is a FIFO held open, so a program that reads its terminal waits.
export const START_SH = `cd && cd "$1" || exit 1
[ -s run.pid ] && kill -0 "$(cat run.pid)" 2>/dev/null && { echo running; exit 0; }
rm -f run.pid run.status run.log .in
mkfifo -m 600 .in || exit 1
if script --version 2>/dev/null | grep -q util-linux; then how='script -qefc ./run.sh run.log'; else how='./run.sh'; fi
setsid sh -c 'exec 3<>.in; rm -f .in; echo $$ > run.pid
trap : INT
if [ "$1" = ./run.sh ]; then ./run.sh <&3 >run.log 2>&1; else $1 <&3 >/dev/null 2>&1; fi
echo $? > run.status; rm -f run.pid' sh "$how" </dev/null >/dev/null 2>&1 &
exit 0`;

/** Prints the exit status once run.sh ended. */
const STATUS_SH = `cd && cd "$1" && cat run.status 2>/dev/null; exit 0`;
const STOP_SH = `cd && cd "$1" && [ -s run.pid ] && p=$(cat run.pid) && { for c in $(cat /proc/$p/task/*/children 2>/dev/null); do kill -TERM "$c" 2>/dev/null; done; kill -TERM -- "-$p" 2>/dev/null; echo 143 > run.status; rm -f run.pid; }; exit 0`;
/** A log with script(1)'s own lines left out, then a shell in the app's directory. */
const LOG_SH = `cd && cd "$1" && grep -av '^Script \\(started\\|done\\) on ' run.log | tail -n 300; exec "\${SHELL:-/bin/sh}" -l`;

/** The directory as the scripts take it: relative to ~, or absolute. */
const home = (dir: string) => dir.replace(/^~\//, "");

/** A run asked to stop by hand: its status is no failure. */
const stopping = new Set<string>();

/** Start the app's run.sh in `dir`; "running" when it already runs. */
export async function startBackground(vm: KernelHandle, d: TerminalApp, dir: string): Promise<"started" | "running"> {
	// A login shell, as a terminal's: PATH, the Wayland session.
	const r = await vm.exec("/bin/sh", ["-lc", START_SH, "sh", home(dir)]);
	if (r.exitCode !== 0) throw new Error(r.stderr.trim() || `it did not start (exit ${r.exitCode})`);
	if (/^running$/m.test(r.stdout)) return "running";
	stopping.delete(d.id);
	void watch(vm, d, dir);
	return "started";
}

/** Stop it. */
export async function stopBackground(vm: KernelHandle, d: TerminalApp, dir: string): Promise<void> {
	stopping.add(d.id);
	await vm.exec("/bin/sh", ["-c", STOP_SH, "sh", home(dir)]);
}

/** Open its log in a Terminal window. */
export function showLog(d: TerminalApp, dir: string): void {
	KW.windows?.open({ name: `${d.id} log`, file: "/bin/sh", args: ["-lc", LOG_SH, "sh", home(dir)], window: "new" }).catch(() => {});
}

/** When its status is looked at after the start (seconds): a failure mostly shows early. */
const LOOK = [1, 2, 3, 5, 10, 15, 30, 60, 60, 120];

async function watch(vm: KernelHandle, d: TerminalApp, dir: string): Promise<void> {
	for (const s of LOOK) {
		await new Promise((r) => setTimeout(r, s * 1000));
		const st = ui$().get();
		if (isStopped(st) || KW.vm !== vm) return;
		if (isHeld(st)) continue;
		const r = await vm.exec("/bin/sh", ["-c", STATUS_SH, "sh", home(dir)]).catch(() => null);
		if (!r) return;
		const code = r.stdout.trim();
		if (!code) continue;
		if (code !== "0" && !stopping.has(d.id))
			KW.ui?.toast(`${d.title} stopped (exit ${code})`, { action: "Show log", run: () => showLog(d, dir), ms: 12000 });
		return;
	}
}
