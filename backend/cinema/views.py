from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Movie, Theater, Showtime, Booking
from .serializers import (
    MovieSerializer,
    MovieDetailSerializer,
    MovieImportSerializer,
    TheaterSerializer,
    ShowtimeSerializer,
    ShowtimeDetailSerializer,
    BookingCreateSerializer,
    BookingListSerializer,
)
from . import omdb


class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    """Películas en cartelera. Búsqueda OMDb en /api/movies/search_omdb/?q=."""
    queryset = Movie.objects.all()
    filter_backends = [SearchFilter]
    search_fields = ['title', 'description', 'genre']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            qs = qs.filter(is_now_showing=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MovieDetailSerializer
        return MovieSerializer

    @action(detail=False, methods=['get'])
    def search_omdb(self, request):
        """GET /api/movies/search_omdb/?q=interstellar"""
        query = request.query_params.get('q', '')
        page = int(request.query_params.get('page', 1))
        if not query:
            return Response(
                {'error': 'Parámetro ?q= requerido'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        results = omdb.search_omdb(query, page)
        return Response(results)

    @action(detail=False, methods=['post'])
    def import_omdb(self, request):
        """POST /api/movies/import_omdb/  {imdb_id: 'tt0816692'}"""
        serializer = MovieImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        imdb_id = serializer.validated_data['imdb_id']

        # Ya existe?
        existing = Movie.objects.filter(imdb_id=imdb_id).first()
        if existing:
            return Response(
                MovieSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        # Fetch de OMDb
        data = omdb.get_by_imdb_id(imdb_id)
        if not data:
            return Response(
                {'error': f'Película {imdb_id} no encontrada en OMDb'},
                status=status.HTTP_404_NOT_FOUND,
            )

        movie = Movie.objects.create(
            imdb_id=data['imdb_id'],
            title=data['title'],
            description=data['description'],
            poster_url=data['poster_url'],
            duration_min=data['duration_min'],
            genre=data['genre'],
            rating=data['rating'],
            release_date=data['release_date'] or datetime.now().date(),
            is_now_showing=True,
        )
        return Response(
            MovieSerializer(movie).data,
            status=status.HTTP_201_CREATED,
        )


class TheaterViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/theaters/ — lista salas"""
    queryset = Theater.objects.all()
    serializer_class = TheaterSerializer


class ShowtimeViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/showtimes/ — filtra por ?movie_id=&date="""
    queryset = Showtime.objects.select_related('movie', 'theater').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['movie_id']

    def get_queryset(self):
        qs = super().get_queryset()
        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(start_time__date=date_param)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ShowtimeDetailSerializer
        return ShowtimeSerializer


class BookingViewSet(viewsets.ModelViewSet):
    """POST /api/bookings/ — crear reserva. GET /api/bookings/?user_email="""
    queryset = Booking.objects.prefetch_related('seats').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user_email']

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingListSerializer

    def create(self, request, *args, **kwargs):
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
