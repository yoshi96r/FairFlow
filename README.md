# USPS MOS Assistant
Standalone helper for USPS Manager/Maintenance Operations Support style workflows: PM scheduling, dispatch, parts, and daily reports.

## Quick start
```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

Open http://127.0.0.1:8000
```

Notes
•No integration to USPS internal systems (eMARS, TACS, DOIS). Export CSVs and reconcile manually.
•Extend auto_assign scoring for your facility’s skill taxonomy and shifts.
•PM generator is idempotent per interval window by updating last_pm_date on creation.

**Run:** create a folder, drop these files, install requirements, and `uvicorn app.main:app --reload`.

**Sources (for role/context only):** USPS glossary shows **MOS = Manager, Operations Support**; USPS “Maintenance Operations Support” handbook outlines inventory/dispatch/reporting; USPS OIG describes **eMARS** as USPS’s maintenance scheduling/tracking system — this app is a standalone helper that mirrors common MOS workflows without accessing USPS systems.  [oai_citation:1‡USPS](https://about.usps.com/publications/pub32/pub32_acn.htm?utm_source=chatgpt.com)

**a.** Want me to add role-based auth + shift calendar and a smarter assignment engine (skills + shifts + load)?  
**b.** Prefer a one-file Streamlit app instead of FastAPI for quicker deployment on a shared PC?
