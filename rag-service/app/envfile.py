"""
Loads KEY=VALUE files without overriding real environment variables. Lets the service and its
scripts share the app's ../.env.local during local development; production sets real env vars.
"""

from __future__ import annotations

import os
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def load_env_files(paths: list[Path] | None = None) -> list[Path]:
    loaded: list[Path] = []
    if os.environ.get("RAG_SKIP_ENV_FILES") == "1":  # tests, and deployments that only use real env vars
        return loaded
    for path in paths or [SERVICE_ROOT / ".env", SERVICE_ROOT.parent / ".env.local"]:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip().strip('"').strip("'")
            # Empty values (template placeholders) never clear a value set earlier.
            if key and value and key not in os.environ:
                os.environ[key] = value
        loaded.append(path)
    return loaded
