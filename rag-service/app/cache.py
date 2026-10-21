"""Small thread-safe TTL + LRU cache for query embeddings, retrieval results and answers."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import OrderedDict
from typing import Any


def cache_key(*parts: Any) -> str:
    raw = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class TTLCache:
    def __init__(self, max_items: int = 512, ttl_s: int = 3600) -> None:
        self.max_items = max_items
        self.ttl_s = ttl_s
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._data.get(key)
            if item is None or item[0] < time.monotonic():
                if item is not None:
                    del self._data[key]
                self.misses += 1
                return None
            self._data.move_to_end(key)
            self.hits += 1
            return item[1]

    def set(self, key: str, value: Any) -> None:
        if self.ttl_s <= 0 or self.max_items <= 0:
            return
        with self._lock:
            self._data[key] = (time.monotonic() + self.ttl_s, value)
            self._data.move_to_end(key)
            while len(self._data) > self.max_items:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def stats(self) -> dict:
        return {"items": len(self._data), "hits": self.hits, "misses": self.misses}
