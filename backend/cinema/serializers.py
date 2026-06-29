from rest_framework import serializers
from .models import Movie, Theater, Showtime, Booking, Seat


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['id', 'seat_label']


class BookingListSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)
    movie_title = serializers.CharField(source='showtime.movie.title', read_only=True)
    theater_name = serializers.CharField(source='showtime.theater.name', read_only=True)
    start_time = serializers.DateTimeField(source='showtime.start_time', read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'showtime', 'movie_title', 'theater_name', 'start_time',
                  'user_email', 'status', 'created_at', 'seats']


class BookingCreateSerializer(serializers.ModelSerializer):
    seats = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        write_only=True,
    )

    class Meta:
        model = Booking
        fields = ['id', 'showtime', 'user_email', 'seats', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

    def validate_seats(self, value):
        """Valida que venga al menos un asiento y extrae seat_label de cada dict."""
        if not value:
            raise serializers.ValidationError('Debe seleccionar al menos un asiento.')
        seat_labels = []
        for item in value:
            label = item.get('seat_label', '')
            if not label:
                raise serializers.ValidationError('Cada asiento debe tener seat_label.')
            seat_labels.append(label)
        return seat_labels

    def validate(self, data):
        """Valida que los asientos no estén ya ocupados para este showtime."""
        showtime = data['showtime']
        seat_labels = data['seats']

        # Buscar asientos ya reservados (bookings confirmados) en este showtime
        occupied = Seat.objects.filter(
            booking__showtime=showtime,
            booking__status='confirmed',
            seat_label__in=seat_labels,
        ).values_list('seat_label', flat=True)

        if occupied:
            occupied_list = list(occupied)
            raise serializers.ValidationError({
                'seats': f'Los siguientes asientos ya están ocupados: {", ".join(occupied_list)}'
            })

        return data

    def create(self, validated_data):
        seat_labels = validated_data.pop('seats')
        booking = Booking.objects.create(**validated_data)
        for label in seat_labels:
            Seat.objects.create(booking=booking, seat_label=label)
        return booking


class ShowtimeSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    theater_name = serializers.CharField(source='theater.name', read_only=True)
    theater_capacity = serializers.IntegerField(source='theater.capacity', read_only=True)

    class Meta:
        model = Showtime
        fields = ['id', 'movie', 'movie_title', 'theater', 'theater_name',
                  'theater_capacity', 'start_time', 'price', 'language', 'format']


class ShowtimeDetailSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    theater_name = serializers.CharField(source='theater.name', read_only=True)
    theater_capacity = serializers.IntegerField(source='theater.capacity', read_only=True)
    seat_layout = serializers.JSONField(source='theater.seat_layout', read_only=True)
    occupied_seats = serializers.SerializerMethodField()

    class Meta:
        model = Showtime
        fields = ['id', 'movie', 'movie_title', 'theater', 'theater_name',
                  'theater_capacity', 'seat_layout', 'start_time', 'price',
                  'language', 'format', 'occupied_seats']

    def get_occupied_seats(self, obj):
        """Devuelve la lista de seat_labels ocupados para este showtime."""
        return list(
            Seat.objects.filter(
                booking__showtime=obj,
                booking__status='confirmed',
            ).values_list('seat_label', flat=True)
        )


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = ['id', 'title', 'description', 'poster_url', 'duration_min',
                  'genre', 'rating', 'release_date', 'is_now_showing']


class MovieDetailSerializer(serializers.ModelSerializer):
    showtimes = ShowtimeSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = ['id', 'title', 'description', 'poster_url', 'duration_min',
                  'genre', 'rating', 'release_date', 'is_now_showing', 'showtimes']


class TheaterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theater
        fields = ['id', 'name', 'capacity', 'seat_layout']
