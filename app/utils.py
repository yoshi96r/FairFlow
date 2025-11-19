from __future__ import annotations
from datetime import date, timedelta
import json
from typing import List, Dict
from sqlmodel import Session, select
from .models import Asset, Employee, WorkOrder, Part

def csv_to_set(csv_text: str) -> set[str]:
    return set([s.strip().lower() for s in csv_text.split(",") if s.strip()])

def generate_pm(session: Session, range_days: int = 30) -> int:
    """Why: central, repeatable PM planner."""
    today = date.today()
    deadline = today + timedelta(days=range_days)
    created = 0
    assets = session.exec(select(Asset)).all()
    for a in assets:
        if a.pm_interval_days <= 0:
            continue
        last = a.last_pm_date or (today - timedelta(days=a.pm_interval_days))
        next_due = last + timedelta(days=a.pm_interval_days)
        if next_due <= deadline:
            wo = WorkOrder(
                type="PM",
                asset_id=a.id,
                priority=3,
                status="Open",
                due_date=next_due,
                notes=f"Auto-generated PM for {a.name} due {next_due.isoformat()}",
            )
            session.add(wo)
            a.last_pm_date = next_due
            created += 1
    session.commit()
    return created

def score_match(emp: Employee, wo: WorkOrder, asset: Asset | None) -> int:
    emp_sk = csv_to_set(emp.skills_csv)
    wo_tags = set()
    if asset:
        wo_tags |= csv_to_set(asset.tags_csv)
    # simple score: size of intersection + bias for role relevance
    score = len(emp_sk & wo_tags)
    if "tech" in emp.role.lower():
        score += 1
    return score

def auto_assign(session: Session, max_open_per_emp: int = 5) -> int:
    """Why: reduce dispatch latency; quick, deterministic matching."""
    unassigned = session.exec(
        select(WorkOrder).where(WorkOrder.status == "Open", WorkOrder.assigned_employee_id == None)
    ).all()
    employees = session.exec(select(Employee).where(Employee.active == True)).all()
    emp_load: Dict[int, int] = {}
    for e in employees:
        if e.id is None:
            # should not happen for persisted employees, but guard for safety
            continue
        open_for_emp = session.exec(
            select(WorkOrder).where(
                WorkOrder.assigned_employee_id == e.id,
                WorkOrder.status != "Done",
            )
        ).all()
        emp_load[e.id] = len(open_for_emp)

    assigned = 0
    for wo in sorted(unassigned, key=lambda w: (w.priority, w.due_date or date.max)):
        asset = session.get(Asset, wo.asset_id) if wo.asset_id else None
        scored = []
        for e in employees:
            if e.id is None:
                continue
            if emp_load.get(e.id, 0) >= max_open_per_emp:
                continue
            scored.append((score_match(e, wo, asset), e))
        scored.sort(key=lambda t: t[0], reverse=True)
        if scored and scored[0][0] > 0:
            chosen = scored[0][1]
            wo.assigned_employee_id = chosen.id
            emp_load[chosen.id] = emp_load.get(chosen.id, 0) + 1
            assigned += 1
    session.commit()
    return assigned

def close_workorder(session: Session, wo_id: int, parts_used: List[Dict[str,int]]):
    """Why: enforce inventory adjustments on closure."""
    wo = session.get(WorkOrder, wo_id)
    if not wo:
        raise ValueError("WO not found")
    stock_issues = []
    for item in parts_used:
        p = session.get(Part, int(item["part_id"]))
        q = int(item["qty"])
        if not p:
            continue
        if p.qty < q:
            stock_issues.append((p.name, p.qty, q))
        p.qty -= q
    wo.parts_used_json = json.dumps(parts_used)
    wo.status = "Done"
    session.commit()
    return stock_issues
