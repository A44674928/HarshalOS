#!/usr/bin/env python3
"""
OUTPOST ONE (Frontiership) — HQ operating pro forma XLSX
APN 30055004 · 62 beds (57 monetized + 5 owner) · $4,800/mo · SF-bundle parity
Mirrors style of generate_proforma_xlsx.py; feeds SAFETY_FIRST_HQ_MEDICAL.md §2 cap math.
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# Colors (same family as lodge pro forma)
INK, GOLD, GREEN, RED, BLUE, PANEL, MUTE = "0A0E14", "E8C547", "3DCC6A", "E4453A", "4D8DFF", "161D28", "8B95A8"
WHITE, STRIPE = "E8EDF5", "F2F4F8"

thin = Side(style="thin", color="1E2A3A")
border_all = Border(left=thin, right=thin, top=thin, bottom=thin)

def style_header(ws, row, cols, fill=GOLD, font_color=INK, font_size=10, bold=True):
    f = PatternFill(start_color=fill, end_color=fill, fill_type="solid")
    for c in range(1, cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = f
        cell.font = Font(name="Calibri", size=font_size, bold=bold, color=font_color)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 26

def money(cell):
    cell.number_format = '"$"#,##0'

def pct(cell, fmt="0.0%"):
    cell.number_format = fmt

def title_row(ws, text, cols):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=cols)
    c = ws.cell(row=1, column=1, value=text)
    c.font = Font(name="Calibri", size=12, bold=True, color=WHITE)
    c.fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30
    for col in range(2, cols + 1):
        ws.cell(row=1, column=col).fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")

# ===================== INPUTS =====================
BEDS_MON, BEDS_OWN = 57, 5
RATE = 4800
OCC_SS = 0.88                      # steady-state (sponsor leases)
BARN = 400 * 12 * 2                # 2 stalls @ $400/mo
BURDEN = 0.25
CAPEX_LO, CAPEX_MID, CAPEX_HI = 19_000_000, 21_500_000, 24_000_000
RAMP = [0.0, 0.70, 0.82, 0.88, 0.88]   # Y1..Y5 avg occupancy
Y1_CARRY = 160_000                     # pre-opening: partial staff, insurance, road, launch
Y2_OPEX_FACTOR = 0.88                  # ramp staffing/food/program with lease-up

# --- Staffing build (steady-state) ---
STAFF = [  # (role, FTE, unit salary)
    ("General manager", 1, 90_000),
    ("Operations & maintenance", 2, 60_000),
    ("Commons kitchen & food program", 2, 58_000),
    ("Housekeeping", 3, 45_000),
    ("Resident nurse / paramedic coordinator", 1, 78_000),
    ("Lab & wet-lab technician", 1, 88_000),
    ("Shuttle driver", 0.5, 52_000),
    ("Property admin / bookkeeping", 1, 55_000),
]
MED_DIR = 55_000  # contract medical director (PT, standing orders)
wages = sum(f * s for _, f, s in STAFF)
staff_total = int(wages * (1 + BURDEN) + MED_DIR)
headcount = sum(f for _, f, _ in STAFF)

# --- Non-staff opex (steady-state) ---
NONSTAFF = [
    ("Property & liability insurance", 46_000, "All-risk + GL on $21.5M TIV"),
    ("Medical/professional, bio & E&O insurance", 34_000, "Med director, CLIA-adjacent, lab"),
    ("Property tax (Coconino)", 88_000, "~0.41% effective — AZ LPV below market"),
    ("Private road (6 mi) + winter plowing", 54_000, "Grading, gravel, 7AM plow contract"),
    ("Microgrid O&M (PV/batt/gen) + fuel", 44_000, "Diesel lifesafety only; PV service"),
    ("Communications (bonded multi-LEO + LTE)", 7_000, "Starlink x2 + cellular failover"),
    ("Water system, septic O&M + waste removal", 20_000, "Well chlorination, trash, pump checks"),
    ("Bio-waste, lab consumables, autoclave service", 40_000, "BSL-2 ops, licensed hauler"),
    ("Septic tank pumping (LOS field)", 7_000, "Quarterly inspect, annual pump"),
    ("Grounds, orchard, defensible-space fire fuel", 14_000, "WUI annual clearance"),
    ("Building R&M (excl. reserves)", 40_000, "3L + bermed LL + barn"),
    ("Food & commons program", 70_000, "Staples + 3 dinners/wk — ~$123/bd/mo cost"),
    ("Shuttle operating (van fuel/ins/lease)", 18_000, "2 trips/wk Flagstaff FLG & resupply"),
    ("Program, events & marketing", 26_000, "Workshops, sponsor outreach, brand"),
    ("Software, booking & professional services", 10_000, "Booking stack, accounting, counsel"),
    ("Permits, licenses, road-agreement fees", 10_000, "Annual CUP/road compliance"),
]
nonstaff = sum(v for _, v, _ in NONSTAFF)
opex_ss = staff_total + nonstaff

# --- Derived ---
gpr_ss = BEDS_MON * RATE * 12 * OCC_SS
egi_ss = gpr_ss + BARN
noi_ss = egi_ss - opex_ss

print(f"Staffing      : ${staff_total:,}  (wages ${wages:,.0f} + {BURDEN:.0%} burden + med dir ${MED_DIR:,})")
print(f"Non-staff     : ${nonstaff:,}")
print(f"OpEx steady   : ${opex_ss:,}")
print(f"GPR @88%      : ${gpr_ss:,.0f}   EGI ${egi_ss:,.0f}")
print(f"NOI steady    : ${noi_ss:,.0f}")
for cx, lbl in [(CAPEX_LO, "low $19M"), (CAPEX_MID, "mid $21.5M"), (CAPEX_HI, "high $24M")]:
    print(f"Cap @ {lbl:12s}: {noi_ss / cx:.1%}")
for r in (3600, 4000, 4400, 4800, 5200):
    n = BEDS_MON * r * 12 * OCC_SS + BARN - opex_ss
    print(f"Sens ${r}: NOI ${n:,.0f} -> cap {n / CAPEX_MID:.1%}")

# ===================== SHEET 1: ASSUMPTIONS =====================
ws = wb.active
ws.title = "Assumptions"
ws.sheet_view.showGridLines = False
ws.page_setup.orientation = "landscape"
title_row(ws, "OUTPOST ONE (FRONTIERSHIP) — HQ OPERATING PRO FORMA · APN 30055004 · 62 BEDS (57 MONETIZED + 5 OWNER) · $4,800/MO · UNLEVERED, STEADY-STATE", 8)
ws.column_dimensions["A"].width = 46
for col in "BCDEFGH":
    ws.column_dimensions[col].width = 15

r = 3
style_header(ws, r, 8, fill=BLUE, font_color=WHITE, font_size=11)
for i, h in enumerate(["KEY INPUT", "VALUE", "UNIT", "SOURCE / NOTE", "", "", "", ""], 1):
    ws.cell(row=r, column=i, value=h)
r += 1
inputs = [
    ("Beds — monetized (inventory)", BEDS_MON, "beds", "62 total − 5 owner (ADU 2 + L3 3 = 1/12)"),
    ("Beds — owner share (never listed)", BEDS_OWN, "beds", "Owner occupied, per HQ pivot directive"),
    ("All-in rate", RATE, "$/mo", "§7B SF-bundle parity — validate w/ 3 comps (gate 5)"),
    ("Steady-state occupancy", OCC_SS, "%", "12-mo sponsor-signed leases; Y2 70% → Y4 88%"),
    ("Barn boarding (ancillary)", BARN, "$/yr", "2 stalls @ $400/mo (ag identity)"),
    ("Payroll burden", BURDEN, "%", "FICA, workers' comp, benefits — AZ rural"),
    ("Capex — low / mid / high", "", "$", "v3 build $16–20M + medical/BSL-2 $2.5–4M"),
    ("", CAPEX_LO, "$", "low"),
    ("", CAPEX_MID, "$", "mid — used for headline cap rate"),
    ("", CAPEX_HI, "$", "high"),
    ("Y1 carry (pre-opening)", Y1_CARRY, "$", "Partial staff from mo 7, insurance, road, launch"),
    ("Y2 opex factor", Y2_OPEX_FACTOR, "×", "Ramp food/program/housekeeping with lease-up"),
    ("Debt", "none", "—", "Unlevered model; optional debt at gate 8"),
    ("Taxes in NOI", "property only", "—", "AZ LLC pass-through; income tax outside model"),
]
for label, val, unit, src in inputs:
    ws.cell(row=r, column=1, value=label).font = Font(size=10, bold=bool(label and val != ""))
    c = ws.cell(row=r, column=2, value=val)
    if isinstance(val, float) and unit == "%":
        pct(c)
    elif isinstance(val, (int, float)) and isinstance(val, (int, float)) and unit == "$" and val > 1000:
        money(c)
    ws.cell(row=r, column=3, value=unit)
    ws.merge_cells(start_row=r, start_column=4, end_row=r, end_column=8)
    ws.cell(row=r, column=4, value=src).font = Font(size=9, color=MUTE)
    for cc in range(1, 9):
        ws.cell(row=r, column=cc).border = border_all
    r += 1

r += 1
style_header(ws, r, 8, fill=GOLD, font_size=11)
for i, h in enumerate(["STEADY-STATE OPEX BUILD (ANNUAL)", "QTY", "UNIT $", "TOTAL $", "NOTE", "", "", ""], 1):
    ws.cell(row=r, column=i, value=h)
r += 1
ws.cell(row=r, column=1, value="STAFFING").font = Font(bold=True, color=BLUE, size=10)
r += 1
for role, fte, sal in STAFF:
    ws.cell(row=r, column=1, value="  " + role)
    ws.cell(row=r, column=2, value=fte)
    ws.cell(row=r, column=3, value=sal); money(ws.cell(row=r, column=3))
    ws.cell(row=r, column=4, value=int(fte * sal)); money(ws.cell(row=r, column=4))
    r += 1
ws.cell(row=r, column=1, value="  Medical director (contract, PT)")
ws.cell(row=r, column=2, value=0.5)
ws.cell(row=r, column=3, value=MED_DIR * 2); money(ws.cell(row=r, column=3))
ws.cell(row=r, column=4, value=MED_DIR); money(ws.cell(row=r, column=4))
r += 1
ws.cell(row=r, column=1, value="  Payroll burden @ 25%")
ws.cell(row=r, column=4, value=int(wages * BURDEN)); money(ws.cell(row=r, column=4))
r += 1
ws.cell(row=r, column=1, value="STAFFING TOTAL").font = Font(bold=True, size=10)
ws.cell(row=r, column=4, value=staff_total).font = Font(bold=True, size=10); money(ws.cell(row=r, column=4))
ws.cell(row=r, column=5, value=f"{headcount} FTE + med director (12–16 band)").font = Font(size=9, color=MUTE)
r += 2
ws.cell(row=r, column=1, value="NON-STAFF OPERATIONS").font = Font(bold=True, color=BLUE, size=10)
r += 1
for label, val, note in NONSTAFF:
    ws.cell(row=r, column=1, value="  " + label)
    ws.cell(row=r, column=4, value=val); money(ws.cell(row=r, column=4))
    ws.merge_cells(start_row=r, start_column=5, end_row=r, end_column=8)
    ws.cell(row=r, column=5, value=note).font = Font(size=9, color=MUTE)
    r += 1
ws.cell(row=r, column=1, value="NON-STAFF TOTAL").font = Font(bold=True, size=10)
ws.cell(row=r, column=4, value=nonstaff).font = Font(bold=True, size=10); money(ws.cell(row=r, column=4))
r += 1
ws.cell(row=r, column=1, value="TOTAL OPEX — STEADY STATE").font = Font(bold=True, size=11, color=INK)
c = ws.cell(row=r, column=4, value=opex_ss); c.font = Font(bold=True, size=11); money(c)
c.fill = PatternFill(start_color=GOLD, end_color=GOLD, fill_type="solid")
r += 2
style_header(ws, r, 8, fill=GREEN, font_color=INK, font_size=11)
for i, h in enumerate(["HEADLINE (STEADY STATE, 88%)", "VALUE", "", "", "", "", "", ""], 1):
    ws.cell(row=r, column=i, value=h)
r += 1
for label, val, fmt in [
    ("Gross potential rent (57 × $4,800 × 12)", BEDS_MON * RATE * 12, "m"),
    ("Effective gross revenue @ 88% + barn", egi_ss, "m"),
    ("Total opex", opex_ss, "m"),
    ("NOI", noi_ss, "m"),
    ("Cap rate on mid capex $21.5M", noi_ss / CAPEX_MID, "p"),
    ("Cap rate — range $19M…$24M", f"{noi_ss / CAPEX_HI:.1%} … {noi_ss / CAPEX_LO:.1%}", "t"),
    ("Break-even occupancy (NOI = 0)", (opex_ss - BARN) / (BEDS_MON * RATE * 12), "p"),
]:
    ws.cell(row=r, column=1, value=label).font = Font(size=10)
    c = ws.cell(row=r, column=2, value=val)
    if fmt == "m": money(c)
    elif fmt == "p": pct(c)
    else: c.font = Font(size=10, color=BLUE)
    for cc in range(1, 9):
        ws.cell(row=r, column=cc).border = border_all
    r += 1

# ===================== SHEET 2: 5-YEAR P&L =====================
ws2 = wb.create_sheet("ProForma_5yr")
ws2.sheet_view.showGridLines = False
ws2.page_setup.orientation = "landscape"
title_row(ws2, "OUTPOST ONE — 5-YEAR OPERATING PRO FORMA (UNLEVERED) · Y1 BUILD · Y2 LEASE-UP 70% · Y3 82% · Y4–5 STEADY 88%", 7)
ws2.column_dimensions["A"].width = 46
for i in range(2, 7):
    ws2.column_dimensions[get_column_letter(i)].width = 15
ws2.column_dimensions["G"].width = 30

r = 3
style_header(ws2, r, 7, fill=GOLD, font_size=11)
for i, h in enumerate(["LINE", "Y1 BUILD", "Y2 LEASE-UP", "Y3", "Y4 STEADY", "Y5", "NOTE"], 1):
    ws2.cell(row=r, column=i, value=h)

occ_row = RAMP
bed_rev = [BEDS_MON * RATE * 12 * o for o in RAMP]
barn = [0 if i == 0 else BARN for i in range(5)]
egi = [bed_rev[i] + barn[i] for i in range(5)]
opex = [Y1_CARRY, opex_ss * Y2_OPEX_FACTOR, opex_ss, opex_ss, opex_ss]
noi = [egi[i] - opex[i] for i in range(5)]
reserve = [0, 50_000, 50_000, 50_000, 50_000]
capex_draw = [int(CAPEX_MID * 0.65), int(CAPEX_MID * 0.35), 0, 0, 0]

rows = [
    ("Average occupancy", RAMP, "p", "Sponsor leases; 30-day min, no STR"),
    ("Beds in inventory (monetized)", [BEDS_MON] * 5, "n", "Owner 5 excluded"),
    ("Bed revenue", bed_rev, "m", "57 × rate × 12 × occupancy"),
    ("Barn boarding", barn, "m", "2 stalls × $400/mo (Y2+)"),
    ("EFFECTIVE GROSS REVENUE", egi, "m", ""),
    ("Operating expenses", opex, "m", "Y1 carry $160k · Y2 ×0.88 · Y3+ steady"),
    ("NET OPERATING INCOME", noi, "m", "Unlevered, before reserve & capex"),
    ("Replacement reserve (memo)", reserve, "m", "$50k/yr from Y2 — below NOI"),
    ("Cash flow after reserve", [noi[i] - reserve[i] for i in range(5)], "m", ""),
    ("Capex draw (memo, mid $21.5M)", capex_draw, "m", "65% Y1 shell+site · 35% Y2 med/lab fit-out"),
]
for label, vals, fmt, note in rows:
    r += 1
    bold = label.isupper()
    cell = ws2.cell(row=r, column=1, value=label)
    cell.font = Font(size=10, bold=bold, color=(INK if label == "NET OPERATING INCOME" else "000000"))
    for i, v in enumerate(vals, 2):
        c = ws2.cell(row=r, column=i, value=v)
        if fmt == "m": money(c)
        elif fmt == "p": pct(c)
        else: c.alignment = Alignment(horizontal="center")
        c.border = border_all
        c.font = Font(size=10, bold=bold)
        if label == "NET OPERATING INCOME":
            c.fill = PatternFill(start_color=GREEN, end_color=GREEN, fill_type="solid")
    ws2.cell(row=r, column=7, value=note).font = Font(size=9, color=MUTE)
    if bold and label != "NET OPERATING INCOME":
        for cc in range(1, 8):
            ws2.cell(row=r, column=cc).fill = PatternFill(start_color=STRIPE, end_color=STRIPE, fill_type="solid")

r += 2
ws2.cell(row=r, column=1, value="CAP RATE ON Y4 STEADY NOI (memo)").font = Font(bold=True, size=10, color=BLUE)
r += 1
style_header(ws2, r, 7, fill=BLUE, font_color=WHITE, font_size=10)
for i, h in enumerate(["CAPEX", "$19.0M LOW", "$21.5M MID", "$24.0M HIGH", "", "", "NOTE"], 1):
    ws2.cell(row=r, column=i, value=h)
r += 1
ws2.cell(row=r, column=1, value="Implied cap rate — Y4 NOI")
for i, cx in enumerate([CAPEX_LO, CAPEX_MID, CAPEX_HI], 2):
    c = ws2.cell(row=r, column=i, value=noi[3] / cx)
    pct(c); c.font = Font(bold=True, size=11)
    c.alignment = Alignment(horizontal="center")
    c.border = border_all
ws2.cell(row=r, column=7, value="Doc target: ~6.6% mid").font = Font(size=9, color=MUTE)

# ===================== SHEET 3: SENSITIVITY =====================
ws3 = wb.create_sheet("Sensitivity")
ws3.sheet_view.showGridLines = False
title_row(ws3, "OUTPOST ONE — RATE × OCCUPANCY SENSITIVITY · OPEX FIXED AT STEADY $%s · CAPEX MID $21.5M" % f"{opex_ss:,}", 6)
ws3.column_dimensions["A"].width = 26
for col in "BCDEF":
    ws3.column_dimensions[col].width = 16

OCCS = [0.70, 0.80, 0.88, 0.92]
RATES = [3600, 4000, 4400, 4800, 5200]

def grid(r, heading, fn, fmt):
    global ws3
    style_header(ws3, r, 5, fill=GOLD, font_size=11)
    ws3.cell(row=r, column=1, value=heading)
    for j, o in enumerate(OCCS, 2):
        c = ws3.cell(row=r, column=j, value=o); pct(c)
    r += 1
    for rate in RATES:
        c = ws3.cell(row=r, column=1, value=rate); money(c)
        c.font = Font(bold=True, size=10)
        c.border = border_all
        for j, o in enumerate(OCCS, 2):
            c = ws3.cell(row=r, column=j, value=fn(rate, o))
            if fmt == "m": money(c)
            else: pct(c)
            c.border = border_all
            if rate == RATE and abs(o - OCC_SS) < 1e-9:
                c.fill = PatternFill(start_color=GREEN, end_color=GREEN, fill_type="solid")
                c.font = Font(bold=True)
        r += 1
    return r + 1

r = 3
r = grid(r, "NET OPERATING INCOME",
         lambda rate, occ: BEDS_MON * rate * 12 * occ + BARN - opex_ss, "m")
r = grid(r, "CAP RATE @ $21.5M CAPEX",
         lambda rate, occ: (BEDS_MON * rate * 12 * occ + BARN - opex_ss) / CAPEX_MID, "p")

style_header(ws3, r, 5, fill=BLUE, font_color=WHITE, font_size=11)
ws3.cell(row=r, column=1, value="CAP RATE @ 88% BY CAPEX")
for j, cx in enumerate([CAPEX_LO, CAPEX_MID, CAPEX_HI], 2):
    c = ws3.cell(row=r, column=j, value=cx); money(c)
r += 1
for rate in RATES:
    c = ws3.cell(row=r, column=1, value=rate); money(c)
    c.font = Font(bold=True, size=10); c.border = border_all
    noi_r = BEDS_MON * rate * 12 * OCC_SS + BARN - opex_ss
    for j, cx in enumerate([CAPEX_LO, CAPEX_MID, CAPEX_HI], 2):
        c = ws3.cell(row=r, column=j, value=noi_r / cx)
        pct(c); c.border = border_all
        if rate == RATE:
            c.fill = PatternFill(start_color=GREEN, end_color=GREEN, fill_type="solid")
            c.font = Font(bold=True)
    r += 1

r += 1
ws3.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
c = ws3.cell(row=r, column=1, value="Break-even occupancy (zero NOI at given rate): "
             + "  ·  ".join(f"${rt}: {(opex_ss - BARN) / (BEDS_MON * rt * 12):.0%}" for rt in (3600, 4000, 4800)))
c.font = Font(size=10, italic=True, color=RED)
r += 2
ws3.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
c = ws3.cell(row=r, column=1, value="$4,800 is load-bearing: below ~$4,000 blended the HQ reverts to consumption-asset math. "
             "Gate 5 = validate with 3 comps (sponsor-paid researcher housing + lab-bench memberships) before design spend.")
c.font = Font(size=10, bold=True, color=INK)
c.fill = PatternFill(start_color=GOLD, end_color=GOLD, fill_type="solid")

out = "single-parcel-APN30055004/docs/OUTPOST_ONE_ProForma.xlsx"
wb.save(out)
print("Saved", out)
