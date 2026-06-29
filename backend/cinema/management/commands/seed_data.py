"""
Management command to seed initial data for Cinema App.
Run with: python manage.py seed_data
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from cinema.models import Movie, Theater, Showtime


class Command(BaseCommand):
    help = 'Carga datos iniciales: películas, salas y horarios de ejemplo.'

    def handle(self, *args, **options):
        self.stdout.write('Sembrando datos iniciales...')

        # ── Salas ────────────────────────────────────────────
        theaters_data = [
            {
                'name': 'Sala 1',
                'capacity': 100,
                'seat_layout': {
                    'rows': 10,
                    'columns': 10,
                    'labels': [chr(65 + r) for r in range(10)],  # A-J
                },
            },
            {
                'name': 'Sala 2',
                'capacity': 80,
                'seat_layout': {
                    'rows': 8,
                    'columns': 10,
                    'labels': [chr(65 + r) for r in range(8)],  # A-H
                },
            },
        ]

        theaters = {}
        for tdata in theaters_data:
            theater, created = Theater.objects.get_or_create(
                name=tdata['name'],
                defaults={
                    'capacity': tdata['capacity'],
                    'seat_layout': tdata['seat_layout'],
                },
            )
            theaters[tdata['name']] = theater
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Sala creada: {theater.name}'))
            else:
                self.stdout.write(f'  ⓘ Sala ya existe: {theater.name}')

        # ── Películas ────────────────────────────────────────
        movies_data = [
            {
                'title': 'Interstellar',
                'description': 'Un grupo de exploradores espaciales viaja a través de un agujero de gusano en un intento de asegurar la supervivencia de la humanidad. Dirigida por Christopher Nolan, esta épica de ciencia ficción combina física teórica con drama humano en una odisea interestelar.',
                'poster_url': 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                'duration_min': 169,
                'genre': 'Ciencia ficción',
                'rating': 9.0,
                'release_date': date(2014, 11, 7),
                'is_now_showing': True,
            },
            {
                'title': 'Inception',
                'description': 'Dom Cobb es un ladrón especializado en el arte de la extracción: robar secretos valiosos del subconsciente durante el sueño. Su última misión podría redimirlo, pero requiere lo imposible: implantar una idea en lugar de robarla.',
                'poster_url': 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
                'duration_min': 148,
                'genre': 'Acción',
                'rating': 8.8,
                'release_date': date(2010, 7, 16),
                'is_now_showing': True,
            },
            {
                'title': 'El Padrino',
                'description': 'La historia de la familia Corleone, una de las más poderosas familias de la mafia en Nueva York. Don Vito Corleone debe ceder el control de su imperio a su hijo Michael, quien se ve arrastrado al mundo del crimen organizado.',
                'poster_url': 'https://image.tmdb.org/t/p/w500/fhjDlj5pY3LqE4fLzM7gGYjHRwr.jpg',
                'duration_min': 175,
                'genre': 'Drama',
                'rating': 9.2,
                'release_date': date(1972, 3, 24),
                'is_now_showing': True,
            },
        ]

        movies = {}
        for mdata in movies_data:
            movie, created = Movie.objects.get_or_create(
                title=mdata['title'],
                defaults=mdata,
            )
            if not created:
                # Actualizar campos por si cambiaron
                for k, v in mdata.items():
                    setattr(movie, k, v)
                movie.save()
                self.stdout.write(f'  ⓘ Película actualizada: {movie.title}')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Película creada: {movie.title}'))
            movies[mdata['title']] = movie

        # ── Horarios ─────────────────────────────────────────
        # Usamos fechas futuras relativas a hoy para que siempre estén vigentes
        today = timezone.now().date()
        # Buscar el próximo viernes como referencia
        days_until_friday = (4 - today.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7  # Si hoy es viernes, usar el siguiente
        next_friday = today + timedelta(days=days_until_friday)
        next_saturday = next_friday + timedelta(days=1)

        showtimes_data = [
            # Interstellar — Sala 1
            {
                'movie': movies['Interstellar'],
                'theater': theaters['Sala 1'],
                'start_time': datetime.combine(next_friday, datetime.strptime('16:00', '%H:%M').time()),
                'price': Decimal('120.00'),
                'language': 'ES',
                'format': 'IMAX',
            },
            # Interstellar — Sala 2
            {
                'movie': movies['Interstellar'],
                'theater': theaters['Sala 2'],
                'start_time': datetime.combine(next_friday, datetime.strptime('20:00', '%H:%M').time()),
                'price': Decimal('100.00'),
                'language': 'EN',
                'format': '2D',
            },
            # Inception — Sala 1
            {
                'movie': movies['Inception'],
                'theater': theaters['Sala 1'],
                'start_time': datetime.combine(next_saturday, datetime.strptime('14:00', '%H:%M').time()),
                'price': Decimal('110.00'),
                'language': 'ES',
                'format': '3D',
            },
            # Inception — Sala 2
            {
                'movie': movies['Inception'],
                'theater': theaters['Sala 2'],
                'start_time': datetime.combine(next_saturday, datetime.strptime('18:30', '%H:%M').time()),
                'price': Decimal('90.00'),
                'language': 'ES',
                'format': '2D',
            },
        ]

        tz = timezone.get_current_timezone()
        for sdata in showtimes_data:
            # Hacer el datetime timezone-aware
            naive_dt = sdata['start_time']
            aware_dt = timezone.make_aware(naive_dt, tz)
            exists = Showtime.objects.filter(
                movie=sdata['movie'],
                theater=sdata['theater'],
                start_time=aware_dt,
            ).exists()
            if not exists:
                sdata['start_time'] = aware_dt
                showtime = Showtime.objects.create(**sdata)
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ Horario creado: {showtime}'
                ))
            else:
                self.stdout.write(f'  ⓘ Horario ya existe: {sdata["movie"].title} en {sdata["theater"].name}')

        self.stdout.write(self.style.SUCCESS('\n✅ Datos iniciales cargados correctamente.'))
