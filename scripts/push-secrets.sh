#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${1:-}"
if [ -z "$ENV_NAME" ]; then
  echo "usage: $(basename "$0") <env>   # e.g. prod" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

FILE="k8s/$ENV_NAME/.env.secrets"
if [ ! -f "$FILE" ]; then
  echo "$FILE does not exist; copy k8s/base/.env.example and fill it in" >&2
  exit 1
fi

SECRET_ID="$(terraform -chdir=terraform output -json app_secret_ids | python3 -c '
import json, sys
ids = json.load(sys.stdin)
env = sys.argv[1]
if env not in ids:
    sys.exit(f"no app secret for {env!r} in terraform; add it to secret_environments")
print(ids[env])
' "$ENV_NAME")"

CONTENT="$(python3 - "$FILE" k8s/base/.env.example <<'PY'
import base64, json, re, sys

def parse(path):
    pairs = {}
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        line = line.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition("=")
        if not sep or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            sys.exit(f"{path}:{n}: expected KEY=VALUE")
        pairs[key] = value
    return pairs

values = parse(sys.argv[1])
missing = sorted(set(parse(sys.argv[2])) - set(values))
if missing:
    sys.exit(f"{sys.argv[1]} is missing: {', '.join(missing)}")
empty = sorted(k for k, v in values.items() if not v)
if empty:
    sys.exit(f"{sys.argv[1]} has empty values: {', '.join(empty)}")

print(base64.b64encode(json.dumps(values).encode()).decode())
PY
)"

umask 077
PARAMS="$(mktemp)"
trap 'rm -f "$PARAMS"' EXIT
printf '{"secretContentContent": "%s"}' "$CONTENT" > "$PARAMS"

oci vault secret update-base64 \
  --secret-id "$SECRET_ID" \
  --from-json "file://$PARAMS" \
  --query 'data."current-version-number"' --raw-output \
  | sed "s/^/watchly-$ENV_NAME-app is now at version /"
