# BUG

# Miglioramenti
* (Fatto) Aggiungere bandierina della nazione nel prefisso e nella nazionalità
* (Fatto) Aggiungere logo "La Bussola dell'Abitare"
* Aggiungere campi criticità
* Permettere di filtrare nuclei anche in base a nome o cognome oltre a codice fiscale
* Aggiungere icone ai form
* Aggiungere colori per evidenziare problemi o situazioni critiche
* Organizzare form in sezioni: anagrafica, documenti...
* Ampliare incontri con chiamate (con relativa data e durata)
* Aggiungi foto di intestatari e altri conponenti prendendola dai documenti
* Aggiorna operatori
* Creare funzioni che controllano e fanno check o fanno bulk action
    * organizzazione tutti i documenti (basandoci sul nome o addirittura su riconoscimento automatico via ocr) nelle rispettive cartelle e con i relativi nomi
    * controllare beneficiari a cui manca qualcosa (documenti non caricati...)
    * fare in modo che documenti e dati caricati manualmente siano considerati
        * creazione dati nuclei familiari, beneficiari
    * creazione incontri da eventi calendar

# Ragionamenti
* (Completato) Unificazione modello nazioni in `src/Domain/country.js` (SSOT per nome stato, cittadinanza, ISO, prefisso telefonico e bandiera)
* Unificazione modello documenti in `src/Domain/documents.js` (SSOT per nome, categoria, archetipo, icona, hasValue, hasExpiration, regex, scope (persona o nucleo)...)
* Modo migliore per caricare file e tramite OCR leggere dati
* Sincronizzare dati con google contatti
