# Cinema App — Arquitectura

Aplicación web tipo Cinépolis con catálogo de películas, cartelera, salas y reservas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite + Bootstrap 5 |
| Backend | Django 5 + Django REST Framework |
| DB | PostgreSQL 16 |
| Infra | Docker Compose |

## Estructura del proyecto

```
cinema-app/
├── backend/           # Django project
│   ├── cinema/        # App principal
│   │   ├── models.py  # Movie, Theater, Showtime, Booking, Seat
│   │   ├── serializers.py
│   │   ├── views.py   # ViewSets
│   │   └── urls.py
│   ├── config/        # Django settings
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
├── frontend/          # React + Vite + TS
│   ├── src/
│   │   ├── pages/     # Home, MovieDetail, Booking, Cartelera
│   │   ├── components/ # MovieCard, SeatPicker, Navbar
│   │   ├── services/  # API calls
│   │   ├── types/     # TypeScript interfaces
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Modelos de datos

### Movie
- id, title, description, poster_url, duration_min, genre, rating, release_date, is_now_showing

### Theater (Sala)
- id, name, capacity, seat_layout (JSON)

### Showtime (Función/Horario)
- id, movie (FK), theater (FK), start_time, price, language, format (2D/3D/IMAX)

### Booking (Reserva)
- id, showtime (FK), user_email, created_at, status (confirmed/cancelled)

### Seat (Asiento reservado)
- id, booking (FK), seat_label (e.g. "A1", "B5")

## Endpoints API

```
GET    /api/movies/          — Lista películas en cartelera
GET    /api/movies/{id}/      — Detalle de película
GET    /api/theaters/         — Lista salas
GET    /api/showtimes/        — Lista funciones (filtro por movie_id, date)
GET    /api/showtimes/{id}/   — Detalle con asientos ocupados
POST   /api/bookings/         — Crear reserva {showtime_id, user_email, seats[]}
GET    /api/bookings/{email}/ — Ver reservas por email
```

## Rutas del frontend

```
/                   — Home: películas en cartelera
/movie/:id           — Detalle de película + horarios disponibles
/booking/:showtimeId — Selección de asientos + confirmación
/my-bookings         — Buscar reservas por email
```

## Diseño visual

- Tema oscuro (#0a0a0a fondo, #1a1a2e cards, #e94560 acento rojo cine)
- Hero banner con películas destacadas
- Cards con posters, scroll horizontal para cartelera
- Grid de asientos interactivo
- Responsive mobile-first

## Reglas para subagentes

1. **Backend** conoce los modelos de datos. Debe crear modelos, serializers, views, urls, seed data con 3 películas de ejemplo.
2. **Frontend** conoce las rutas y endpoints. Debe consumir la API real, no mock data.
3. **DevOps** conoce ambos. Debe crear Dockerfiles, docker-compose, .env.example y asegurar que backend y frontend se comuniquen.
4. Todos deben usar TypeScript estricto en frontend, type hints en backend.
