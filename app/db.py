from sqlmodel import SQLModel, create_engine
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "mos.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)
