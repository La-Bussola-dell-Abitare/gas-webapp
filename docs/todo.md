# BUG

# Miglioramenti
* (Fatto) Aggiungere bandierina della nazione nel prefisso e nella nazionalità
* (Fatto) Aggiungere logo "La Bussola dell'Abitare"
* (Fatto) Unificazione modello documenti in `src/Domain/documents.js` (SSOT per nome, categoria, archetipo, icona, hasValue, hasExpiration, regex, scope...)
* (Fatto) Foglio "Documenti" con ID progressivo (1..N), gestione scadenze a semaforo (🔴 🟡 🟢) e fascicolo documentale integrato
* (Fatto) Motore di diagnostica e bonifica Drive (`DriveReconciler.js`): audit anomalie, riordino file dalla radice nucleo alle cartelle membri, naming standard e auto-censimento
* (Fatto) Smart Form-Filling con IA (Google Gemini Flash): dropzone multimodale per autocompilazione istantanea della scheda anagrafica e del documento
* Aggiungere campi criticità
* Permettere di filtrare nuclei anche in base a nome o cognome oltre a codice fiscale
* Aggiungere icone ai form
* Aggiungere colori per evidenziare problemi o situazioni critiche
* Organizzare form in sezioni: anagrafica, documenti...
* Ampliare incontri con chiamate (con relativa data e durata)
* Aggiungi foto di intestatari e altri conponenti prendendola dai documenti
* Aggiorna operatori
* Creare funzioni che controllano e fanno check o fanno bulk action
    * (Fatto) organizzazione tutti i documenti (basandoci sul nome o su riconoscimento automatico via IA) nelle rispettive cartelle e con i relativi nomi
    * controllare beneficiari a cui manca qualcosa (documenti non caricati...)
    * fare in modo che documenti e dati caricati manualmente siano considerati
        * creazione dati nuclei familiari, beneficiari
    * creazione incontri da eventi calendar

# Ragionamenti
* (Completato) Unificazione modello nazioni in `src/Domain/country.js` (SSOT per nome stato, cittadinanza, ISO, prefisso telefonico e bandiera)
* (Completato) Unificazione modello documenti in `src/Domain/documents.js` (SSOT per nome, categoria, archetipo, icona, hasValue, hasExpiration, regex, scope...)
* (Completato) Smart Document Intelligence tramite Gemini Flash via Apps Script (UrlFetchApp)
* Sincronizzare dati con google contatti
