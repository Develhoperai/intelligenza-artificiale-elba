# Istruzioni per chi ritocca il sito

Leggi README.md e osserva l'anteprima prima di modificare. Continua l'esistente: brand e dominio definitivi, formazione B2B gratuita all'Elba, lista d'attesa come ingresso. Non trasformare la homepage in un catalogo di servizi o in un personal brand.

Mantieni la direzione cinematografica della pagina e verifica il risultato desktop/mobile, anche senza animazioni. Mantieni il wordmark e simbolo forniti, CTA HTML, accessibilità e budget di prestazioni. Nessun evento passato, cliente o risultato inventato.

Il backend di produzione rimane nel progetto protetto. Puoi consultare il codice canonico in production_backend, ma un ritocco visuale non deve cambiare i contratti, indebolire l'autenticazione, rendere obbligatorio il marketing o inviare i recapiti ai modelli AI. L'anteprima non salva iscrizioni. Non inserire chiavi, dati degli iscritti, backup o credenziali nel repository.

Consegna un diff verificabile con istruzioni per reintegrare template/asset e controlli eseguiti; non dichiarare un deploy perché hai fatto push a questo repository.

Il titolo della home deve rendere subito evidenti formazione, imprese e Isola d’Elba, e che gratuito è il primo incontro (non l’intera formazione). Non sostituirlo con una metafora del pain. Il modulo include `first_name`, `last_name`, `email`, `phone`; mostra tutti i consensi senza accordioni. I due consensi marketing restano facoltativi e non preselezionati. La sagoma Elba deriva dall’asset geografico verificato: non ridisegnarla a intuito o con AI.

Prima di cambiare l'aspetto leggi `design/DESIGN.md`: colore, tipografia, le tre famiglie di movimento e la scena 3D sono un contratto. La produzione blocca stili e script inline (`style-src 'self'; script-src 'self'`).
