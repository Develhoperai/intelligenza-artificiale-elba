class WaitlistEntry(Record, Base):
    __tablename__ = "waitlist_entries"
    mission_id: Mapped[str] = mapped_column(ForeignKey("missions.id"), index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    phone: Mapped[str] = mapped_column(String(16))
    preference_hash: Mapped[str] = mapped_column(String(64), unique=True)
    event_contact: Mapped[bool] = mapped_column(Boolean, default=True)
    marketing_email: Mapped[bool] = mapped_column(Boolean, default=False)
    marketing_phone: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_receipt: Mapped[dict] = mapped_column(JSONB)
    event_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    marketing_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
