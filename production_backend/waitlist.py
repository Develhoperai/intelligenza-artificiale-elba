"""Founder-authorized free-event intake. Personal data never enters agent context."""

import re
import secrets
import unicodedata
from datetime import timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator
from sqlalchemy import select, text

from elba import audit, auth, configuration
from elba.db import now
from elba.models import MemoryCache, WaitlistEntry
from elba.policy import PolicyDenied

CONSENT_VERSION = "free-elba-event-2026-10-03-v1"
CONSENT_TEXT = {
    "event_contact": "Chiedo di entrare nella lista d’attesa del primo incontro gratuito all’Elba e acconsento a essere ricontattato via email o telefono per data, luogo e iscrizione a questo evento.",
    "marketing_email": "Acconsento a ricevere via email novità, inviti ad altri incontri e comunicazioni promozionali di Intelligenza Artificiale Elba. Facoltativo, revocabile in ogni momento.",
    "marketing_phone": "Acconsento a ricevere telefonate e SMS con novità, inviti ad altri incontri e comunicazioni promozionali di Intelligenza Artificiale Elba. Facoltativo, revocabile in ogni momento.",
}
MESSAGE = "Richiesta ricevuta. Se i recapiti non erano già presenti, sei nella lista d’attesa. Ti ricontatteremo per il primo incontro gratuito quando data e luogo saranno confermati. Non è una prenotazione di un posto."


class Signup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=254)
    phone: str = Field(min_length=8, max_length=40)
    privacy_ack: StrictBool
    event_contact: StrictBool
    marketing_email: StrictBool = False
    marketing_phone: StrictBool = False
    consent_version: str = Field(max_length=60)
    token: str = Field(min_length=32, max_length=100)
    website: str = Field(default="", max_length=200)

    @field_validator("first_name", "last_name")
    @classmethod
    def valid_name(cls, value):
        # Preserve international names, accents and apostrophes. Reject invisible
        # controls before normalizing ordinary spaces; names never enter AI context.
        if any(unicodedata.category(char).startswith("C") for char in value):
            raise ValueError("Inserisci nome e cognome senza caratteri di controllo")
        value = unicodedata.normalize("NFC", " ".join(value.split()))
        if not value or not any(char.isalpha() for char in value):
            raise ValueError("Inserisci nome e cognome")
        return value

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        value = value.strip().lower()
        if (
            not re.fullmatch(
                r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+",
                value,
            )
            or ".." in value
            or len(value.split("@")[0]) > 64
        ):
            raise ValueError("Inserisci un indirizzo email valido")
        return value

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value):
        value = re.sub(r"[\s().-]", "", value)
        if value.startswith("00"):
            value = "+" + value[2:]
        if not value.startswith("+"):
            value = "+39" + value
        if not re.fullmatch(r"\+[1-9][0-9]{7,14}", value):
            raise ValueError("Inserisci un telefono valido, con prefisso internazionale se non italiano")
        return value


class Preference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=32, max_length=100)
    action: Literal["withdraw_marketing", "delete"]


def enabled(session):
    policy = configuration.active(session, "company_publication")
    return policy if policy and policy.document.get("waitlist", {}).get("enabled") else None


def challenge(session):
    if not enabled(session):
        raise PolicyDenied("La lista d’attesa non è ancora aperta")
    token = secrets.token_urlsafe(32)
    session.add(
        MemoryCache(
            cache_key="waitlist:" + auth.token_hash(token)[:55],
            result={},
            expires_at=now() + timedelta(minutes=20),
        )
    )
    return {"token": token, "consent_version": CONSENT_VERSION}


