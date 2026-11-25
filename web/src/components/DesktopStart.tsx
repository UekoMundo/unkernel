// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2026 Vineel Sai
// Over the boot messages while a machine's own desktop starts (config.ts
// Machine "display"): that it does, for how long, and why not when its session
// keeps ending. Until the screen shows a picture (desktopstart.ts isPicture())
// or the session has said for a while that it is up (a plain wallpaper).
import { useEffect, useState } from "react";
import { clock, isPicture, restarts, RESTARTS_SH, WHY_SH } from "../desktopstart.ts";
import { displayOpts, READY_SH } from "../display.ts";
import { KW } from "../kw.ts";
import { isStopped, useStore } from "../store.ts";

/** This long after the session said that it is up, whatever the picture. */
const PATIENCE_MS = 45_000;
/** Its session ended this often: not the odd start that was too slow. */
const FAILING = 2;

/** The display's picture, if it has one to judge. */
function picture(probe: CanvasRenderingContext2D): boolean {
	const fb = document.getElementById("fb") as HTMLCanvasElement | null;
	if (!fb?.width) return false;
	probe.drawImage(fb, 0, 0, probe.canvas.width, probe.canvas.height);
	return isPicture(probe.getImageData(0, 0, probe.canvas.width, probe.canvas.height).data);
}

export function DesktopStart() {
	const attached = useStore((s) => s.display.attached);
	const boot = useStore((s) => s.boot);
	const stopped = useStore(isStopped);
	const [up, setUp] = useState(false);
	const [messages, setMessages] = useState(false);
	const [now, setNow] = useState(() => performance.now());
	const [fails, setFails] = useState(0);
	const [why, setWhy] = useState<string | null>(null);

	useEffect(() => {
		if (up || stopped) return;
		const probe = Object.assign(document.createElement("canvas"), { width: 64, height: 36 }).getContext("2d", { willReadFrequently: true });
		const t = setInterval(() => {
			setNow(performance.now());
			if (probe && attached && picture(probe)) setUp(true);
		}, 1000);
		return () => clearInterval(t);
	}, [up, stopped, attached]);

	useEffect(() => {
		if (up || stopped || !boot.done) return;
		let on = true, readyAt = 0;
		void (async () => {
			while (on) {
				await new Promise((r) => setTimeout(r, 8000));
				const vm = displayOpts()?.vm();
				if (!on || !vm) continue;
				const ready = await vm.exec("/bin/sh", ["-c", READY_SH]).catch(() => null);
				if (ready?.exitCode === 0 && attached) {
					readyAt ||= performance.now();
					if (performance.now() - readyAt > PATIENCE_MS) setUp(true);
				} else {
					readyAt = 0;
					const r = await vm.exec("/bin/sh", ["-c", RESTARTS_SH], { user: "root" }).catch(() => null);
					if (on) setFails(restarts(r?.stdout));
				}
			}
		})();
		return () => { on = false; };
	}, [up, stopped, boot.done, attached]);

	if (up || stopped) return null;
	const name = KW.config.distro?.title ?? "Linux";
	const label = boot.label === `Starting ${name}` ? "Booting" : boot.label;
	const step = !boot.done ? (boot.detail ? `${label}, ${boot.detail}` : label) : attached ? "Drawing the desktop" : "Starting the desktop";
	const failing = fails >= FAILING;
	const explain = async () => {
		const r = await displayOpts()?.vm()?.exec("/bin/sh", ["-c", WHY_SH], { user: "root" }).catch((e: Error) => ({ stdout: e.message }));
		setWhy(r?.stdout.trim() || "The journal says nothing about it.");
	};
	if (messages) return (
		<button type="button" id="desktop-start" className="btn btn-sm ds-pill" onClick={() => setMessages(false)}>{failing ? "The desktop does not start" : `${step} · ${clock(now)}`}</button>
	);
	return (
		<div id="desktop-start" className="ds" role="status" aria-live="polite" data-failing={failing || undefined}>
			<div className="ds-card">
				{!failing && <span className="ds-ring" aria-hidden="true" />}
				<h1 className="ds-title">{failing ? `${name}'s desktop does not start` : `Starting ${name}`}</h1>
				<p className="ds-step">{failing ? `Its session ended ${fails} times and is being started again.` : <>{step}<span className="ds-time"> · {clock(now)}</span></>}</p>
				{!failing && <p className="ds-hint">A desktop takes a minute or more. The first start also downloads it.</p>}
				{why !== null && <pre className="ds-why">{why}</pre>}
				<div className="ds-acts">
					{failing && why === null && <button type="button" className="btn btn-sm" onClick={() => void explain()}>Show why</button>}
					<button type="button" className="btn btn-sm" onClick={() => setMessages(true)}>{attached ? "Show the screen" : "Boot messages"}</button>
				</div>
			</div>
		</div>
	);
}
