"""Entry point for hosts that look for an ASGI `app` at the project root (e.g. Vercel's FastAPI preset)."""

from app.main import app

__all__ = ["app"]
