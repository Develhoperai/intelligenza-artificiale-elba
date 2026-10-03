# Contratto di stile

Leggi questo file prima di cambiare o aggiungere una sezione. Una modifica che lo ignora è una regressione anche se da sola sembra bella.

## L’idea

Il lavoro di ogni giorno è una tempesta di fogli. Durante lo scroll i fogli atterrano e compongono l’Isola d’Elba. È l’unico momento spettacolare della pagina: tutto il resto lo prepara o lo lascia respirare.

## Colore

Una sola tinta, l’azzurro elettrico del wordmark, su blu notte del Tirreno. Un unico foglio chiaro interrompe il buio.

| Ruolo | Valore |
|---|---|
| Mare (fondo) | `oklch(0.19 0.058 256)`, in sRGB `rgb(8, 26, 50)`. La scena 3D usa lo stesso valore in `SEA` |
| Testo su mare | `oklch(0.96 0.012 240)`, attenuato `oklch(0.82 0.035 245)` |
| Azzurro del marchio | `oklch(0.8 0.135 232)`: pulsanti, etichette, fogli accesi, orbita |
| Foglio chiaro | `oklch(0.966 0.011 242)`, inchiostro `oklch(0.21 0.06 257)` |

Niente secondo colore d’accento, niente testo sfumato, niente crema.

## Tipografia

Solo Archivo variabile. Titoli: larghezza 125%, peso 800, interlinea 0.98. Sottotitoli: larghezza 112%, peso 700. Testo: larghezza normale. La larghezza estesa richiama le lettere del wordmark.

## Movimento

Tre famiglie, non di più:

1. Scene fissate e guidate dallo scroll: la cornice del video che si ritira, la scena 3D.
2. Titoli che salgono parola per parola da una maschera.
3. Testi che si assestano e filetti che si disegnano.

Regole: si animano solo `transform` e `opacity`; ingresso e uscita in ease-out; nessun listener di scroll, un solo ciclo `requestAnimationFrame` in `company-site.js` che guida anche il 3D; gli hover stanno dentro `@media (hover:hover) and (pointer:fine)`. Tutto il movimento vive sotto la classe `.motion`, che JavaScript aggiunge solo se il visitatore non ha chiesto movimento ridotto.

## Scena 3D

Un solo contesto WebGL, un canvas fisso dietro la pagina. I fogli sono istanze di un piano con shader proprio; le posizioni finali vengono dal tracciato di `elba-outline.svg`. Non ridisegnare la sagoma e non aggiungere rilievi geografici inventati. L’orbita attorno all’isola riprende l’anello del simbolo.

## Aperture delle sezioni

Le sezioni non si aprono mai due volte allo stesso modo: etichetta solo nella hero e nel picco, titolo nudo nella tempesta, cambio di fondo per il foglio chiaro, colonna laterale per le domande.

## Da non fare

Un secondo marquee (ce n’è già uno, i settori), griglie di card identiche, vetro smerigliato decorativo, numeri dove non c’è una sequenza, un secondo effetto spettacolare, stili o script inline (la produzione li blocca), date, clienti o risultati inventati.
