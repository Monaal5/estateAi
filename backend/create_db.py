"""Creates the `estate_ai` database (if missing) and all tables. Run: .venv\\Scripts\\python create_db.py"""
import psycopg
from sqlalchemy.engine import make_url

from app.config import DATABASE_URL

url = make_url(DATABASE_URL)
admin = f"host={url.host} port={url.port or 5432} user={url.username} password={url.password} dbname=postgres"
with psycopg.connect(admin, autocommit=True) as conn:
    exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (url.database,)).fetchone()
    if exists:
        print(f"database '{url.database}' already exists")
    else:
        conn.execute(f'CREATE DATABASE "{url.database}"')
        print(f"created database '{url.database}'")

from app.db import init_db, engine  # noqa: E402

init_db()
with engine.connect() as c:
    tables = c.exec_driver_sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1").scalars().all()
print("tables:", tables)
