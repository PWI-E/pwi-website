from io import BytesIO

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color


SOURCE = "/Users/francisong/Desktop/files/starlink_system_tabloid.pdf"
OUTPUT = "output/pdf/starlink_system_tabloid_revised.pdf"
ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

pdfmetrics.registerFont(TTFont("ArialCustom", ARIAL))
pdfmetrics.registerFont(TTFont("ArialCustomBold", ARIAL_BOLD))


def stacked_sigma(c, x, baseline, label, color):
    """Draw the sketch's shorthand: sigma followed by 1 above 253."""
    c.setFillColor(color)
    c.setFont("ArialCustomBold", 14.6)
    label_width = pdfmetrics.stringWidth(label, "ArialCustomBold", 14.6)
    sigma_width = pdfmetrics.stringWidth("Σ", "ArialCustomBold", 20)
    total_width = label_width + 8 + sigma_width + 18
    start = x - total_width / 2
    c.drawString(start, baseline, label)
    sx = start + label_width + 8
    c.setFont("ArialCustomBold", 20)
    c.drawString(sx, baseline - 2, "Σ")
    c.setFont("ArialCustom", 7)
    index_x = sx + sigma_width + 1.5
    c.drawString(index_x, baseline + 8.5, "1")
    c.drawString(index_x, baseline - 3.5, "253")


reader = PdfReader(SOURCE)
page = reader.pages[0]
width = float(page.mediabox.width)
height = float(page.mediabox.height)

packet = BytesIO()
c = canvas.Canvas(packet, pagesize=(width, height))

# Replace both literal ranges with the compact stacked-sigma notation.
sensor_fill = Color(0.933333, 0.929412, 0.996078)
sensor_text = Color(0.235294, 0.203922, 0.537255)
c.setFillColor(sensor_fill)
c.rect(151, 595, 132, 28, fill=1, stroke=0)
stacked_sigma(c, 217, 602.5, "Sensors", sensor_text)

observer_fill = Color(0.980392, 0.92549, 0.905882)
observer_text = Color(0.443137, 0.168627, 0.07451)
c.setFillColor(observer_fill)
c.rect(830, 584, 146, 30, fill=1, stroke=0)
stacked_sigma(c, 903, 591.5, "Observer", observer_text)

# Match the sketch's label above the Starlink box.
c.setFillColor(Color(1, 1, 1))
c.rect(540, 578, 112, 25, fill=1, stroke=0)
c.setFillColor(Color(0.239216, 0.239216, 0.227451))
c.setFont("ArialCustom", 10.65)
c.drawString(548, 588.5, "Sat network 1")

# Continue each antenna mast through the triangular antenna head.
scale = 1.33047617
x_shift = 51.9428419
antenna_color = Color(0.239216, 0.239216, 0.227451)
c.setStrokeColor(antenna_color)
c.setLineWidth(1.1 * scale)
for x, y0, y1 in [
    (315, 438.2756, 449.2756),
    (360, 438.2756, 449.2756),
    (301, 216.2756, 227.2756),
    (584, 482.9756, 492.8756),
]:
    c.line(x * scale + x_shift, y0 * scale, x * scale + x_shift, y1 * scale)

c.save()
packet.seek(0)
overlay = PdfReader(packet)
page.merge_page(overlay.pages[0])

writer = PdfWriter()
writer.add_page(page)
with open(OUTPUT, "wb") as f:
    writer.write(f)
