"""
Comando para poblar la BD con películas reales desde TMDB.
Uso: python manage.py seed_data
"""
import sys
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from cinema.models import Movie, Theater, Showtime
from cinema import tmdb


class Command(BaseCommand):
    help = "Puebla la BD con películas reales de TMDB y datos de prueba."

    def handle(self, *args, **options):
        self.stdout.write("🎬 Importando películas desde TMDB...")

        # ── Importar películas en cartelera ─────────────────────────────
        now_playing = tmdb.get_now_playing()

        # Enriquecer con detalle completo (runtime, genre)
        movies_data = []
        for item in now_playing[:12]:
            detail = tmdb.get_movie_detail(item['tmdb_id'])
            if detail:
                movies_data.append(detail)
            else:
                movies_data.append(item)

        if not movies_data:
            self.stdout.write(self.style.ERROR("No se pudo importar ninguna película. ¿TMDB_API_KEY configurada?"))
            sys.exit(1)

        created_movies = []
        for data in movies_data:
            movie, created = Movie.objects.update_or_create(
                tmdb_id=data['tmdb_id'],
                defaults={
                    'title': data['title'],
                    'description': data['description'],
                    'poster_url': data['poster_url'],
                    'duration_min': data['duration_min'],
                    'genre': data['genre'],
                    'rating': float(data['rating']),
                    'release_date': data['release_date'] or datetime.now().date(),
                    'is_now_showing': True,
                },
            )
            action = "✅" if created else "♻️"
            self.stdout.write(f"  {action} {data['title']} ({data['year']}) — ⭐ {data['rating']}")
            created_movies.append(movie)

        # ── Crear salas si no existen ────────────────────────────────
        theaters = []
        for name, capacity, rows, cols in [
            ("Sala 1 — Digital", 100, 10, 10),
            ("Sala 2 — Premium", 80, 8, 10),
        ]:
            theater, _ = Theater.objects.update_or_create(
                name=name,
                defaults={
                    'capacity': capacity,
                    'seat_layout': {'rows': rows, 'cols': cols},
                },
            )
            theaters.append(theater)
            self.stdout.write(f"  🏢 {theater.name} ({theater.capacity} asientos)")

        # ── Crear horarios ────────────────────────────────────────────
        today = datetime.now().date()
        showtimes_created = 0

        for i, movie in enumerate(created_movies[:8]):
            theater = theaters[i % len(theaters)]
            for day_offset in range(3):
                show_date = today + timedelta(days=day_offset)
                for hour in (15, 19, 21):
                    start = datetime.combine(show_date, datetime.min.time().replace(hour=hour))
                    if show_date == today and start <= datetime.now():
                        continue  # Skip past showtimes today

                    _, created = Showtime.objects.get_or_create(
                        movie=movie,
                        theater=theater,
                        start_time=start,
                        defaults={
                            'price': 85.00 if theater.name.endswith("Premium") else 65.00,
                            'language': 'ES',
                            'format': 'IMAX' if i < 3 and day_offset == 0 else '2D',
                        },
                    )
                    if created:
                        showtimes_created += 1

        self.stdout.write(f"\n  🕐 {showtimes_created} horarios creados")
        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 Listo! {len(created_movies)} películas reales, {len(theaters)} salas, {showtimes_created} funciones.\n"
            f"   Frontend: http://localhost:5173\n"
            f"   API:      http://localhost:8000/api/movies/"
        ))

        # ── Create initial admin user ──────────────────────────────────
        from users.models import User

        admin_email = "admin@cinema.com"
        admin_password = "admin123"

        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                email=admin_email,
                password=admin_password,
                name="Admin",
                role="admin",
            )
            self.stdout.write(self.style.SUCCESS(
                f"\n👤 Admin user created:\n"
                f"   Email:    {admin_email}\n"
                f"   Password: {admin_password}"
            ))
        else:
            self.stdout.write(f"\n👤 Admin user already exists: {admin_email}")
