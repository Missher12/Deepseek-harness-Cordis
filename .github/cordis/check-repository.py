"""Check the public component inventory without loading private projects."""

import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
EXPECTED = {
    "@missher/dsh-context-manager": "Missher12/Missher-DSH-Context-Manager",
    "@missher/dsh-session-bridge": "Missher12/Missher-DSH-Session-Bridge",
    "@missher/dsh-output-renderer": "Missher12/Missher-DSH-Output-Renderer",
    "@missher/dsh-usage-statistics": "Missher12/Missher-DSH-Usage-Statistics",
    "@missher/dsh-reasoning-effort": "Missher12/Missher-DSH-Reasoning-Effort",
    "@missher/dsh-media-missher": "Missher12/Missher-Media",
    "@missher/dsh-mse-learning": "Missher12/Missher-MSE-Learning",
}


def main():
    inventory = json.loads((ROOT / "cordis-repositories.json").read_text())
    actual = {entry["package"]: entry["repository"] for entry in inventory["external"]}
    if actual != EXPECTED or len(inventory["external"]) != len(EXPECTED):
        raise SystemExit("The independent Bundle inventory has changed; review ownership first.")
    if inventory["bundles"]:
        raise SystemExit("Plugin source belongs in the independent repositories.")
    for entry in inventory["external"]:
        if not entry["version"] or len(entry["commit"]) != 40:
            raise SystemExit("Every plugin must identify its published version and commit.")
    private = {
        entry["repository"]
        for entry in inventory["external"]
        if entry["visibility"] == "private"
    }
    if private != {"Missher12/Missher-Media"}:
        raise SystemExit("Private repository declarations require explicit user review.")
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT
    ).decode().split("\0")
    excluded = (
        "coordination/", "private/", "Media@Missher/", "mse/",
        "plugins/dsh-",
    )
    forbidden = [name for name in tracked if name.startswith(excluded)]
    if forbidden:
        raise SystemExit("Private or local-only directories entered the public index.")
    print("Seven independent Bundles verified; private and local-only directories excluded.")


if __name__ == "__main__":
    main()
