#!/usr/bin/env bash
# Points one environment's manifests at one build.
#
# Four images across three kustomizations have to move together, and the
# tags are immutable by design: a deploy is always an edit to these files,
# and doing it by hand is how three of them end up on one build and the
# fourth on another.
#
# The client tag carries its environment (<env>-<sha>) because its
# NEXT_PUBLIC_* values are compiled in; the rest are environment-independent
# and use the bare sha.
set -euo pipefail

ENV_NAME="${1:-}"
SHA="${2:-}"
if [ -z "$ENV_NAME" ] || [ -z "$SHA" ]; then
  echo "usage: $(basename "$0") <env> <sha>   # e.g. prod 1a2b3c4" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if [ ! -f "k8s/$ENV_NAME/kustomization.yaml" ]; then
  echo "k8s/$ENV_NAME/kustomization.yaml does not exist" >&2
  exit 1
fi

python3 - "$ENV_NAME" "$SHA" <<'PY'
import pathlib
import re
import sys

env, sha = sys.argv[1], sys.argv[2]
targets = {
    "k8s/base/kustomization.yaml": {
        "razanka/watchly-api": sha,
        "razanka/watchly-transcoder-worker": sha,
    },
    f"k8s/{env}/kustomization.yaml": {
        "razanka/watchly-client": f"{env}-{sha}",
    },
    "k8s/migration/kustomization.yaml": {
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
