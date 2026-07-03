"""PDF generation endpoints — ticket download and admin reports."""
import io
from datetime import datetime

from django.http import HttpResponse, FileResponse
from ninja import Router
from ninja.errors import HttpError
import tempfile, os

from core.auth import JWTAuth
from core.permissions import role_required
from cinema.models import Booking

pdf_router = Router(tags=["pdf"])


# ── Ticket PDF download ────────────────────────────────────

@pdf_router.get("/ticket/{booking_id}", auth=JWTAuth(), url_name="ticket_pdf")
def ticket_pdf(request, booking_id: int):
    """GET /api/pdf/ticket/{booking_id} — download ticket as PDF."""
    try:
        booking = Booking.objects.select_related(
            "showtime__movie", "showtime__theater"
        ).prefetch_related("seats").get(pk=booking_id)
    except Booking.DoesNotExist:
        raise HttpError(404, "Booking not found")

    # Anyone can download their own ticket (same email) or admin
    if request.user.role != "admin" and request.user.email != booking.user_email:
        raise HttpError(403, "Not authorized")

    try:
        buffer = _build_ticket_pdf(booking)
    except Exception as e:
        raise HttpError(500, f"PDF generation failed: {str(e)}")

    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="ticket-{booking.id}.pdf"'
    )
    response["Content-Length"] = len(buffer.getvalue())
    return response


# ── Admin report PDFs ───────────────────────────────────────

@pdf_router.get("/report/sales", auth=JWTAuth(), url_name="report_sales")
@role_required("admin")
def report_sales_pdf(request):
    """Download sales report PDF."""
    bookings = Booking.objects.filter(status="confirmed").select_related(
        "showtime__movie", "showtime__theater"
    ).prefetch_related("seats").order_by("-created_at")

    buffer = _build_report_pdf("Reporte de Ventas", bookings)
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="reporte-ventas.pdf"'
    return response


@pdf_router.get("/report/movies", auth=JWTAuth(), url_name="report_movies")
@role_required("admin")
def report_movies_pdf(request):
    """Download movie sales report PDF."""
    from django.db.models import Sum, Count
    from cinema.models import Booking as B

    data = (
        B.objects.filter(status="confirmed")
        .values("showtime__movie__title")
        .annotate(total=Sum("total"), tickets=Count("id"))
        .order_by("-total")
    )

    buffer = _build_movies_report_pdf(data)
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="reporte-peliculas.pdf"'
    return response


# ── PDF builders ────────────────────────────────────────────

def _build_ticket_pdf(booking) -> io.BytesIO:
    """Build a single ticket PDF with QR codes."""
    from reportlab.lib.pagesizes import A5
    from reportlab.lib.units import mm, cm
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics import renderPDF

    buf = io.BytesIO()
    w, h = A5  # 148 x 210 mm
    c = canvas.Canvas(buf, pagesize=A5)
    c.setTitle(f"Boleto #{booking.id}")

    # Dark background header
    c.setFillColor(colors.HexColor("#1a1a2e"))
    c.rect(0, h - 60, w, 60, fill=1, stroke=0)

    # Cinema logo
    c.setFillColor(colors.HexColor("#e94560"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(15 * mm, h - 40, "CINEMA")

    # Booking title
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 10)
    c.drawString(15 * mm, h - 55, f"Boleto #{booking.id}")

    # Movie info
    y = h - 85
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(15 * mm, y, booking.showtime.movie.title)

    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(15 * mm, y, f"Sala: {booking.showtime.theater.name}")
    y -= 14
    c.drawString(15 * mm, y, f"Fecha: {booking.showtime.start_time.strftime('%d/%m/%Y %H:%M')}")
    y -= 14
    c.drawString(15 * mm, y, f"Formato: {booking.showtime.format}  |  Idioma: {booking.showtime.language}")

    # Seats
    y -= 20
    c.setFont("Helvetica-Bold", 11)
    c.drawString(15 * mm, y, "Asientos:")
    y -= 14
    c.setFont("Helvetica", 10)
    seat_list = ", ".join(s.seat_label for s in booking.seats.all())
    c.drawString(15 * mm, y, seat_list)

    # Price info
    y -= 25
    c.setFont("Helvetica", 10)
    c.drawString(15 * mm, y, f"Cantidad: {booking.seats.count()} boleto(s)")
    y -= 14
    if booking.discount > 0:
        c.drawString(15 * mm, y, f"Descuento (membresía): -${float(booking.discount):.2f}")
        y -= 14
    c.setFont("Helvetica-Bold", 12)
    c.drawString(15 * mm, y, f"Total: ${float(booking.total):.2f}")

    # QR codes
    y = 50
    x = 15 * mm
    qr_size = 28 * mm
    for seat in booking.seats.all():
        if x + qr_size > w:
            x = 15 * mm
            y -= qr_size + 5 * mm

        try:
            # Generate fresh QR PNG from booking data
            import qrcode as qrlib
            from io import BytesIO

            qr_data = f"UPAPOLIS|BK{booking.id}|{seat.seat_label}"
            qr_img = qrlib.make(qr_data, box_size=4, border=2)
            qr_buf = BytesIO()
            qr_img.save(qr_buf, format="PNG")
            qr_buf.seek(0)
            c.drawImage(qr_buf, x, y, qr_size, qr_size)
        except Exception as e:
            # Fallback: draw a placeholder rectangle
            c.setStrokeColor(colors.grey)
            c.setFillColor(colors.HexColor("#f0f0f0"))
            c.rect(x, y, qr_size, qr_size, fill=1, stroke=1)
            c.setFillColor(colors.grey)
            c.setFont("Helvetica", 6)
            c.drawCentredString(x + qr_size / 2, y + qr_size / 2 - 3, "QR ERROR")

        # Seat label below QR
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.black)
        c.drawCentredString(x + qr_size / 2, y - 5, seat.seat_label)
        x += qr_size + 5 * mm

    # Footer
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.grey)
    c.drawCentredString(w / 2, 10, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}")

    c.save()
    buf.seek(0)
    return buf


def _build_report_pdf(title: str, bookings) -> io.BytesIO:
    """Build a sales report PDF."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    elements = []
    elements.append(Paragraph(title, styles["Title"]))
    elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 10 * mm))

    # Table
    data = [["#", "Película", "Sala", "Cliente", "Asientos", "Total", "Fecha"]]
    for i, b in enumerate(bookings[:100], 1):  # limit to 100 rows
        seats = ", ".join(s.seat_label for s in b.seats.all())
        data.append([
            str(b.id),
            b.showtime.movie.title[:30],
            b.showtime.theater.name[:20],
            b.user_email[:25],
            seats[:20],
            f"${float(b.total):.2f}",
            b.created_at.strftime("%d/%m/%y"),
        ])

    table = Table(data, colWidths=[25, 100, 70, 80, 60, 50, 55])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf


def _build_movies_report_pdf(data) -> io.BytesIO:
    """Build a movie sales report PDF."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    elements = []
    elements.append(Paragraph("Reporte por Película", styles["Title"]))
    elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 10 * mm))

    table_data = [["Película", "Boletos Vendidos", "Ingresos"]]
    for row in data:
        table_data.append([
            row["showtime__movie__title"][:40],
            str(row["tickets"]),
            f"${float(row['total']):.2f}",
        ])

    table = Table(table_data, colWidths=[250, 100, 100])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf
