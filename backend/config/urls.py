"""
URL configuration for Cinema App project.
"""
from django.contrib import admin
from django.urls import path, include
from ninja import NinjaAPI

from users.routers import auth_router, user_router

# ── Django Ninja API ────────────────────────────────────────────────────
api = NinjaAPI(title="Cinema App", version="1.0.0")

api.add_router("/auth/", auth_router)
api.add_router("/users/", user_router)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('cinema.urls')),
    path('api/', api.urls),
]
