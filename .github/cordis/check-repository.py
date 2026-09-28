"""Check the public component inventory without loading private projects."""

import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
EXPECTED = {
    "plugins/dsh-context-manager": "dsh-context-manager",
    "plugins/dsh-session-bridge": "dsh-session-bridge",
    "plugins/dsh-output-renderer": "@missher/dsh-output-renderer",
    "plugins/dsh-usage-statistics": "@missher/dsh-usage-statistics",
}


def main():
    inventory = json.loads((ROOT / "cordis-repositories.json").read_text())
    actual = {entry["path"]: entry["name"] for entry in inventory["bundles"]}
    if actual != EXPECTED or len(inventory["bundles"]) != len(EXPECTED):
        raise SystemExit("The public Bundle inventory has changed; review its ownership first.")
    for entry in inventory["bundles"]:
        directory = ROOT / entry["path"]
        package = json.loads((directory / "package.json").read_text())
        if package["name"] != entry["name"] or package["version"] != entry["version"]:
            raise SystemExit(f"Package identity differs from inventory: {entry['path']}")
        if not (directory / package["dsh"]["bundle"]["patch"]).is_file():
            raise SystemExit(f"Missing Bundle configuration: {entry['path']}")
    private = {
        entry["repository"]
        for entry in inventory["external"]
        if entry["visibility"] == "private"
    }
    if private != {"Missher12/media-missher", "Missher12/dsh-reasoning-effort"}:
        raise SystemExit("Private repository declarations require explicit user review.")
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT
    ).decode().split("\0")
    excluded = (
        "coordination/", "private/", "Media@Missher/", "mse/",
        "plugins/dsh-reasoning-effort/", "plugins/dsh-media-missher/",
    )
    forbidden = [name for name in tracked if name.startswith(excluded)]
    if forbidden:
        raise SystemExit("Private or local-only directories entered the public index.")
    print("Four public Bundles verified; private and local-only directories excluded.")


if __name__ == "__main__":
    main()
