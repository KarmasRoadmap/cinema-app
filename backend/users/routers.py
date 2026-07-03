"""
Auth & user endpoints — Django Ninja Router.

Endpoints:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/refresh
  GET  /api/users/me
  PUT  /api/users/me
  POST /api/users/change-password
"""
from ninja import Router
from ninja.errors import HttpError
from django.contrib.auth import authenticate

from core.auth import JWTAuth, create_access_token, create_refresh_token, decode_token
from core.permissions import role_required
from audit.utils import log_audit_event

from .models import User
from .schemas import (
    RegisterInput,
    LoginInput,
    TokenResponse,
    RefreshInput,
    UserOut,
    UserUpdateInput,
    PasswordChangeInput,
    AdminUpdateUserInput,
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
auth_router = Router(tags=["auth"])
user_router = Router(tags=["users"])

# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@auth_router.post("/register", response=TokenResponse, url_name="register")
def register(request, payload: RegisterInput):
    """Register a new user account."""
    if User.objects.filter(email=payload.email).exists():
        raise HttpError(409, "A user with this email already exists")

    user = User.objects.create_user(
        email=payload.email,
        password=payload.password,
        name=payload.name,
    )

    log_audit_event(
        user=user,
        action="user_registered",
        resource_type="User",
        resource_id=str(user.pk),
        request=request,
    )

    return TokenResponse(
        access=create_access_token(user),
        refresh=create_refresh_token(user),
        user_id=user.pk,
        email=user.email,
    )


@auth_router.post("/login", response=TokenResponse, url_name="login")
def login(request, payload: LoginInput):
    """Authenticate and return JWT pair."""
    user = authenticate(request, email=payload.email, password=payload.password)
    if user is None:
        raise HttpError(401, "Invalid email or password")

    if not user.is_active:
        raise HttpError(401, "User account is disabled")

    log_audit_event(
        user=user,
        action="user_login",
        resource_type="User",
        resource_id=str(user.pk),
        request=request,
    )

    return TokenResponse(
        access=create_access_token(user),
        refresh=create_refresh_token(user),
        user_id=user.pk,
        email=user.email,
    )


@auth_router.post("/refresh", response=TokenResponse, url_name="refresh")
def refresh_token(request, payload: RefreshInput):
    """Exchange a valid refresh token for a new access + refresh pair."""
    payload_data = decode_token(payload.refresh)
    if payload_data.get("type") != "refresh":
        raise HttpError(401, "Invalid token type — expected refresh token")

    try:
        user = User.objects.get(pk=payload_data["user_id"])
    except User.DoesNotExist:
        raise HttpError(401, "User not found")

    if not user.is_active:
        raise HttpError(401, "User account is disabled")

    return TokenResponse(
        access=create_access_token(user),
        refresh=create_refresh_token(user),
        user_id=user.pk,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# User profile endpoints (authenticated)
# ---------------------------------------------------------------------------
@user_router.get("/me", response=UserOut, auth=JWTAuth(), url_name="me")
def me(request):
    """Return the authenticated user's profile."""
    return request.user


@user_router.put("/me", response=UserOut, auth=JWTAuth(), url_name="update_me")
def update_me(request, payload: UserUpdateInput):
    """Update the authenticated user's profile."""
    user = request.user
    if payload.name is not None:
        user.name = payload.name
        user.save(update_fields=["name", "updated_at"])

        log_audit_event(
            user=user,
            action="user_updated_profile",
            resource_type="User",
            resource_id=str(user.pk),
            request=request,
        )

    return user


@user_router.post("/change-password", response={204: None}, auth=JWTAuth(), url_name="change_password")
def change_password(request, payload: PasswordChangeInput):
    """Change the authenticated user's password."""
    user = request.user
    if not user.check_password(payload.old_password):
        raise HttpError(400, "Current password is incorrect")

    user.set_password(payload.new_password)
    user.save(update_fields=["password", "updated_at"])

    log_audit_event(
        user=user,
        action="user_changed_password",
        resource_type="User",
        resource_id=str(user.pk),
        request=request,
    )

    return 204, None


# ── Admin user management ───────────────────────────────────

@user_router.get("/", response=list[UserOut], auth=JWTAuth(), url_name="admin_list_users")
@role_required("admin")
def admin_list_users(request):
    return list(User.objects.all().order_by("-created_at"))


@user_router.post("/", response=UserOut, auth=JWTAuth(), url_name="admin_create_user")
@role_required("admin")
def admin_create_user(request, payload: RegisterInput):
    if User.objects.filter(email=payload.email).exists():
        raise HttpError(409, "A user with this email already exists")
    user = User.objects.create_user(
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role=payload.role,
    )
    log_audit_event(
        user=request.user, action="admin_created_user",
        resource_type="User", resource_id=str(user.pk), request=request,
    )
    return user


@user_router.get("/{user_id}", response=UserOut, auth=JWTAuth(), url_name="admin_get_user")
@role_required("admin")
def admin_get_user(request, user_id: int):
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")


@user_router.patch("/{user_id}", response=UserOut, auth=JWTAuth(), url_name="admin_update_user")
@role_required("admin")
def admin_update_user(request, user_id: int, payload: AdminUpdateUserInput):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")

    if payload.email is not None:
        user.email = payload.email
    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password is not None:
        user.set_password(payload.password)
    user.save()

    log_audit_event(
        user=request.user, action="admin_updated_user",
        resource_type="User", resource_id=str(user.pk), request=request,
    )
    return user


@user_router.delete("/{user_id}", response={204: None}, auth=JWTAuth(), url_name="admin_delete_user")
@role_required("admin")
def admin_delete_user(request, user_id: int):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")
    user.is_active = False
    user.save()

    log_audit_event(
        user=request.user, action="admin_deactivated_user",
        resource_type="User", resource_id=str(user.pk), request=request,
    )
    return 204, None
