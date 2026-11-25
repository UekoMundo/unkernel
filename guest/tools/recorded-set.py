#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
# Copyright (C) 2026 Vineel Sai
"""The files of a recorded list (guest/distro/NAME/desktop-files) that an
image has.

    recorded-set.py LIST TAR

Prints, in LIST's order, the regular files with data in TAR (mktree.py's
stream) that LIST names, one path per line. A list is recorded by hand and
the image built again every month, so a path that is not there stands for
the ones that differ from it only in their numbers (libmutter-18.so.0.0.0:
libmutter-19.so.0.0.0); one without any is left out.
"""
import re
import sys
import tarfile


def key(path):
    return re.sub(r"[0-9]+(\.[0-9]+)*", "#", path)


def main():
    listfile, tar = sys.argv[1:]
    have = {}
    with tarfile.open(tar) as t:
        for m in t:
            if m.isreg() and m.size:
                have[m.name.removeprefix("./")] = None
    by_key = {}
    for p in have:
        by_key.setdefault(key(p), []).append(p)
    seen = set()
    with open(listfile) as f:
        for line in f:
            p = line.rstrip("\n")
            if not p or p.startswith("#"):
                continue
            for q in [p] if p in have else by_key.get(key(p), []):
                if q not in seen:
                    seen.add(q)
                    print(q)


main()
