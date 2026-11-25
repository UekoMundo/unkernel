// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Vineel Sai
// The guest's side of background.ts: shell scripts, each with the app's
// directory as $1 (relative to ~, or absolute).

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
export const STATUS_SH = `cd && cd "$1" && cat run.status 2>/dev/null; exit 0`;
/** Stops it: what run.sh runs, then its session. */
export const STOP_SH = `cd && cd "$1" && [ -s run.pid ] && p=$(cat run.pid) && { for c in $(cat /proc/$p/task/*/children 2>/dev/null); do kill -TERM "$c" 2>/dev/null; done; kill -TERM -- "-$p" 2>/dev/null; echo 143 > run.status; rm -f run.pid; }; exit 0`;
/** A log with script(1)'s own lines left out, then a shell in the app's directory. */
export const LOG_SH = `cd && cd "$1" && grep -av '^Script \\(started\\|done\\) on ' run.log | tail -n 300; exec "\${SHELL:-/bin/sh}" -l`;
