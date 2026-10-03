"""Private waitlist with versioned, separate consent and deletion rights."""

from alembic import op

from elba.models import WaitlistEntry

revision = "0008"
down_revision = "0007"


def upgrade():
    bind = op.get_bind()
    WaitlistEntry.__table__.create(bind)
    schema = bind.exec_driver_sql("SELECT current_schema()").scalar_one()
    quoted = bind.dialect.identifier_preparer.quote_schema(schema)
    bind.exec_driver_sql(  # noqa: S608 -- migration-owned schema is quoted as an SQL identifier
        f"""CREATE FUNCTION {quoted}.waitlist_counts(mission text)  -- schema safely quoted
      RETURNS TABLE(total bigint, event_contact bigint, marketing_email bigint, marketing_phone bigint)
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
      AS $$ SELECT count(*), count(*) FILTER (WHERE event_contact),
        count(*) FILTER (WHERE marketing_email), count(*) FILTER (WHERE marketing_phone)
        FROM {quoted}.waitlist_entries WHERE mission_id = mission $$"""  # noqa: S608 -- quoted migration schema, never visitor input
    )
    bind.exec_driver_sql(f"REVOKE ALL ON FUNCTION {quoted}.waitlist_counts(text) FROM PUBLIC")


def downgrade():
    raise RuntimeError("Rollback application only; preserve collected registrations")
