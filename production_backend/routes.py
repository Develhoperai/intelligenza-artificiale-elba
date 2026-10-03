def waitlist_origin(request):
    # JSON + explicit same-site Origin. No cookies and no visitor authentication.
    allowed = {
        "https://elba.futuristik.it",
        "https://" + company_directors.FINAL_DOMAIN,
        "https://www." + company_directors.FINAL_DOMAIN,
    }
    if settings().environment != "production":
        allowed.add(str(request.base_url).rstrip("/"))
    if request.headers.get("origin") not in allowed:
        raise PolicyDenied("Invia la richiesta dal modulo del sito")


def waitlist_rate(key, maximum, window=3600):
    with transaction() as session:
        permitted = auth.limit(session, "waitlist:" + key, maximum, window)
    if not permitted:
        raise HTTPException(429, "Troppe richieste. Riprova più tardi o contatta il titolare.")


@app.get("/azienda/lista-attesa/token")
def waitlist_token():
    waitlist_rate("tokens-global", 3000)
    with transaction() as session:
        return waitlist.challenge(session)


@app.post("/azienda/lista-attesa")
def waitlist_signup(body: waitlist.Signup, request: Request):
    waitlist_origin(request)
    waitlist_rate("submit-global", 300)
    waitlist_rate("email:" + auth.token_hash(body.email), 8, 86400)
    with transaction() as session:
        try:
            return waitlist.subscribe(session, body)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc


@app.get("/azienda/preferenze", response_class=HTMLResponse)
def waitlist_preference_page():
    with transaction() as session:
        document, site, _ = public_company(session)
        return templates.get_template("waitlist-preferences.html").render(owner=document["owner"], site=site)


@app.post("/azienda/preferenze")
def waitlist_preference_change(body: waitlist.Preference, request: Request):
    waitlist_origin(request)
    waitlist_rate("preferences-global", 300)
    with transaction() as session:
        return waitlist.preferences(session, body)


@app.get("/api/audience/waitlist/entries")
def founder_waitlist(request: Request):
    with transaction() as session:
        authorized(request, session, roles={"founder"})
        mission = company.current(session)
        if not mission:
            return {
                "counts": {"total": 0, "event_contact": 0, "marketing_email": 0, "marketing_phone": 0},
                "entries": [],
                "message": "La lista d’attesa sarà disponibile dopo l’attivazione dell’azienda. Nessuna iscrizione è stata raccolta.",
            }
        rows = session.scalars(
            select(WaitlistEntry)
            .where(WaitlistEntry.mission_id == mission.id)
            .order_by(WaitlistEntry.created_at.desc())
            .limit(500)
        )
        return {
            "counts": waitlist.aggregate(session, mission),
            "entries": [
                {
                    "id": row.id,
                    "email": row.email,
                    "phone": row.phone,
                    "created_at": row.created_at.isoformat(),
                    "event_contact": row.event_contact,
                    "marketing_email": row.marketing_email,
                    "marketing_phone": row.marketing_phone,
                    "consent_version": row.consent_receipt["version"],
                }
                for row in rows
            ],
            "message": "Richieste reali per il primo incontro gratuito. Data e luogo da confermare; nessun messaggio viene inviato automaticamente.",
        }
