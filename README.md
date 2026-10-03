# Intelligenza Artificiale Elba

Codice del sito pubblico: https://intelligenzaartificialeelba.it

Brand definitivo: **Intelligenza Artificiale Elba**. Pubblico: titolari e team delle imprese dell'Isola d'Elba. Il percorso da promuovere ora è **la formazione AI per le imprese dell'Elba, con il primo incontro gratuito**: gratuito è il primo incontro, non tutta la formazione. La CTA invita alla lista d'attesa con nome, cognome, email e telefono. Data e luogo sono in preparazione; la lista non prenota un posto.

## Avviare l'anteprima

Python 3.12 o successivo:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8080 --no-access-log
```

Apri http://127.0.0.1:8080. L'anteprima è completa per homepage, sei pagine secondarie, privacy, video, interazioni e scene 3D. **Il modulo locale non raccoglie dati**: restituisce un messaggio esplicito di anteprima. La produzione usa il backend protetto del VPS e la dashboard privata. Non inoltrare dati di prova al sito reale.

## Dove intervenire

- `templates/company-site.html`: struttura HTML, testi della homepage e modulo.
- `content.json`: contenuti delle sei pagine progetto e dati del titolare.
- `static/company-site.css`: direzione visiva, layout e responsive. Tutte le regole di movimento stanno sotto `.motion`.
- `static/company-site.js`: regia dello scroll (un solo ciclo `requestAnimationFrame`), comparsa dei testi, video, pausa.
- `static/experience-3d.js`: la scena 3D unica. I fogli di lavoro sparsi si ricompongono nella sagoma dell’Elba.
- `static/elba-outline.svg`, `static/elba-outline-source.json`: sagoma reale dell’Elba da dati ISTAT / geojson-italy, licenza CC BY 4.0 con provenienza e hash. La scena 3D legge il tracciato da questo file.
- `static/vendor/threejs/`: Three.js locale con licenza originale.
- `static/archivo-variable.woff2`: Archivo variabile (assi peso e larghezza), licenza OFL in `static/archivo-LICENSE.txt`.
- `static/media/`: foto originale, WebP responsive e video ottimizzati.
- `static/brand-assets/`: wordmark e simbolo forniti dal titolare.
- `static/waitlist.js`: invio e gestione errori del modulo.
- `templates/company-privacy.html`, `templates/waitlist-preferences.html`: informativa e gestione consensi.
- `design/DESIGN.md`: il contratto di stile. Leggilo prima di aggiungere o cambiare una sezione.
- `production_backend/`: codice canonico del salvataggio, modello PostgreSQL, migrazioni 0008/0009 e route reali, esportati dal progetto protetto. Questi file si integrano con transazioni, audit, autenticazione e autorizzazione del progetto principale; non costituiscono un secondo server di produzione.

Il repository permette a un'altra AI di modificare il sito senza accesso alle credenziali, ai contatti raccolti, alla dashboard o alle copie di sicurezza. Per portare le modifiche in produzione, trasferire i template e gli asset nel progetto principale, mantenendo il contratto del modulo e verificando il risultato prima del rilascio. Il push qui **non modifica automaticamente il sito online**.

La produzione applica `Content-Security-Policy: script-src 'self'; style-src 'self'`: niente `<style>`, attributi `style` o script inline nei template. Gli stili dinamici passano da JavaScript (`element.style`).

## Contratto del modulo

`GET /azienda/lista-attesa/token` → token breve e versione consensi.

`POST /azienda/lista-attesa` JSON: `first_name`, `last_name`, `email`, `phone`, `privacy_ack`, `event_contact`, `marketing_email`, `marketing_phone`, `consent_version`, `token`, `website` (honeypot vuoto).

`privacy_ack` e `event_contact` sono richiesti. Marketing email e telefono/SMS sono distinti, facoltativi, visibili subito e inizialmente falsi. Il server normalizza, valida, impedisce duplicati e conserva la ricevuta dei consensi. Un invio ripetuto non aggiorna i consensi di un'altra persona. La risposta contiene un link personale con token nel frammento URL: non finisce nei registri di navigazione. Revoca o cancellazione: `POST /azienda/preferenze` con `token` e `action` (`withdraw_marketing` o `delete`).

I recapiti restano privati; agli agenti arrivano solo conteggi. Nessuna email, telefonata, prenotazione o iscrizione a pagamento viene generata dal modulo. Non cambiare nomi dei campi, consensi o garanzie della privacy per un ritocco grafico.

## Direzione visiva e verifica

La pagina è un film in cinque scene guidato dallo scroll: il video dell’aula a tutto schermo, che si ritira in una cornice; una tempesta di fogli di lavoro in 3D; i fogli che atterrano e compongono l’Isola d’Elba mentre scorrono i tre passi dell’incontro; un foglio chiaro con ciò che viene dopo e le domande; l’isola a riposo accanto al modulo. Testi e CTA rimangono HTML. Senza JavaScript, con `prefers-reduced-motion`, con risparmio dati o senza WebGL la pagina è un documento normale e completo, con la sagoma statica al posto della scena.

Preservare brand e asset forniti, leggibilità, navigazione da tastiera e i fallback. Non aggiungere dipendenze remote, analytics, cookie marketing, testimonianze, date o risultati inventati.

Verificare almeno desktop 1440 px e mobile 390 px: assenza di overflow orizzontale ed errori in console; CTA raggiungibile; caselle marketing non selezionate; versione con movimento ridotto leggibile dall’inizio alla fine.

Gli asset del brand e la fotografia sono forniti dal titolare; il video è una rielaborazione AI e non documenta un evento passato. Conservare le licenze dei componenti di terze parti (Three.js e Archivo).

## Revisione cinematografica del 3 ottobre 2026

Homepage, pagine progetto, CSS e JavaScript sono stati riscritti. Restano il video e la foto della hero, il wordmark, i testi approvati, il contratto del modulo e la sagoma geografica verificata. Sono stati tolti il calcolatore del carico di lavoro (con la relativa frase nell’informativa) e le tre scene 3D precedenti. La versione degli asset nei template è `cine4`.

Su richiesta del titolare il titolo è **Formazione AI per le imprese dell’Elba.** seguito da **Il primo incontro è gratuito.**, perché non si legga che ogni percorso è gratuito. La sezione «Per ogni impresa dell’isola» dichiara che l’incontro è per tutti i settori. Il blocco «Hai un’urgenza?» prepara un messaggio e lo apre nell’app WhatsApp del visitatore verso il numero del titolare: il sito non riceve né salva quel testo, e l’informativa lo dice. La sezione «Dopo l’incontro» presenta i due sbocchi, altra formazione e consulenza in azienda, senza prezzi né risultati promessi; i sei esempi di progetto restano in `content.json`.

La sagoma geografica deriva dal poligono dell’Elba nei confini ISTAT distribuiti da [geojson-italy](https://github.com/guglielmo/geojson-italy), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); l’attribuzione è visibile accanto al modulo. I vecchi iscritti restano validi grazie alla migrazione additiva 0009.

## Revisione legale del 3 ottobre 2026

Il pulsante di pausa delle animazioni è stato tolto su richiesta del titolare; resta il rispetto di `prefers-reduced-motion`. La casella del ricontatto per l'evento è preselezionata; l'informativa va spuntata a mano; le due caselle marketing restano facoltative e non preselezionate, perché una casella già spuntata non è un consenso valido (GDPR, considerando 32).

L'informativa ha una sezione «Cookie e statistiche». `static/consent.js` e il riquadro di consenso compaiono solo se la produzione ha un ID Google Analytics 4 configurato (`ELBA_ANALYTICS_ID`): prima del consenso nessuna richiesta parte verso Google. Senza ID il sito non ha riquadro, cookie o terze parti. In anteprima: `ANALYTICS_ID=G-XXXXXXX` prima di avviare `server.py`. La versione degli asset è `cine4`.
