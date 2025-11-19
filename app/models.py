from __future__ import annotations
from typing import Optional, List
from datetime import date
from sqlmodel import Field, SQLModel

class Employee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    role: str  # e.g., "Tech", "Electrician", "Mech", "MOS Clerk"
    skills_csv: str = ""  # comma-separated skills
    tacs_id: Optional[str] = None
    active: bool = True

class Asset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    location: str
    pm_interval_days: int = 90
    last_pm_date: Optional[date] = None
    tags_csv: str = ""  # skills/competencies that fit (e.g., "electrical,conveyor")

class Part(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sku: str
    name: str
    qty: int = 0
    min_qty: int = 0

class WorkOrder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str  # "PM" or "Repair"
    asset_id: Optional[int] = Field(default=None, foreign_key="asset.id")
    priority: int = 3  # 1-High, 2-Med, 3-Normal
    status: str = "Open"  # Open, In Progress, Done
    due_date: Optional[date] = None
    assigned_employee_id: Optional[int] = Field(default=None, foreign_key="employee.id")
    parts_used_json: str = "[]"  # list of {"part_id": int, "qty": int}
    notes: str = ""
    emars_ref: Optional[str] = None  # for cross-ref with eMARS if needed
