# Da automatizzare

## Per ogni nuovo beneficiario
Ogni volta che una nuova riga viene aggiunta alla tabella "Beneficiari"
* Se non esiste, creare contatto su google contatti
* Se non esiste, creare cartella drive
## Ad ogni visita
Ogni volta che una nuova riga viene aggiunta alla tabella "Incontri con operatore" o "Incontri con assistente sociale"
* Cartella beneficiario su google drive
  * Se non esiste, crearla
  * Se non ha documenti, chiedere di fare foto o inserirli dal pc e metterli
* Foglio firme individuale
  * Se non esiste foglio firme individuale con stesso mese e anno, stesso operatore e stesso beneficiario, creare foglio firme individuale
  * Aggiungere a foglio firme individuale riga con data, orario, num ore, firma operatore, firma beneficiario e attività svolta
* Diario giornaliero
  * Aggiungere riga con nome e cognome e firma del beneficiario
* Monitoraggio ufficiale
  * Cose fisse: Municipio, Annualità QSFP Operatore, Titolo Progetto, Annualità, CIG, Tipologia,
  * Cose da inserire manualmente: Operatore, Destinatario
  * Cose da calcolare: dati operatore( nome, tipo operatore, qualifica, ruolo), dati destinatario (fattispecie, nome, cf, sesso, cittadinanza, lavoro, età, titolo di studio), data inserimento nel progetto (immagino data prima accoglienza)
* Scheda di segnalazione (se necessaria)
  * Operatore inviante (firma, nome e contatto), dati beneficiario (nome, data di nascita, luogo di nascita, cf, cellulare), bisogno, descrizione, luogo e data
## A inizio giornata
* Creare diario giornaliero con data, ore di inizio e fine lavoro dello sportello, nomi e cognomi degli operatori della giornata, orari, firme e descrizione del lavoro
## A fine giornata
* Aggiungere numero tot persone accolte al diario giornaliero
## A fine mese
* Calcolare totale ore da tutti i fogli firme individuali

## Sanity checks
* Controllare che due orari di ricevimento per lo stesso operatore non si sovrappongano
* Controllare 0 \< (ora fine \- ora inizio) \< 3
* Controllare che orario di ricevimento non sfori orario operatore

---

## 5. Riconciliazione Periodica del File System Drive e Health Check
Il sistema dispone del motore automatico `DriveReconciler.js` per garantire l'allineamento continuo tra Google Drive e Fogli Google:
- **Audit Continuo**: ispezione dei nuclei alla ricerca di file sparsi nella radice nucleo, cartelle di membri mancanti e file non tracciati.
- **Auto-Healing JIT (Just In Time)**: all'apertura della scheda nucleo o su richiesta tramite il pulsante `⚡ Bonifica e Riorganizza Ora`, il sistema crea le sottocartelle dei componenti, sposta i file con `file.moveTo`, li rinomina secondo la convenzione `buildDocumentFileName` e inserisce le righe mancanti nel foglio `Documenti`.
- **Trigger Periodico**: è possibile impostare un trigger a tempo in Apps Script (es. settimanale o mensile) che invoca `DriveReconciler.auditArchive()` notificando eventuali criticità agli operatori.
