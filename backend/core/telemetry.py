"""Optional Sentry and Mixpanel telemetry helpers."""

from __future__ import annotations

import os
from typing import Any

try:
    import mixpanel
except Exception:  # pragma: no cover
    mixpanel = None

try:
    import sentry_sdk
except Exception:  # pragma: no cover
    sentry_sdk = None


_mixpanel = mixpanel.Mixpanel(os.getenv("MIXPANEL_TOKEN")) if mixpanel and os.getenv("MIXPANEL_TOKEN") else None


def configure_sentry() -> bool:
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not sentry_sdk or not dsn:
        return False
    sentry_sdk.init(dsn=dsn, traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")), environment=os.getenv("MOLFORGE_ENV", "development"))
    return True


def track(user_id: str, event: str, properties: dict[str, Any] | None = None) -> None:
    if not _mixpanel:
        return
    try:
        _mixpanel.track(user_id, event, properties or {})
    except Exception:
        return


def capture_exception(exc: Exception, context: dict[str, Any] | None = None) -> None:
    if not sentry_sdk:
        return
    with sentry_sdk.push_scope() as scope:
        for key, value in (context or {}).items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(exc)
