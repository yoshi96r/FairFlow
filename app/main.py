from __future__ import annotations
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from datetime import date
import csv, io, json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

from .db import engine, init_db
from .models import Employee, Asset, Part, WorkOrder
from .utils import generate_pm, auto_assign, close_workorder

app = FastAPI(title="USPS MOS Assistant", version="1.0.0")
BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"])
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

def render(template: str, **ctx):
    tpl = env.get_template(template)
    return HTMLResponse(tpl.render(**ctx))

@app.on_event("startup")
def startup():
    init_db()
    # seed minimal data if empty
    with Session(engine) as s:
        if s.exec(select(Employee)).first() is None:
            s.add_all([
                Employee(name="Alex Tech", role="Tech", skills_csv="conveyor,mechanical,electrical", tacs_id="T123"),
                Employee(name="Sam Electric", role="Electrician", skills_csv="electrical,plc", tacs_id="T124"),
                Employee(name="Jo MOS Clerk", role="MOS Clerk", skills_csv="inventory,dispatch", tacs_id="T125"),
            ])
        if s.exec(select(Asset)).first() is None:
            s.add_all([
                Asset(name="AFCS-200", location="Plant A", pm_interval_days=60, tags_csv="electrical,conveyor"),
                Asset(name="DPS Conveyor 3", location="Plant B", pm_interval_days=30, tags_csv="mechanical,conveyor"),
            ])
        if s.exec(select(Part)).first() is None:
            s.add_all([
                Part(sku="BRG-6203", name="6203 Bearing", qty=20, min_qty=5),
                Part(sku="BELT-XL200", name="XL200 Belt", qty=8, min_qty=3),
            ])
        s.commit()

@app.get("/", response_class=HTMLResponse)
def dashboard():
    with Session(engine) as s:
        open_wos = s.exec(select(WorkOrder).where(WorkOrder.status != "Done")).all()
        overdue = [w for w in open_wos if w.due_date and w.due_date < date.today()]
        low_parts = s.exec(select(Part)).all()
        low_parts = [p for p in low_parts if p.qty <= p.min_qty]
        return render("dashboard.html",
                      open_count=len(open_wos),
                      overdue_count=len(overdue),
                      low_parts=low_parts,
                      wos=open_wos)

# ---- Employees
@app.get("/employees", response_class=HTMLResponse)
def employees_page():
    with Session(engine) as s:
        emps = s.exec(select(Employee)).all()
        return render("employees.html", employees=emps)

@app.post("/employees/add")
def employees_add(name: str = Form(...), role: str = Form(...), skills_csv: str = Form(""), tacs_id: str = Form(None)):
    with Session(engine) as s:
        s.add(Employee(name=name, role=role, skills_csv=skills_csv, tacs_id=tacs_id))
        s.commit()
    return RedirectResponse("/employees", 303)

# ---- Assets
@app.get("/assets", response_class=HTMLResponse)
def assets_page():
    with Session(engine) as s:
        assets = s.exec(select(Asset)).all()
        return render("assets.html", assets=assets)

@app.post("/assets/add")
def assets_add(name: str = Form(...), location: str = Form(...), pm_interval_days: int = Form(...), tags_csv: str = Form("")):
    with Session(engine) as s:
        s.add(Asset(name=name, location=location, pm_interval_days=pm_interval_days, tags_csv=tags_csv))
        s.commit()
    return RedirectResponse("/assets", 303)

# ---- Parts
@app.get("/parts", response_class=HTMLResponse)
def parts_page():
    with Session(engine) as s:
        parts = s.exec(select(Part)).all()
        return render("parts.html", parts=parts)

@app.post("/parts/add")
def parts_add(sku: str = Form(...), name: str = Form(...), qty: int = Form(0), min_qty: int = Form(0)):
    with Session(engine) as s:
        s.add(Part(sku=sku, name=name, qty=qty, min_qty=min_qty))
        s.commit()
    return RedirectResponse("/parts", 303)

# ---- Work Orders
@app.get("/workorders", response_class=HTMLResponse)
def workorders_page():
    with Session(engine) as s:
        wos = s.exec(select(WorkOrder)).all()
        assets = s.exec(select(Asset)).all()
        emps = s.exec(select(Employee)).all()
        parts = s.exec(select(Part)).all()
        return render("workorders.html", wos=wos, assets=assets, employees=emps, parts=parts, today=date.today())

@app.post("/workorders/add")
def workorders_add(
    type: str = Form(...),
    asset_id: int = Form(None),
    priority: int = Form(3),
    due_date: str = Form(None),
    notes: str = Form(""),
    emars_ref: str = Form(None),
):
    with Session(engine) as s:
        d = date.fromisoformat(due_date) if due_date else None
        s.add(WorkOrder(type=type, asset_id=asset_id or None, priority=priority, due_date=d, notes=notes, emars_ref=emars_ref))
        s.commit()
    return RedirectResponse("/workorders", 303)

@app.post("/workorders/assign/auto")
def workorders_auto_assign():
    with Session(engine) as s:
        count = auto_assign(s)
    resp = RedirectResponse("/workorders", 303)
    resp.headers["X-Assigned"] = str(count)
    return resp

@app.post("/workorders/generate_pm")
def workorders_generate_pm(range_days: int = Form(30)):
    with Session(engine) as s:
        count = generate_pm(s, range_days=range_days)
    resp = RedirectResponse("/workorders", 303)
    resp.headers["X-PM-Created"] = str(count)
    return resp

@app.post("/workorders/{wo_id}/close")
def workorders_close(wo_id: int, parts_used_json: str = Form("[]")):
    try:
        parts_used = json.loads(parts_used_json or "[]")
    except Exception as e:
        raise HTTPException(400, f"Invalid parts JSON: {e}")
    with Session(engine) as s:
        issues = close_workorder(s, wo_id, parts_used)
    if issues:
        # expose stock issues
        hdr = "; ".join([f"{n}: have {h}, need {need}" for (n,h,need) in issues])
    else:
        hdr = "OK"
    resp = RedirectResponse("/workorders", 303)
    resp.headers["X-Stock-Issues"] = hdr
    return resp

# ---- Reports
@app.get("/reports/daily.csv")
def daily_report():
    with Session(engine) as s:
        wos = s.exec(select(WorkOrder)).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id","type","priority","status","due_date","asset","assigned_to","emars_ref"])
        for w in wos:
            asset = s.get(Asset, w.asset_id) if w.asset_id else None
            emp = s.get(Employee, w.assigned_employee_id) if w.assigned_employee_id else None
            writer.writerow([
                w.id, w.type, w.priority, w.status,
                w.due_date.isoformat() if w.due_date else "",
                asset.name if asset else "",
                emp.name if emp else "",
                w.emars_ref or ""
            ])
        bytes_io = io.BytesIO(output.getvalue().encode("utf-8"))
        return StreamingResponse(bytes_io, media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="daily_report.csv"'})
