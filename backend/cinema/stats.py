"""Admin dashboard statistics endpoint (Django Ninja).

GET /api/stats/dashboard/ — returns all KPIs and chart data.
"""
from datetime import datetime, timedelta

from django.db.models import Sum, Count, Avg, Q
from django.db.models.functions import TruncDate
from ninja import Router
from ninja.errors import HttpError

from core.auth import JWTAuth
from core.permissions import role_required
from cinema.models import Booking, Seat, Showtime, Movie, Theater

stats_router = Router(tags=["stats"])


@stats_router.get("/dashboard", auth=JWTAuth(), url_name="admin_dashboard")
@role_required("admin")
def dashboard_stats(request):
    """Return all dashboard KPIs and chart data."""

    bookings = Booking.objects.filter(status="confirmed")
    seats = Seat.objects.filter(booking__status="confirmed")

    # ── KPIs ────────────────────────────────────────────
    total_sales = bookings.count()
    total_revenue = bookings.aggregate(s=Sum("total"))["s"] or 0
    total_tickets = seats.count()
    total_clients = bookings.values("user_email").distinct().count()
    with_membership = bookings.filter(has_membership=True).count()
    without_membership = bookings.filter(has_membership=False).count()
    total_discounts = bookings.aggregate(s=Sum("discount"))["s"] or 0

    # ── Sales by day (last 30 days) ─────────────────────
    cutoff = datetime.now() - timedelta(days=30)
    sales_by_day_qs = (
        bookings.filter(created_at__gte=cutoff)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"), revenue=Sum("total"))
        .order_by("day")
    )
    sales_by_day = [
        {"date": d["day"].isoformat(), "count": d["count"], "revenue": float(d["revenue"] or 0)}
        for d in sales_by_day_qs
    ]

    # ── Sales by movie ──────────────────────────────────
    sales_by_movie_qs = (
        bookings.values("showtime__movie__title")
        .annotate(count=Count("id"), revenue=Sum("total"))
        .order_by("-count")
    )
    sales_by_movie = [
        {
            "movie": m["showtime__movie__title"],
            "count": m["count"],
            "revenue": float(m["revenue"] or 0),
        }
        for m in sales_by_movie_qs
    ]

    # ── Sales by theater ────────────────────────────────
    sales_by_theater_qs = (
        bookings.values("showtime__theater__name")
        .annotate(count=Count("id"), revenue=Sum("total"))
        .order_by("-count")
    )
    sales_by_theater = [
        {
            "theater": t["showtime__theater__name"],
            "count": t["count"],
            "revenue": float(t["revenue"] or 0),
        }
        for t in sales_by_theater_qs
    ]

    # ── Most / least sold movies ────────────────────────
    most_sold = sales_by_movie[0] if sales_by_movie else None
    least_sold = sales_by_movie[-1] if len(sales_by_movie) > 1 else None

    # ── Top 3 movies ────────────────────────────────────
    top3 = sales_by_movie[:3]

    # ── Most demanded showtime hour ──────────────────────
    peak_hour_qs = (
        bookings.annotate(hour=TruncDate("showtime__start_time"))
        .values("showtime__start_time")
        .annotate(count=Count("id"))
        .order_by("-count")
        .first()
    )

    # ── Theater occupancy ────────────────────────────────
    occupancy = []
    for theater in Theater.objects.all():
        booked_seats = seats.filter(
            booking__showtime__theater=theater
        ).count()
        total_showtimes = Showtime.objects.filter(theater=theater).count()
        if total_showtimes > 0:
            occupancy.append({
                "theater": theater.name,
                "capacity": theater.capacity,
                "booked_seats": booked_seats,
                "total_showtimes": total_showtimes,
                "occupancy_pct": round(
                    (booked_seats / (theater.capacity * total_showtimes)) * 100, 1
                ) if total_showtimes > 0 else 0,
            })

    # ── Average tickets per booking ──────────────────────
    avg_tickets = round(float(seats.count() / total_sales), 1) if total_sales > 0 else 0

    # ── Revenue by movie ─────────────────────────────────
    revenue_by_movie = sorted(sales_by_movie, key=lambda x: x["revenue"], reverse=True)

    return {
        "kpis": {
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "total_tickets": total_tickets,
            "total_clients": total_clients,
            "with_membership": with_membership,
            "without_membership": without_membership,
            "total_discounts": float(total_discounts),
            "avg_tickets_per_booking": avg_tickets,
        },
        "charts": {
            "sales_by_day": sales_by_day,
            "sales_by_movie": sales_by_movie,
            "sales_by_theater": sales_by_theater,
            "top3_movies": top3,
            "most_sold": most_sold,
            "least_sold": least_sold,
            "occupancy": occupancy,
            "revenue_by_movie": revenue_by_movie,
        },
    }
