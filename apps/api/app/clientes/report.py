"""Monthly client report as a PDF, built on request from the portal tables (already RLS-scoped by the caller)."""

import io
from dataclasses import dataclass, field
from datetime import date

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

INK = colors.HexColor("#000209")
NAVY = colors.HexColor("#03144F")
SIGNAL = colors.HexColor("#5A7EF2")
EMBER = colors.HexColor("#FF6B15")
MIST = colors.HexColor("#EAE9E6")
SLATE = colors.HexColor("#3D404B")

MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
STAGE_LABELS = {
    "diagnostico": "Diagnóstico", "diseno": "Diseño", "desarrollo": "Desarrollo",
    "pruebas": "Pruebas", "entrega": "Entrega", "operacion": "En operación",
}

H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=INK)
H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=18, textColor=NAVY, spaceBefore=10, spaceAfter=6)
BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13, textColor=SLATE)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, textColor=SLATE)


@dataclass
class ServiceRow:
    nombre: str
    etapa: str
    avance: int
    disponibilidad: float | None
    metricas: dict[str, tuple[str, float]] = field(default_factory=dict)  # clave -> (etiqueta, total del mes)
    serie: list[tuple[date, float]] = field(default_factory=list)  # main metric, daily


@dataclass
class ReportData:
    cliente: str
    mes: date
    servicios: list[ServiceRow]
    avances: list[tuple[date, str, str]]  # (fecha, servicio, título)
    pagos: list[tuple[date, str, int, str]]  # (fecha, concepto, centavos, moneda)
    pendiente_centavos: int
    membresia_activa: bool


def month_label(d: date) -> str:
    return f"{MONTHS[d.month - 1]} {d.year}"


def _money(cents: int, moneda: str = "MXN") -> str:
    return f"${cents / 100:,.2f} {moneda}"


def _kpis(data: ReportData) -> Table:
    online = [s.disponibilidad for s in data.servicios if s.disponibilidad is not None]
    avg = f"{sum(online) / len(online):.2f} %" if online else "Sin monitor"
    pagado = sum(p[2] for p in data.pagos)
    cells = [
        [str(len(data.servicios)), avg, _money(pagado), _money(data.pendiente_centavos)],
        ["servicios", "disponibilidad", "pagado en el mes", "pendiente"],
    ]
    t = Table(cells, colWidths=[44 * mm] * 4)
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 15),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONT", (0, 1), (-1, 1), "Helvetica", 8),
        ("TEXTCOLOR", (0, 1), (-1, 1), SLATE),
        ("BACKGROUND", (0, 0), (-1, -1), MIST),
        ("LINEAFTER", (0, 0), (-2, -1), 2, colors.white),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def _bars(serie: list[tuple[date, float]], titulo: str) -> Drawing:
    d = Drawing(170 * mm, 52 * mm)
    chart = VerticalBarChart()
    chart.x, chart.y, chart.width, chart.height = 8 * mm, 8 * mm, 158 * mm, 36 * mm
    chart.data = [[v for _, v in serie]]
    chart.categoryAxis.categoryNames = [str(day.day) if i % 5 == 0 else "" for i, (day, _) in enumerate(serie)]
    chart.categoryAxis.labels.fontSize = 6
    chart.valueAxis.labels.fontSize = 6
    chart.valueAxis.valueMin = 0
    chart.bars[0].fillColor = SIGNAL
    chart.bars[0].strokeColor = None
    chart.categoryAxis.strokeColor = MIST
    chart.valueAxis.strokeColor = MIST
    d.add(chart)
    d.add(String(8 * mm, 48 * mm, titulo, fontName="Helvetica-Bold", fontSize=8, fillColor=SLATE))
    return d


def _table(rows: list[list[str]], widths: list[float]) -> Table:
    t = Table(rows, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 8.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, NAVY),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, MIST),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def build_pdf(data: ReportData) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"Reporte CODEX {month_label(data.mes)}", author="CODEX AI Consulting",
    )
    story = [
        Paragraph("CODEX", ParagraphStyle("brand", parent=H2, textColor=EMBER, spaceBefore=0)),
        Paragraph(f"Reporte de {month_label(data.mes)}", H1),
        Paragraph(data.cliente, BODY),
        Spacer(1, 8 * mm),
        _kpis(data),
        Spacer(1, 4 * mm),
    ]

    story.append(Paragraph("Servicios", H2))
    if data.servicios:
        rows = [["Servicio", "Etapa", "Avance", "Disponibilidad 30 d"]]
        for s in data.servicios:
            disp = f"{s.disponibilidad:.2f} %" if s.disponibilidad is not None else "—"
            rows.append([s.nombre, STAGE_LABELS.get(s.etapa, s.etapa), f"{s.avance} %", disp])
        story.append(_table(rows, [70 * mm, 35 * mm, 25 * mm, 44 * mm]))
        for s in data.servicios:
            if s.serie and any(v for _, v in s.serie):
                etiqueta = next(iter(s.metricas.values()))[0] if s.metricas else "Actividad diaria"
                story += [Spacer(1, 4 * mm), _bars(s.serie, f"{s.nombre}: {etiqueta.lower()} por día")]
            if s.metricas:
                story.append(Paragraph(
                    "  ".join(f"<b>{lbl}</b> {total:,.0f}" for lbl, total in s.metricas.values()), SMALL
                ))
    else:
        story.append(Paragraph("Aún no hay servicios publicados.", BODY))

    story.append(Paragraph("Avances publicados", H2))
    if data.avances:
        rows = [["Fecha", "Servicio", "Avance"]] + [[f.strftime("%d/%m"), s, Paragraph(t, BODY)] for f, s, t in data.avances]
        story.append(_table(rows, [20 * mm, 50 * mm, 104 * mm]))
    else:
        story.append(Paragraph("Sin avances publicados este mes.", BODY))

    story.append(Paragraph("Pagos", H2))
    if data.pagos:
        rows = [["Fecha", "Concepto", "Monto"]] + [[f.strftime("%d/%m"), c, _money(m, mon)] for f, c, m, mon in data.pagos]
        story.append(_table(rows, [20 * mm, 110 * mm, 44 * mm]))
    else:
        story.append(Paragraph("Sin pagos registrados este mes.", BODY))

    story += [
        Spacer(1, 10 * mm),
        Paragraph(
            "Miembro CODEX+: tu asesoría semanal está incluida." if data.membresia_activa
            else "Con CODEX+ ($499 MXN al mes) tienes asesoría semanal, orientación tecnológica y cotizaciones sin costo.",
            SMALL,
        ),
    ]
    doc.build(story)
    return buf.getvalue()
