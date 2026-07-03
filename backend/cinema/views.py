from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

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
from . import tmdb


class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    """Películas en cartelera. Búsqueda TMDB en /api/movies/search_tmdb/?q=."""
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
    def search_tmdb(self, request):
        """GET /api/movies/search_tmdb/?q=interstellar"""
        query = request.query_params.get('q', '')
        page = int(request.query_params.get('page', 1))
        if not query:
            return Response(
                {'error': 'Parámetro ?q= requerido'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        results = tmdb.search_movies(query, page)
        return Response(results)

    @action(detail=False, methods=['post'])
    def import_tmdb(self, request):
        """POST /api/movies/import_tmdb/  {tmdb_id: 157336}"""
        serializer = MovieImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tmdb_id = serializer.validated_data['tmdb_id']

        # Ya existe?
        existing = Movie.objects.filter(tmdb_id=tmdb_id).first()
        if existing:
            return Response(
                MovieSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        # Fetch de TMDB
        data = tmdb.get_movie_detail(tmdb_id)
        if not data:
            return Response(
                {'error': f'Película {tmdb_id} no encontrada en TMDB'},
                status=status.HTTP_404_NOT_FOUND,
            )

        movie = Movie.objects.create(
            tmdb_id=data['tmdb_id'],
            title=data['title'],
            description=data['description'],
            poster_url=data['poster_url'],
            duration_min=data['duration_min'],
            genre=data['genre'],
            rating=float(data['rating']),
            release_date=data['release_date'] or datetime.now().date(),
            is_now_showing=True,
        )
        return Response(
            MovieSerializer(movie).data,
            status=status.HTTP_201_CREATED,
        )

    # DEPRECATED: old OMDb endpoints kept for backward compatibility
    @action(detail=False, methods=['get'])
    def search_omdb(self, request):
        """DEPRECATED — redirects to search_tmdb"""
        return self.search_tmdb(request)

    @action(detail=False, methods=['post'])
    def import_omdb(self, request):
        """DEPRECATED — redirects to import_tmdb"""
        return self.import_tmdb(request)


class TheaterViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/theaters/ — lista salas"""
    queryset = Theater.objects.all()
    serializer_class = TheaterSerializer


class ShowtimeFilter(django_filters.FilterSet):
    movie_id = django_filters.NumberFilter(field_name='movie_id')
    date = django_filters.DateFilter(field_name='start_time__date')

    class Meta:
        model = Showtime
        fields = ['movie_id', 'date']


class ShowtimeViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/showtimes/ — filtra por ?movie_id=&date="""
    queryset = Showtime.objects.select_related('movie', 'theater').all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = ShowtimeFilter

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
