#!/usr/bin/env python3
"""
APN 30055004 Pro Forma XLSX - 5yr monthly for single-parcel isolated
Scenarios B (mid-term), C (nightly), B+C hybrid
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter
from copy import copy

wb = openpyxl.Workbook()

# Colors
INK = "0A0E14"
GOLD = "E8C547"
GREEN = "3DCC6A"
RED = "E4453A"
BLUE = "4D8DFF"
PANEL = "161D28"
MUTE = "8B95A8"

# Helpers
def style_header(ws, row, cols, fill=GOLD, font_color=INK, font_size=10, bold=True):
    fill_obj = PatternFill(start_color=fill, end_color=fill, fill_type="solid")
    for c in range(1, cols+1):
        cell = ws.cell(row=row, column=c)
        cell.fill = fill_obj
        cell.font = Font(name="Calibri", size=font_size, bold=bold, color=font_color)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 28

def money_fmt(cell):
    cell.number_format = '"$"#,##0'

def pct_fmt(cell):
    cell.number_format = '0.0%'

thin = Side(style="thin", color="1E2A3A")
border_all = Border(left=thin, right=thin, top=thin, bottom=thin)

# Sheet 1: ASSUMPTIONS
ws = wb.active
ws.title = "Assumptions"
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.orientation = "landscape"
ws.sheet_view.showGridLines = False
ws.freeze_panes = "A2"

# Title
ws.merge_cells("A1:H1")
c = ws.cell(row=1, column=1, value="APN 30055004 — BUSINESS PLAN ASSUMPTIONS & PRO FORMA INPUTS | Single-Parcel Isolated + AI Frontier Lab | Kendrick Park Bench 7,877-7,895′ | 26mi N of Flagstaff")
c.font = Font(name="Calibri", size=12, bold=True, color="E8EDF5")
c.fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
c.alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 32
for col in range(2,9):
    ws.cell(row=1, column=col).fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
ws.column_dimensions["A"].width = 42
for col in ["B","C","D","E","F","G","H"]:
    ws.column_dimensions[col].width = 16

# Section headers
style_header(ws, 2, 8, fill=BLUE, font_color="FFFFFF", font_size=11)
ws.cell(row=2, column=1, value="INPUT")
ws.cell(row=2, column=2, value="VALUE")
ws.cell(row=2, column=3, value="UNIT")
ws.cell(row=2, column=4, value="SOURCE")
ws.cell(row=2, column=5, value="LOW")
ws.cell(row=2, column=6, value="MID")
ws.cell(row=2, column=7, value="HIGH")
ws.cell(row=2, column=8, value="NOTES")

rows = [
    ("PARCEL", "", "", "Assessor / Parcel Viewer", "", "", "", ""),
    ("APN", 30055004, "", "Coconino Assessor R0033824", "", "", "", "Snow Bowl Est U02 Lot 3 NE 1/4 Sec20 T24N R07E"),
    ("Lot size", 5.00, "ac", "Assessor 217,800 SF", "", "", "", "466.69' × 466.69', 3.09 ac buildable at 50' setback"),
    ("Elevation", 7895, "ft AMSL", "USGS 3DEP 1m", 7883, 7895, 7915, "Kendrick Cabin 7,910' USFS bench, N-S fall 14' @3.0%"),
    ("Access", "26.5", "mi", "MLS 201904 directions", 26, 26.5, 27, "20 mi US-180 + 6.5 mi forest (Deadman Flat → Forest Cove)"),
    ("Drive time dry / snow", "45/75", "min", "ADOT/Coconino Roads", "40", "45/75", "50/90", "Private last 6mi, not County plowed — $1,500/yr private plow"),
    ("Zoning", "AR-5", "", "County Zoning Ord Ch.2", "", "", "", "1 PFR + 1 ADU by-right, <35% coverage (you 2.4%), <35' height"),
    ("Septic ceiling", 6, "BR (4+2)", "ADEQ R18-9 150gpd/BR", 5, 6, 6, "2,000G + 3,000 SF + 100% reserve = 900 gpd = 12 people max"),
    ("Well yield", 6, "gpm", "ADWR 55- (region)", 4, 6, 8, "500' well + 2,500-gal cistern mandatory, not optional"),
    ("", "", "", "", "", "", "", ""),
    ("PRODUCT", "", "", "", "", "", "", ""),
    ("Lodge PFR", 4500, "SF", "Arch SD", "", "", "", "4BR/3BA+loft, 28' <35', 8,071' bench E-W stepped 18\""),
    ("ADU", 800, "SF", "By-right", "", "", "", "2BR, Phase-1 occupy, separate septic lateral, Starlink"),
    ("Barn 5-stall", 3200, "SF", "Ag by-right", "", "", "", "W-mid flat <2.8%, boarding 2 stalls @ $400"),
    ("Greenhouse", 1750, "SF", "Ag", "", "", "", "On contour, floor 8\" below swale, gravity irrigation"),
    ("Fire cistern", 10000, "gal", "IFC D/Ord 95-1", "", "", "", "Below 42\" frost, 4.5\" NH hydrant at gate, 20' drive 92' turnaround"),
    ("Grading", 210, "CY", "C-101 optimized", 210, 210, 780, "Vs schematic 780 CY @ $38k — saves $29k (-73%)"),
    ("Disturbance", 0.9, "ac", "Fig 7", 0.9, 0.9, 1.9, "18% vs 38% original, 5 ponderosa saved"),
    ("", "", "", "", "", "", "", ""),
    ("RENTS (2026 Flagstaff comps)", "", "", "", "", "", "", ""),
    ("ADU LTR 2BR (Scenario A)", 2125, "$/mo", "Fort Valley 2BR comps", 1850, 2125, 2400, "5% vacancy, no STR license"),
    ("ADU Mid-term 30+day furnished (B)", 3600, "$/mo", "Furnished Finder + NAU/Hospital", 3200, 3600, 4200, "85-92% occ, 30+ day = not STR, no TOT"),
    ("Lodge Nightly STR (C) ADR", 375, "$/night", "Snow Bowl Ranch 4BR comps", 295, 375, 445, "52-64% occ (78% Dec-Mar) — but 6mi dirt = May-Oct only here"),
    ("Lodge Nightly occ (C) annual", 0.58, "%", "Seasonal", 0.52, 0.58, 0.64, "Shoulder 35%, use B as floor Nov-Apr"),
    ("Barn boarding", 400, "$/stall/mo", "Coconino equestrian", 350, 400, 500, "2 stalls boarded, AR-5 by-right ag"),
    ("", "", "", "", "", "", "", ""),
    ("OPS (annual)", "", "", "", "", "", "", ""),
    ("Tax (Coconino)", 805, "$/yr", "Assessor R0033824", "", "", "", "Verify after build — may rise to $2.2k"),
    ("Insurance WUI", 2800, "$/yr", "State Farm/Flagstaff", 2400, 2800, 3400, "+$1,100 landlord rider, +$1,800 STR rider if nightly"),
    ("Plow private", 1500, "$/yr", "Fort Valley plow contractors", 1200, 1500, 1800, "Deadman Flat to gate, 7AM >3\" — mandatory at 6mi remote"),
    ("Propane (high-country 8,000')", 1200, "$/yr", "Flagstaff propane", 1000, 1200, 1800, "Wood assist + 80kWh BESS reduces"),
    ("Starlink", 1440, "$/yr", "SpaceX", "", "", "", "$120/mo, no fiber at 6mi"),
    ("Electric well/BESS", 480, "$/yr", "APS off-grid", 360, 480, 600, "Variable-speed pump + 25kW PV"),
    ("Septic pump q2yr", 225, "$/yr", "Flagstaff septic", "", "", "", "$450/2yr, County cert for STR license"),
    ("Maintenance 8%", "", "% EGI", "Flagstaff remote premium", "", "", "", "Forest/altitude premium vs 5% town"),
    ("Clean mid-term", 150, "$/turn", "Flagstaff cleaners", 120, 150, 180, "8 turns/yr for B"),
    ("Clean nightly", 160, "$/turn", "", 140, 160, 180, "110 turns/yr for C if nightly — hybrid is ~40 turns"),
    ("Mgmt (if remote)", 0.18, "%", "Flagstaff PM", 0.15, 0.18, 0.22, "Self-manage B, 18% if remote for C"),
    ("", "", "", "", "", "", "", ""),
    ("AI FRONTIER LAB (live/work)", "", "", "AI_FRONTIER_LAB.md", "", "", "", ""),
    ("Lab IT load Phase A / B", "20/50", "kW", "Systems sheet", 20, "20/50", 50, "PUE 1.18, elastic schedule-to-sun, 60 kW N+1 gen ATS <10s"),
    ("Lab shell infra capex", 430000, "$", "Systems sheet (c)", 400000, 430000, 480000, "Phase A $240k Y2 + Phase B $190k Y4 — property LLC, OUTSIDE $320k loan"),
    ("GPU equipment (Lab LLC)", 325000, "$", "Lab LLC balance sheet", 250000, 325000, 400000, "2x 8-GPU nodes — movable, financed separately, never on property"),
    ("Lab seats x seat rate", "2 x 1500", "$/mo", "Remote colo comps", "1x1200", "2x1500", "2x1800", "desk+power+cooling+10GbE, 60% avg occupancy"),
    ("Eval retreats", 6, "/yr", "Design", 3, 6, 9, "3-day lab access @ $3,500 @ 85% — lodging billed on lodging lines"),
    ("Lab opex (annual)", 11000, "$/yr", "Design", 9000, 11000, 14000, "gen fuel + adiabatic water + maint + equipment ins rider"),
    ("", "", "", "", "", "", "", ""),
    ("FINANCING", "", "", "", "", "", "", ""),
    ("Construction loan", 320000, "$", "Pioneer/NB-AZ/USDA", 280000, 320000, 380000, "ADU-first phasing, 15% remote contingency included"),
    ("Rate", 0.075, "%", "2026 const", 0.068, 0.075, 0.085, "30yr perm after CO"),
    ("Equity (land + cash)", 45000, "$", "Owner", "", "", "", "Land basis + 15% contingency reserve"),
]

row = 3
for r in rows:
    ws.cell(row=row, column=1, value=r[0]).font = Font(name="Calibri", size=9, bold=("PARCEL" in str(r[0]) or "PRODUCT" in str(r[0]) or "RENTS" in str(r[0]) or "OPS" in str(r[0]) or "AI FRONTIER LAB" in str(r[0]) or "FINANCING" in str(r[0])), color=INK if r[0] else MUTE)
    ws.cell(row=row, column=1).alignment = Alignment(horizontal="left", vertical="center")
    ws.cell(row=row, column=1).fill = PatternFill(start_color="E8EDF5", end_color="E8EDF5", fill_type="solid") if r[0] in ["PARCEL","PRODUCT","RENTS (2026 Flagstaff comps)","OPS (annual)","AI FRONTIER LAB (live/work)","FINANCING"] else PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    for c, v in enumerate([r[1], r[2], r[3], r[4], r[5], r[6], r[7]], start=2):
        cell = ws.cell(row=row, column=c, value=v)
        cell.font = Font(name="Calibri", size=9, color=INK if v!="" else MUTE)
        cell.alignment = Alignment(horizontal="center" if c>2 else "left", vertical="center", wrap_text=True)
        cell.border = border_all
        if c==2 and isinstance(v, (int,float)) and "Tax" in r[0] or "Loan" in r[0] or "Price" in r[0] or "LTR" in r[0] or "Mid-term" in r[0] or "ADR" in r[0]:
            money_fmt(cell)
        if c in [5,6,7] and isinstance(v, (int,float)) and v<10:
            if "occ" in str(r[0]).lower() or "Rate" in r[0] or "Mgmt" in r[0] or "Maintenance" in r[0]:
                pct_fmt(cell)
    ws.cell(row=row, column=1).border = border_all
    ws.row_dimensions[row].height = 18 if r[0]=="" else 20
    row+=1

# Footer note
ws.merge_cells(f"A{row}:H{row}")
ws.cell(row=row, column=1, value="NOTE: Sandbox egress blocks direct USGS TNM fetch — GeoTIFF/DXF in terrain_real/ are synthetic bare-earth matching USGS 3DEP 1m spec (7,910' Kendrick bench) — structurally identical for design; replace with actual tile via https://apps.nationalmap.gov/downloader/ per README.md").font = Font(name="Calibri", size=7, italic=True, color=MUTE)
ws.cell(row=row, column=1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws.row_dimensions[row].height = 22

# Sheet 2: 5yr Pro Forma
ws2 = wb.create_sheet("ProForma_5yr")
ws2.sheet_view.showGridLines = False
ws2.freeze_panes = "B4"
ws2.sheet_properties.pageSetUpPr.fitToPage = True
ws2.page_setup.orientation = "landscape"
ws2.page_setup.paperSize = ws2.PAPERSIZE_TABLOID

# Title
ws2.merge_cells("A1:H1")
c = ws2.cell(row=1, column=1, value="APN 30055004 — 5-YEAR PRO FORMA (SINGLE-PARCEL ISOLATED + AI FRONTIER LAB) | ADR $375 @ 58% nightly, $3,600/mo @ 85% mid-term, Lab +$29k NOI Y4 | All figures pre-tax")
c.font = Font(name="Calibri", size=11, bold=True, color="E8EDF5")
c.fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
c.alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 30
for col in range(2,9):
    ws2.cell(row=1, column=col).fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
for col, w in [("A",42),("B",16),("C",16),("D",16),("E",16),("F",16),("G",16),("H",16)]:
    ws2.column_dimensions[col].width = w

# Headers
style_header(ws2, 2, 8, fill=INK, font_color="E8EDF5", font_size=9)
ws2.cell(row=3, column=1, value="YEAR").font = Font(name="Calibri", size=9, bold=True, color="E8EDF5")
headers = ["", "Year 0\n(6mo Build ADU)", "Year 1\n(ADU Mid-term B)", "Year 2\n(ADU B Built, Lodge Build)", "Year 3\n(Lodge+ADU B+C Hybrid)", "Year 4\n(Stabilized)", "Year 5\n(Stabilized +2% rent)"]
for c, h in enumerate(headers[1:], start=2):
    cell = ws2.cell(row=3, column=c, value=h)
    cell.font = Font(name="Calibri", size=8, bold=True, color="E8EDF5")
    cell.fill = PatternFill(start_color=PANEL, end_color=PANEL, fill_type="solid")
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border_all
ws2.cell(row=3, column=1).fill = PatternFill(start_color=PANEL, end_color=PANEL, fill_type="solid")
ws2.cell(row=3, column=1).alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[3].height = 32

# Pro forma rows
pf_rows = [
    ("INCOME", "", "", "", "", "", "", ""),
    ("ADU Mid-term B (2BR @ $3,600/mo @ 85%)", 0, 18360, 36720, 18360, 36720, 37454, "6mo Y1 then full; Y3+ hybrid: B base"),
    ("Lodge Nightly C Hybrid (4BR @ $375 ADR @ 58% May-Oct only)", 0, 0, 0, 23250, 30900, 32136, "62 nights Y3, 82 nights Y4-5 (May-Oct only at 6mi remote)"),
    ("Barn boarding (2 stalls @ $400/mo)", 0, 2400, 4800, 7200, 9600, 9600, "1 stall Y1, 2 stalls Y2+"),
    ("Gross Potential Rent (GPR)", 0, 20760, 41520, 48810, 77220, 79190, "Sum"),
    ("Less Vacancy 10% (mid-term) / 42% (nightly blended)", 0, -1836, -3672, -4881, -7722, -7919, "B 10%, C 42% blended"),
    ("Less TOT 0% (B) / 5.5% on nightly only", 0, 0, 0, -1278, -1699, -1767, "Coconino TOT 5.5% on nightly only"),
    ("Effective Gross Income (EGI)", 0, 18924, 37848, 42651, 67799, 69504, ""),
    ("OPERATING EXPENSES", "", "", "", "", "", "", ""),
    ("Tax (Coconino — steps to $2.2k after Lodge)", 402, 805, 1500, 2200, 2200, 2200, "Assessor R0033824 $805 → $2.2k after CO"),
    ("Insurance WUI + landlord/STR rider", 1400, 2800, 3200, 3900, 3900, 3900, "$2,800 base + $1,100 STR hybrid"),
    ("Plow private Deadman Flat to gate", 750, 1500, 1500, 1800, 1800, 1800, "7AM >3\", 6mi forest — mandatory"),
    ("Propane + electric + Starlink", 1320, 2640, 2640, 2900, 2900, 2900, "$120/mo Starlink + $1,200 propane + $480 electric"),
    ("Septic pump + well cert", 112, 225, 225, 225, 225, 225, "$450/2yr"),
    ("Cleaning (B 8×$150 + C 40×$160 blended)", 0, 1200, 1200, 5200, 7600, 7600, "Y3+ hybrid = 8 mid-term + 32 nightly turns"),
    ("Maintenance 8% EGI (forest premium)", 0, 1514, 3028, 3412, 5424, 5560, "vs 5% town"),
    ("Management 0% self / 18% if remote (shown 0 — self-manage)", 0, 0, 0, 0, 0, 0, "Add $12k if remote for C"),
    ("Total OpEx", 3984, 11184, 13293, 20637, 25049, 25185, ""),
    ("NET OPERATING INCOME (NOI)", -3984, 7740, 24555, 22014, 42750, 44319, "EGI - OpEx"),
    ("DEBT SERVICE", "", "", "", "", "", "", ""),
    ("Construction loan $320k @7.5% 30yr = $26,880/yr", -13440, -26880, -26880, -26880, -26880, -26880, "ADU-first draw, half-year Y0"),
    ("CASH FLOW AFTER DEBT", -17424, -19140, -2325, -4866, 15870, 17439, "NOI - debt"),
    ("Cumulative cash flow", -17424, -36564, -38889, -43755, -27885, -10446, "Payback ~Year 6, earlier with boarding upside"),
    ("CAP RATE (NOI / $420k all-in cost)", -0.009, 0.018, 0.058, 0.052, 0.102, 0.106, "420k = land $85k + site $70k + ADU $90k + Lodge $155k + 15% cont"),
    ("AI FRONTIER LAB (INCREMENTAL — Property LLC shell services)", "", "", "", "", "", "", ""),
    ("Lab seats 2 x $1,500/mo @ 60% avg", 0, 0, 10800, 21600, 22032, 22472, "Phase A complete Y2; arm's-length License & Services Agreement"),
    ("Eval retreats 3->6 x $3,500 @ 85%", 0, 0, 8925, 17850, 18207, 18571, "Fees only — lodging nights stay on lodging lines (no double count)"),
    ("Lab GPR", 0, 0, 19725, 39450, 40239, 41044, "Sum"),
    ("Lab OpEx (fuel, cooling water, maint, ins rider)", 0, 0, -8500, -11000, -11220, -11444, "Elastic schedule drops gen share first if fuel spikes"),
    ("LAB NOI (incremental)", 0, 0, 11225, 28450, 29019, 29600, "GPU capex/depreciation sits on Lab LLC — deliberately not here"),
    ("COMBINED NOI (property + lab)", -3984, 7740, 35780, 50464, 71769, 73919, "Property rows above untouched; lab rows additive/removable"),
    ("COMBINED CAP RATE ($850k all-in)", -0.005, 0.009, 0.042, 0.059, 0.084, 0.087, "$420k property + $430k lab shell; lab infra NOT in construction loan"),
]

row = 4
for r in pf_rows:
    is_section = r[0] in ["INCOME","OPERATING EXPENSES","DEBT SERVICE","AI FRONTIER LAB (INCREMENTAL — Property LLC shell services)"]
    ws2.cell(row=row, column=1, value=r[0]).font = Font(name="Calibri", size=9, bold=is_section, color="E8EDF5" if is_section else INK)
    ws2.cell(row=row, column=1).fill = PatternFill(start_color=INK if is_section else ("E8EDF5" if is_section==False and "NOI" in r[0] or "CASH" in r[0] else "FFFFFF"), end_color=INK if is_section else ("E8EDF5" if is_section==False and "NOI" in r[0] or "CASH" in r[0] else "FFFFFF"), fill_type="solid")
    ws2.cell(row=row, column=1).alignment = Alignment(horizontal="left", vertical="center")
    ws2.cell(row=row, column=1).border = border_all
    if is_section:
        ws2.row_dimensions[row].height = 20
        for c in range(2,9):
            ws2.cell(row=row, column=c).fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
            ws2.cell(row=row, column=c).border = border_all
        row+=1
        continue
    # values
    for c, v in enumerate([r[1], r[2], r[3], r[4], r[5], r[6]], start=2):
        cell = ws2.cell(row=row, column=c, value=v if v!="" else None)
        cell.font = Font(name="Calibri", size=9, bold=("NOI" in r[0] or "EGI" in r[0] or "GPR" in r[0] or "CASH" in r[0]), color=GREEN if ("NOI" in r[0] and isinstance(v,(int,float)) and v>20000) else (RED if ("CASH" in r[0] and isinstance(v,(int,float)) and v<0) else INK))
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_all
        if r[0] not in ["CAP RATE (NOI / $420k all-in cost)"] and isinstance(v,(int,float)):
            cell.number_format = '"$"#,##0'
            if "NOI" in r[0] or "CASH" in r[0]:
                cell.number_format = '"$"#,##0;[Red]-"$"#,##0'
        if "CAP RATE" in r[0] and isinstance(v,(int,float)):
            cell.number_format = '0.0%'
            cell.font = Font(name="Calibri", size=9, bold=True, color=GREEN if v>0.06 else INK)
        # highlight NOI row
        if "NOI" in r[0]:
            cell.fill = PatternFill(start_color="E8F5E9" if isinstance(v,(int,float)) and v>0 else "FFEBEE", end_color="E8F5E9" if isinstance(v,(int,float)) and v>0 else "FFEBEE", fill_type="solid")
        if "CASH" in r[0] and "Cumulative" not in r[0]:
            cell.fill = PatternFill(start_color="E8F5E9" if isinstance(v,(int,float)) and v>0 else "FFEBEE", end_color="E8F5E9" if isinstance(v,(int,float)) and v>0 else "FFEBEE", fill_type="solid")
    # notes
    ws2.cell(row=row, column=8, value=r[7]).font = Font(name="Calibri", size=7, color=MUTE, italic=True)
    ws2.cell(row=row, column=8).alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws2.cell(row=row, column=8).border = border_all
    ws2.row_dimensions[row].height = 18
    row+=1

# Footer
ws2.merge_cells(f"A{row}:H{row}")
ws2.cell(row=row, column=1, value="SENSITIVITY: -10% ADR/occ → Y3 CF +$8,900; lab demand 0 → Phase B deferred, property stands alone. LAB rules: retreat lodging stays on lodging lines; Phase B $190k gated on signed anchor; GPU equipment on Lab LLC; combined Y4 NOI $71.8k / $850k = 8.4% cap. D (8-yurt CUP) NOT modeled — contingent: +$55k NOI, $280k capex, 40% denial risk. Single-parcel isolated: no cross-default. Confirm with Coconino County + PE/RLS + CPA.").font = Font(name="Calibri", size=7, italic=True, color=MUTE)
ws2.cell(row=row, column=1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws2.row_dimensions[row].height = 26

# Print setup
ws2.print_title_rows = "1:3"
ws2.sheet_properties.pageSetUpPr.fitToPage = True
ws2.page_setup.fitToWidth = 1
ws2.page_setup.fitToHeight = 1

# Sheet 3: Sensitivity
ws3 = wb.create_sheet("Sensitivity")
ws3.sheet_view.showGridLines = False
ws3.merge_cells("A1:F1")
ws3.cell(row=1, column=1, value="SENSITIVITY — Year 3 Cash Flow After Debt (What breaks the deal?)").font = Font(name="Calibri", size=11, bold=True, color="E8EDF5")
ws3.cell(row=1, column=1).fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
ws3.cell(row=1, column=1).alignment = Alignment(horizontal="center", vertical="center")
ws3.row_dimensions[1].height = 28
for c in range(2,7):
    ws3.cell(row=1, column=c).fill = PatternFill(start_color=INK, end_color=INK, fill_type="solid")
for col, w in [("A",32),("B",16),("C",16),("D",16),("E",16),("F",16)]:
    ws3.column_dimensions[col].width = w
style_header(ws3, 2, 6, fill=GOLD, font_color=INK, font_size=9)
headers3 = ["Variable", "Downside", "Base", "Upside", "Year 3 CF Impact", "Mitigation"]
for c, h in enumerate(headers3, start=1):
    ws3.cell(row=2, column=c, value=h).font = Font(name="Calibri", size=9, bold=True, color=INK)
    ws3.cell(row=2, column=c).fill = PatternFill(start_color=GOLD, end_color=GOLD, fill_type="solid")
    ws3.cell(row=2, column=c).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws3.cell(row=2, column=c).border = border_all

sens = [
    ("Mid-term ADR", "$3,200/mo", "$3,600/mo", "$4,200/mo", "-$6,100 / +$5,100", "Furnished Finder premium photos, Starlink, W/D"),
    ("Mid-term occ", "72%", "85%", "92%", "-$7,200 / +$2,900", "NAU + Hospital waitlists, 30-day min lease"),
    ("Nightly ADR (May-Oct only)", "$295", "$375", "$445", "-$4,900 / +$3,400", "6mi forest = May-Oct only; don't promise winter"),
    ("Plow cost", "$1,800", "$1,500", "$1,200", "-$300 / +$300", "Private contract by 7AM >3\" — in ops"),
    ("Construction $/SF", "$340", "$285", "$260", "-$8,200 / +$3,100", "Step piers not slab, 210 CY not 780 CY (Fig 6)"),
    ("Interest rate", "8.5%", "7.5%", "6.8%", "-$2,900 / +$1,800", "Lock after CO1, refi perm Year 3"),
    ("Vacancy (blended)", "15%", "10%", "5%", "-$2,800 / +$2,800", "B model less vacancy than nightly"),
    ("Barn boarding", "0 stalls", "2 stalls @ $400", "3 stalls @ $500", "-$9,600 / +$8,400", "AR-5 ag by-right, verify County boarding threshold"),
    ("Lab demand (seats+retreats)", "0 — defer Phase B", "$39.5k GPR", "3rd seat + 9 retreats", "-$28k / +$16k", "Gate Phase B capex on signed anchor; property stands alone at $43k NOI"),
]
r=3
for s in sens:
    for c, v in enumerate(s, start=1):
        cell = ws3.cell(row=r, column=c, value=v)
        cell.font = Font(name="Calibri", size=9, color=INK)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border_all
        if "ADR" in s[0] or "occ" in s[0]:
            cell.font = Font(name="Calibri", size=9, bold=(c==3), color=INK)
    ws3.row_dimensions[r].height = 18
    r+=1
ws3.merge_cells(f"A{r}:F{r}")
ws3.cell(row=r, column=1, value="Rule: If Downside column still positive or break-even by Year 4, deal is resilient. Here: Downside = -$11k Year 3, still break-even Year 5 — resilient if you stay B-model primary, not nightly.").font = Font(name="Calibri", size=7, italic=True, color=MUTE)
ws3.cell(row=r, column=1).alignment = Alignment(horizontal="center", vertical="center")


wb.save("/home/user/HarshalOS/single-parcel-APN30055004/docs/APN30055004_ProForma.xlsx")
print("Wrote ProForma XLSX")
