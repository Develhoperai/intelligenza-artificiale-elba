"""Portable website preview. Production form processing remains on the protected VPS."""
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent
app = FastAPI(docs_url=None, redoc_url=None)
app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')
templates = Environment(loader=FileSystemLoader(ROOT / 'templates'), autoescape=select_autoescape())
# Preview only: set ANALYTICS_ID=G-XXXXXXX to see the consent banner. Production reads its own setting.
templates.globals['analytics'] = lambda: os.environ.get('ANALYTICS_ID', '')


def context():
    data = json.loads((ROOT / 'content.json').read_text())
    consent = json.loads((ROOT / 'consents.json').read_text())
    return {**data, 'public': True, 'waitlist_enabled': True, 'video_available': True,
            'origin': 'https://intelligenzaartificialeelba.it', 'canonical_path': '',
            'base_path': '/azienda', 'session_minutes': 30,
            'consent_version': consent['CONSENT_VERSION'], 'consent_text': consent['CONSENT_TEXT']}


@app.get('/azienda/privacy', response_class=HTMLResponse)
def privacy():
    return templates.get_template('company-privacy.html').render(**context())


@app.get('/azienda/preferenze', response_class=HTMLResponse)
def preferences():
    return templates.get_template('waitlist-preferences.html').render(**context())


@app.get('/azienda/lista-attesa/token')
@app.post('/azienda/lista-attesa')
@app.post('/azienda/preferenze')
def preview_only():
    return JSONResponse({'detail': 'Anteprima locale: il modulo non raccoglie dati. Il salvataggio e i consensi sono gestiti dal backend di produzione sul VPS.'}, status_code=409)


@app.get('/robots.txt')
def robots():
    return PlainTextResponse('User-agent: *\nDisallow: /\n')


@app.get('/', response_class=HTMLResponse)
@app.get('/azienda', response_class=HTMLResponse)
@app.get('/azienda/{slug}', response_class=HTMLResponse)
def site(slug: str | None = None):
    data = context()
    service = next((s for s in data['site']['services'] if s['slug'] == slug), None) if slug else None
    if slug and not service:
        raise HTTPException(404)
    return templates.get_template('company-site.html').render(**data, service=service)
