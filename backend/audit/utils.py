"""
Lightweight helpers for writing audit events.
"""
import json
from typing import Any, Optional


def _get_ip(request) -> Optional[str]:
    """Extract the client IP from a Django request object."""
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    user: Any,
    action: str,
    resource_type: str = "",
    resource_id: str = "",
    metadata: Optional[dict] = None,
    request: Any = None,
) -> Any:
    """Create and persist an AuditEvent.

    Returns the created AuditEvent instance, or ``None`` if creation failed
    (e.g. during migrations before the table exists).

    Parameters
    ----------
    user:
        The authenticated user who performed the action (or ``None``).
    action:
        Short action code, e.g. ``"user_login"``, ``"user_registered"``.
    resource_type:
        Model name or resource category, e.g. ``"User"``.
    resource_id:
        Primary key of the affected resource.
    metadata:
        Optional JSON-serialisable dict with extra context.
    request:
        Django request object (used to extract the client IP).
    """
    from .models import AuditEvent

    ip = None
    if request is not None:
        ip = _get_ip(request)

    try:
        return AuditEvent.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
            ip_address=ip,
        )
    except Exception:
        # Silently swallow audit write failures so they never break the
        # main request flow.
        return None


def get_user_activity(user: Any, limit: int = 50) -> list:
    """Return the most recent audit events for *user*."""
    from .models import AuditEvent

    return list(
        AuditEvent.objects.filter(user=user).order_by("-created_at")[:limit]
    )
