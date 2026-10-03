"""Preserve contacts; add attendee names and durable supervision records."""

from alembic import op
from sqlalchemy import inspect

revision = "0009"
down_revision = "0008"


def upgrade():
    # The historical 0008 migration creates the ORM table at upgrade time.
    # IF NOT EXISTS covers fresh installations as well as existing 0008 databases.
    # Nullable columns preserve all contacts collected before names were requested.
    op.execute("ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS first_name varchar(100)")
    op.execute("ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS last_name varchar(100)")
    for constraint in inspect(op.get_bind()).get_check_constraints("company_records"):
        if "kind" in constraint["sqltext"]:
            op.drop_constraint(constraint["name"], "company_records", type_="check")
    op.create_check_constraint(
        "company_records_kind_check",
        "company_records",
        "kind in ('CRM','PROJECT','BOOKING','QUOTE','FEEDBACK','METRIC','SOURCE',"
        "'SKILL_ASSIGNMENTS','CEO_PACKET','INTELLIGENCE_CHECK','INTELLIGENCE_SIGNAL','INTELLIGENCE_DEPLOYMENT')",
    )


def downgrade():
    raise RuntimeError("Rollback application only; preserve collected registrations")
