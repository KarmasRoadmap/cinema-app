from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MovieViewSet, TheaterViewSet, ShowtimeViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'theaters', TheaterViewSet, basename='theater')
router.register(r'showtimes', ShowtimeViewSet, basename='showtime')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]
