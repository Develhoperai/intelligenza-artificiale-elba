# Intelligenza Artificiale Elba

Codice del sito pubblico: https://intelligenzaartificialeelba.it

Brand definitivo: **Intelligenza Artificiale Elba**. Pubblico: titolari e team delle imprese dell'Isola d'Elba. Il percorso da promuovere ora è **il primo evento di formazione gratuito**. La CTA invita alla lista d'attesa con email e telefono. Data e luogo sono in preparazione; la lista non prenota un posto.

## Avviare l'anteprima

Python 3.12 o successivo:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8080 --no-access-log
```

Apri http://127.0.0.1:8080. L'anteprima è completa per homepage, sei pagine secondarie, privacy, video, interazioni e scene 3D. **Il modulo locale non raccoglie dati**: restituisce un messaggio esplicito di anteprima. La produzione usa il backend protetto del VPS e la dashboard privata. Non inoltrare dati di prova al sito reale.

## Dove intervenire

- `templates/company-site.html`: struttura HTML, testi statici e modulo.
- `content.json`: contenuti pubblici approvati che alimentano il template.
- `static/company-site.css`: direzione visiva e responsive.
- `static/company-site.js`: video, pausa, carico di lavoro, interazioni.
- `static/experience-3d.js`: scene 3D continue lungo tutta la homepage.
- `static/vendor/threejs/`: Three.js locale con licenza originale.
- `static/media/`: foto originale, WebP responsive e video ottimizzati.
- `static/brand-assets/`: wordmark e simbolo forniti dal titolare.
- `static/waitlist.js`: invio e gestione errori del modulo.
- `templates/company-privacy.html`, `templates/waitlist-preferences.html`: informativa e gestione consensi.
- `production_backend/`: codice canonico del salvataggio, modello PostgreSQL, migrazione e route reali, esportati dal progetto protetto. Questi file si integrano con transazioni, audit, autenticazione e autorizzazione del progetto principale; non costituiscono un secondo server di produzione.

Il repository permette a un'altra AI di modificare il sito senza accesso alle credenziali, ai contatti raccolti, alla dashboard o alle copie di sicurezza. Per portare le modifiche in produzione, trasferire i template e gli asset nel progetto principale, mantenendo il contratto del modulo e verificando il risultato prima del rilascio. Il push qui **non modifica automaticamente il sito online**.

## Contratto del modulo

`GET /azienda/lista-attesa/token` → token breve e versione consensi.

`POST /azienda/lista-attesa` JSON: `email`, `phone`, `privacy_ack`, `event_contact`, `marketing_email`, `marketing_phone`, `consent_version`, `token`, `website` (honeypot vuoto).

`privacy_ack` e `event_contact` sono richiesti. Marketing email e telefono/SMS sono distinti, facoltativi, inizialmente falsi. Il server normalizza, valida, impedisce duplicati e conserva la ricevuta dei consensi. Un invio ripetuto non aggiorna i consensi di un'altra persona. La risposta contiene un link personale con token nel frammento URL: non finisce nei registri di navigazione. Revoca o cancellazione: `POST /azienda/preferenze` con `token` e `action` (`withdraw_marketing` o `delete`).

I recapiti restano privati; agli agenti arrivano solo conteggi. Nessuna email, telefonata, prenotazione o iscrizione a pagamento viene generata dal modulo. Non cambiare nomi dei campi, consensi o garanzie della privacy per un ritocco grafico.

## Direzione visiva e verifica

Esperienza cinematografica sull'intera pagina: foto formativa e video sottile nella hero, scena di lavoro in 3D, profondità e movimento collegati alla narrazione. Testi e CTA rimangono HTML. Preservare brand e asset forniti, leggibilità, navigazione da tastiera, pausa, `prefers-reduced-motion`, risparmio dati e fallback senza WebGL. Non aggiungere dipendenze remote, analytics, cookie marketing, testimonianze, date o risultati inventati.

Verificare almeno desktop 1440 px, mobile 390 px e 360 px; assenza di overflow ed errori; CTA raggiungibile; caselle marketing non selezionate; video/3D sospesi quando non visibili; preferenze di movimento rispettate. Il calcolo del carico resta nel browser e non promette risparmi.

Gli asset del brand e la fotografia sono forniti dal titolare; il video è una rielaborazione AI e non documenta un evento passato. Conservare le licenze dei componenti di terze parti (Three.js e Archivo).
