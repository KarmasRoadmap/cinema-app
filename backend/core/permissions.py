"""
RBAC utilities for Django Ninja endpoints.

Decorator helpers that check the authenticated user's role / staff status
before allowing the wrapped view to execute.
"""
from functools import wraps

from ninja.errors import HttpError


def role_required(*allowed_roles: str):
    """Decorator that requires the authenticated user to have one of *allowed_roles*.

    Example::

        @router.get("/admin/dashboard", auth=JWTAuth())
        @role_required("admin")
        def admin_dashboard(request):
            ...
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, "user", None)
            if user is None:
                raise HttpError(401, "Authentication required")

            if not user.is_authenticated:
                raise HttpError(401, "Authentication required")

            # Check staff / superuser for "admin" role
            if "admin" in allowed_roles and (user.is_staff or user.is_superuser):
                return view_func(request, *args, **kwargs)

            # Check custom role field if present
            user_role = getattr(user, "role", None)
            if user_role and user_role in allowed_roles:
                return view_func(request, *args, **kwargs)

            raise HttpError(403, "You do not have permission to perform this action")

        return wrapper

    return decorator


def admin_required(view_func):
    """Shortcut — require staff or superuser."""
    return role_required("admin")(view_func)
