from rest_framework import serializers
from .models import Movie, Theater, Showtime, Booking, Seat


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['id', 'seat_label', 'qr_code']


class BookingListSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)
    movie_title = serializers.CharField(source='showtime.movie.title', read_only=True)
    theater_name = serializers.CharField(source='showtime.theater.name', read_only=True)
    start_time = serializers.DateTimeField(source='showtime.start_time', read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'showtime', 'movie_title', 'theater_name', 'start_time',
                  'user_email', 'status', 'total', 'discount', 'has_membership',
                  'created_at', 'seats']


class BookingCreateSerializer(serializers.ModelSerializer):
    seats = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        write_only=True,
    )
    has_membership = serializers.BooleanField(default=False)

    # ── Payment fields (write-only, not stored) ──────────
    card_holder = serializers.CharField(write_only=True, max_length=100)
    card_number = serializers.CharField(write_only=True, max_length=19)
    card_expiry = serializers.CharField(write_only=True, max_length=5)
    card_cvv = serializers.CharField(write_only=True, max_length=4)
    use_saved_card = serializers.BooleanField(default=False)
    saved_card_last4 = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = Booking
        fields = [
            'id', 'showtime', 'user_email', 'seats', 'has_membership',
            'card_holder', 'card_number', 'card_expiry', 'card_cvv',
            'use_saved_card', 'saved_card_last4',
            'status', 'created_at',
        ]
        read_only_fields = ['status', 'created_at']

    # ── Seat validation ──────────────────────────────────
    def validate_seats(self, value):
        if not value:
            raise serializers.ValidationError('Debe seleccionar al menos un asiento.')
        if len(value) > 10:
            raise serializers.ValidationError('Máximo 10 boletos por compra.')

        seat_labels = []
        for item in value:
            label = item.get('seat_label', '')
            if not label:
                raise serializers.ValidationError('Cada asiento debe tener seat_label.')
            seat_labels.append(label)
        return seat_labels

    # ── Card validation ──────────────────────────────────
    def validate_card_number(self, value):
        if not value:
            return ""  # Optional when using saved card
        digits = ''.join(filter(str.isdigit, value))
        if len(digits) != 16:
            raise serializers.ValidationError('El número de tarjeta debe tener 16 dígitos.')
        return digits[-4:]

    def validate_card_expiry(self, value):
        if not value:
            return ""
        import re
        if not re.match(r'^\d{2}/\d{2}$', value):
            raise serializers.ValidationError('Formato: MM/AA')
        return value

    def validate_card_cvv(self, value):
        if not value.isdigit() or len(value) not in (3, 4):
            raise serializers.ValidationError('CVV inválido (3-4 dígitos).')
        return value

    # ── Full validation ──────────────────────────────────
    def validate(self, data):
        showtime = data['showtime']
        seat_labels = data['seats']

        # Check occupied seats
        occupied = Seat.objects.filter(
            booking__showtime=showtime,
            booking__status='confirmed',
            seat_label__in=seat_labels,
        ).values_list('seat_label', flat=True)

        if occupied:
            raise serializers.ValidationError({
                'seats': f'Asientos ocupados: {", ".join(occupied)}'
            })

        # Check capacity
        if showtime.theater.capacity < len(seat_labels):
            raise serializers.ValidationError({
                'seats': f'La sala solo tiene {showtime.theater.capacity} asientos.'
            })

        return data

    # ── Create booking with discount + QR ────────────────
    def create(self, validated_data):
        # Strip write-only fields
        seat_labels = validated_data.pop('seats')
        has_membership = validated_data.pop('has_membership', False)
        validated_data.pop('card_holder', None)
        validated_data.pop('card_number', None)
        validated_data.pop('card_expiry', None)
        validated_data.pop('card_cvv', None)
        validated_data.pop('use_saved_card', None)
        validated_data.pop('saved_card_last4', None)

        showtime = validated_data['showtime']
        seat_count = len(seat_labels)
        unit_price = float(showtime.price)
        subtotal = unit_price * seat_count
        discount = subtotal * 0.20 if has_membership else 0
        total = subtotal - discount

        booking = Booking.objects.create(
            total=total,
            discount=discount,
            has_membership=has_membership,
            **validated_data,
        )

        # Generate QR codes per seat
        for label in seat_labels:
            qr_data = _generate_qr_svg(booking.id, label)
            Seat.objects.create(
                booking=booking,
                seat_label=label,
                qr_code=qr_data,
            )

        return booking


# ── QR code helper ──────────────────────────────────────────

def _generate_qr_svg(booking_id: int, seat_label: str) -> str:
    """Generate a base64-encoded SVG QR code for a ticket."""
    import base64
    import io

    try:
        import qrcode
        import qrcode.image.svg

        data = f"CINEMA|BK{booking_id}|{seat_label}"
        factory = qrcode.image.svg.SvgPathImage
        img = qrcode.make(data, image_factory=factory)
        buf = io.BytesIO()
        img.save(buf)
        return base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        # Fallback: return data as plain text (QR will show on frontend)
        return f"CINEMA|BK{booking_id}|{seat_label}"


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
        return list(
            Seat.objects.filter(
                booking__showtime=obj,
                booking__status='confirmed',
            ).values_list('seat_label', flat=True)
        )


class MovieDetailSerializer(serializers.ModelSerializer):
    showtimes = ShowtimeSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = ['id', 'imdb_id', 'tmdb_id', 'title', 'description', 'poster_url', 'duration_min',
                  'genre', 'rating', 'release_date', 'is_now_showing', 'showtimes']


class TheaterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Theater
        fields = ['id', 'name', 'capacity', 'seat_layout']


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = ['id', 'imdb_id', 'tmdb_id', 'title', 'description', 'poster_url', 'duration_min',
                  'genre', 'rating', 'release_date', 'is_now_showing']


class MovieImportSerializer(serializers.Serializer):
    tmdb_id = serializers.IntegerField()