def subscribe(session, body):
    policy = enabled(session)
    if not policy:
        raise PolicyDenied("La lista d’attesa non è ancora aperta")
    if not body.privacy_ack or not body.event_contact:
        raise ValueError("Leggi l’informativa e autorizza il ricontatto per il primo evento")
    if body.consent_version != CONSENT_VERSION:
        raise ValueError("L’informativa è cambiata: ricarica la pagina prima di iscriverti")
    token_key = "waitlist:" + auth.token_hash(body.token)[:55]
    session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": token_key})
    nonce = session.scalar(select(MemoryCache).where(MemoryCache.cache_key == token_key).with_for_update())
    if not nonce or nonce.expires_at <= now():
        raise ValueError("La sessione del modulo è scaduta: riprova l’invio")
    if nonce.result.get("reply"):
        return nonce.result["reply"]  # A network retry cannot create another signup.
    preference_token = secrets.token_urlsafe(32)
    reply = {"message": MESSAGE, "preference_url": "/azienda/preferenze#" + preference_token}
    session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": "waitlist-email:" + body.email}
    )
    old = session.scalar(select(WaitlistEntry).where(WaitlistEntry.email == body.email))
    if not old and not body.website:
        timestamp = now()
        receipt = {
            "version": CONSENT_VERSION,
            "text": CONSENT_TEXT,
            "text_sha256": audit.digest(CONSENT_TEXT),
            "at": timestamp.isoformat(),
            "privacy_ack": True,
            "event_contact": True,
            "marketing_email": body.marketing_email,
            "marketing_phone": body.marketing_phone,
            "source": policy.document["origin"],
            "history": [],
        }
        entry = WaitlistEntry(
            mission_id=policy.document["mission_ref"],
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            phone=body.phone,
            preference_hash=auth.token_hash(preference_token),
            event_contact=True,
            marketing_email=body.marketing_email,
            marketing_phone=body.marketing_phone,
            consent_receipt=receipt,
            event_expires_at=timestamp + timedelta(days=180),
            marketing_expires_at=timestamp + timedelta(days=730),
        )
        session.add(entry)
        session.flush()
        audit.record(
            session,
            "public-waitlist",
            "WAITLIST_SIGNUP",
            entry.id,
            "Free event contact requested; separate marketing choices stored; no personal data in audit or AI context",
        )
    # Duplicate or honeypot: identical response, no consent/contact overwrite.
    nonce.result = {"reply": reply}
    return reply


def preferences(session, body):
    entry = session.scalar(
        select(WaitlistEntry)
        .where(WaitlistEntry.preference_hash == auth.token_hash(body.token))
        .with_for_update()
    )
    if entry:
        if body.action == "delete":
            reference = entry.id
            session.delete(entry)
            audit.record(
                session,
                "waitlist-preference",
                "WAITLIST_DELETED",
                reference,
                "Contact data and consent receipt deleted; inactive encrypted backups expire by rotation",
            )
        else:
            entry.marketing_email = entry.marketing_phone = False
            entry.version += 1
            receipt = entry.consent_receipt
            entry.consent_receipt = {
                **receipt,
                "history": receipt.get("history", [])
                + [{"at": now().isoformat(), "action": "withdraw_marketing"}],
            }
            audit.record(
                session,
                "waitlist-preference",
                "WAITLIST_MARKETING_WITHDRAWN",
                entry.id,
                "Both marketing channels revoked; event request preserved",
            )
    return {
        "message": "Richiesta elaborata. Se il link era valido, le preferenze sono state aggiornate. Per assistenza puoi contattare il titolare."
    }


def aggregate(session, mission):
    row = (
        session.execute(text("SELECT * FROM waitlist_counts(:mission)"), {"mission": mission.id})
        .mappings()
        .one()
    )
    return dict(row)


def purge(session):
    timestamp = now()
    for cache in session.scalars(
        select(MemoryCache).where(
            MemoryCache.cache_key.like("waitlist:%"), MemoryCache.expires_at <= timestamp
        )
    ):
        session.delete(cache)
    for row in session.scalars(
        select(WaitlistEntry).where(
            (WaitlistEntry.event_expires_at <= timestamp) | (WaitlistEntry.marketing_expires_at <= timestamp)
        )
    ):
        if row.event_expires_at <= timestamp:
            row.event_contact = False
        if row.marketing_expires_at <= timestamp:
            row.marketing_email = row.marketing_phone = False
        if not (row.event_contact or row.marketing_email or row.marketing_phone):
            reference = row.id
            session.delete(row)
            audit.record(
                session,
                "waitlist-retention",
                "WAITLIST_EXPIRED",
                reference,
                "Expired waitlist contact and consent receipt removed",
            )
