#!/usr/bin/env bash
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
        "docker.io/razanka/watchly-api": sha,
        "docker.io/razanka/watchly-transcoder-worker": sha,
    },
    f"k8s/{env}/kustomization.yaml": {
        "docker.io/razanka/watchly-client": f"{env}-{sha}",
    },
    "k8s/migration/kustomization.yaml": {
        "docker.io/razanka/watchly-migrator": sha,
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
