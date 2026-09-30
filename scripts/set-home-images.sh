#!/usr/bin/env bash
# Points the home overlay at one build.
#
# Four images across two kustomizations have to move together, and the tags
# are immutable by design — a deploy is therefore always an edit to these
# files, and doing it by hand is how three of them end up on one build and
# the fourth on another.
#
# The client tag carries its environment (home-<sha>) because its
# NEXT_PUBLIC_* values are compiled in; the rest are environment-independent
# and use the bare sha.
set -euo pipefail

SHA="${1:-}"
if [ -z "$SHA" ]; then
  echo "usage: $(basename "$0") <sha>   # the tag Release Images printed" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

python3 - "$SHA" <<'PY'
import pathlib
import re
import sys

sha = sys.argv[1]
targets = {
    "k8s/home/kustomization.yaml": {
        "razanka/watchly-client": f"home-{sha}",
        "razanka/watchly-api": sha,
        "razanka/watchly-transcoder-worker": sha,
    },
    "k8s/home/migration/kustomization.yaml": {
        "razanka/watchly-migrator": sha,
    },
}

for path, images in targets.items():
    file = pathlib.Path(path)
    text = file.read_text()
    for image, tag in images.items():
        pattern = rf"(- name: {re.escape(image)}\n\s*newTag: )\S+"
        text, count = re.subn(pattern, rf"\g<1>{tag}", text)
        if count != 1:
            sys.exit(f"{path}: expected one entry for {image}, matched {count}")
        print(f"  {image} -> {tag}")
    file.write_text(text)
PY
