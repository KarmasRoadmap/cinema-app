from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Movie, Theater, Showtime, Booking
from .serializers import (
    MovieSerializer,
    MovieDetailSerializer,
    TheaterSerializer,
    ShowtimeSerializer,
    ShowtimeDetailSerializer,
    BookingCreateSerializer,
    BookingListSerializer,
)


class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/movies/ — lista películas con is_now_showing=True, permite ?search=
    GET /api/movies/{id}/ — detalle con showtimes anidados
    """
    queryset = Movie.objects.all()
    filter_backends = [SearchFilter]
    search_fields = ['title', 'description', 'genre']

    def get_queryset(self):
        qs = super().get_queryset()
        # Solo películas en cartelera por defecto, a menos que sea detalle
        if self.action == 'list':
            qs = qs.filter(is_now_showing=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MovieDetailSerializer
        return MovieSerializer


class TheaterViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/theaters/ — lista salas"""
    queryset = Theater.objects.all()
    serializer_class = TheaterSerializer


class ShowtimeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/showtimes/ — filtra por ?movie_id=&date=
    GET /api/showtimes/{id}/ — detalle con asientos ocupados
    """
    queryset = Showtime.objects.select_related('movie', 'theater').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['movie_id']

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtro por fecha: ?date=YYYY-MM-DD
        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(start_time__date=date_param)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ShowtimeDetailSerializer
        return ShowtimeSerializer


class BookingViewSet(viewsets.ModelViewSet):
    """
    POST /api/bookings/ — recibe {showtime_id, user_email, seats: [{seat_label}]}
    GET /api/bookings/ — filtra por ?email=
    """
    queryset = Booking.objects.prefetch_related('seats').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user_email']

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingListSerializer

    def create(self, request, *args, **kwargs):
        # Mapear showtime_id del request al campo showtime
        data = request.data.copy()
        if 'showtime_id' in data and 'showtime' not in data:
            data['showtime'] = data['showtime_id']

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(
            BookingListSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )
