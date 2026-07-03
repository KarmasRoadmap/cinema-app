"""
Pydantic schemas for user / auth endpoints (Django Ninja).
"""
from datetime import datetime
from typing import Optional

from ninja import Schema


# ── Auth ────────────────────────────────────────────────────────────────────
class RegisterInput(Schema):
    email: str
    password: str
    name: str = ""
    role: str = "user"


class LoginInput(Schema):
    email: str
    password: str


class TokenResponse(Schema):
    access: str
    refresh: str
    user_id: int
    email: str


class RefreshInput(Schema):
    refresh: str


# ── User profile ────────────────────────────────────────────────────────────
class UserOut(Schema):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    has_membership: bool
    created_at: datetime
    updated_at: datetime


class UserUpdateInput(Schema):
    name: Optional[str] = None
    has_membership: Optional[bool] = None


class PasswordChangeInput(Schema):
    old_password: str
    new_password: str


# ── Admin ────────────────────────────────────────────────────────────────────
class AdminUpdateUserInput(Schema):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ── Admin: bookings ──────────────────────────────────────────────────────────
class AdminSeatOut(Schema):
    id: int
    seat_label: str
    qr_code: str = ""


class AdminBookingOut(Schema):
    id: int
    showtime_id: int
    movie_title: str
    theater_name: str
    start_time: datetime
    user_email: str
    status: str
    total: float
    discount: float
    has_membership: bool
    seats: list[AdminSeatOut]
    created_at: datetime
