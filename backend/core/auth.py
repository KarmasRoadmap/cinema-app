"""
JWT authentication utilities for Django Ninja.

Provides:
- JWTAuth: HttpBearer subclass for Django Ninja endpoints.
- create_access_token / create_refresh_token / decode_token helpers.
"""
import os
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from ninja.security import HttpBearer
from ninja.errors import HttpError


# ---------------------------------------------------------------------------
# JWT configuration
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"


def _get_secret() -> str:
    """Return the JWT signing secret."""
    return os.environ.get("JWT_SECRET", settings.SECRET_KEY)


def _get_access_lifetime() -> int:
    """Return access-token lifetime in hours (default 24)."""
    return getattr(settings, "JWT_ACCESS_TOKEN_LIFETIME_HOURS", 24)


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------
def create_access_token(user) -> str:
    """Create a short-lived access token for *user*."""
    payload = {
        "user_id": user.pk,
        "email": user.email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=_get_access_lifetime()),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _get_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user) -> str:
    """Create a longer-lived refresh token for *user*."""
    payload = {
        "user_id": user.pk,
        "email": user.email,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _get_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT.  Raises HttpError on failure."""
    try:
        return jwt.decode(token, _get_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HttpError(401, "Token has expired")
    except jwt.InvalidTokenError:
        raise HttpError(401, "Invalid token")


# ---------------------------------------------------------------------------
# Django Ninja authentication class
# ---------------------------------------------------------------------------
class JWTAuth(HttpBearer):
    """Django Ninja authentication backend that reads a Bearer JWT.

    Usage in routers::

        router = Router()
        router.add_route("GET", "/me", view, auth=JWTAuth())
    """

    def authenticate(self, request, token: str):
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HttpError(401, "Invalid token type — expected access token")

        User = __import__("django.contrib.auth").contrib.auth.get_user_model()
        try:
            user = User.objects.get(pk=payload["user_id"])
        except User.DoesNotExist:
            raise HttpError(401, "User not found")

        if not user.is_active:
            raise HttpError(401, "User account is disabled")

        # Attach user to request so views can access request.user
        request.user = user
        return user


# ---------------------------------------------------------------------------
# DRF-compatible authentication class
# ---------------------------------------------------------------------------
from rest_framework import authentication
from rest_framework import exceptions as drf_exceptions


class DRFJWTAuth(authentication.BaseAuthentication):
    """DRF authentication class that reads a Bearer JWT token.

    Reuses the same ``decode_token`` / User model as the Ninja JWTAuth.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None  # Not a Bearer token → skip to next auth class

        token = auth_header[7:].strip()
        try:
            payload = decode_token(token)
        except HttpError as e:
            raise drf_exceptions.AuthenticationFailed(str(e))

        if payload.get("type") != "access":
            raise drf_exceptions.AuthenticationFailed(
                "Invalid token type — expected access token"
            )

        User = __import__("django.contrib.auth").contrib.auth.get_user_model()
        try:
            user = User.objects.get(pk=payload["user_id"])
        except User.DoesNotExist:
            raise drf_exceptions.AuthenticationFailed("User not found")

        if not user.is_active:
            raise drf_exceptions.AuthenticationFailed("User account is disabled")

        return (user, token)
