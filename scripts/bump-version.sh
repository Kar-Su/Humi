#!/usr/bin/env bash
set -euo pipefail
if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>  e.g. 0.2.0 or v0.2.0" >&2
  exit 1
fi
VER="${1#v}"
if ! [[ "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version: $VER (need X.Y.Z)" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Bumping to $VER ..."

# ai-service/pyproject.toml
sed -i -E "s/^version = \".*\"/version = \"$VER\"/" "$ROOT/ai-service/pyproject.toml"
# frontend/package.json + package-lock.json
if command -v python3 >/dev/null 2>&1; then
  python3 - "$ROOT/frontend/package.json" "$VER" << 'PY'
import json, sys
path, ver = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
data["version"] = ver
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
else
  sed -i -E "s/\"version\": \".*\"/\"version\": \"$VER\"/" "$ROOT/frontend/package.json"
fi
if [ -f "$ROOT/frontend/package-lock.json" ]; then
  python3 - "$ROOT/frontend/package-lock.json" "$VER" << 'PY'
import json, sys
path, ver = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
data["version"] = ver
if "packages" in data and "" in data["packages"]:
    data["packages"][""]["version"] = ver
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
fi
echo "Done. Verify: ai-service/pyproject.toml + frontend/package.json = $VER"
