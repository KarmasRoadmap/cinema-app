from django.db import models


class Movie(models.Model):
    """Película en cartelera."""
    imdb_id = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    poster_url = models.URLField(max_length=500)
    duration_min = models.IntegerField()
    genre = models.CharField(max_length=100)
    rating = models.FloatField()
    release_date = models.DateField()
    is_now_showing = models.BooleanField(default=True)

    class Meta:
        ordering = ['-release_date']

    def __str__(self):
        return self.title


class Theater(models.Model):
    """Sala de cine."""
    name = models.CharField(max_length=100)
    capacity = models.IntegerField()
    seat_layout = models.JSONField(default=dict)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Showtime(models.Model):
    """Función / horario de una película en una sala."""
    FORMAT_CHOICES = [
        ('2D', '2D'),
        ('3D', '3D'),
        ('IMAX', 'IMAX'),
    ]

    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='showtimes')
    theater = models.ForeignKey(Theater, on_delete=models.CASCADE, related_name='showtimes')
    start_time = models.DateTimeField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    language = models.CharField(max_length=10, default='ES')
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='2D')

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f'{self.movie.title} — {self.theater.name} — {self.start_time}'


class Booking(models.Model):
    """Reserva de asientos para una función."""
    STATUS_CHOICES = [
        ('confirmed', 'Confirmada'),
        ('cancelled', 'Cancelada'),
    ]

    showtime = models.ForeignKey(Showtime, on_delete=models.CASCADE, related_name='bookings')
    user_email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user_email} — {self.showtime}'


class Seat(models.Model):
    """Asiento reservado dentro de un booking."""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='seats')
    seat_label = models.CharField(max_length=10)

    class Meta:
        ordering = ['seat_label']

    def __str__(self):
        return f'{self.seat_label} — {self.booking}'
