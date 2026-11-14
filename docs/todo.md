# BUG
* (Risolto) Diagnostica da errore "Errore durante l'audit: Rapporto non disponibile" (risolto errore serializzazione RPC Apps Script su date native e referenze condivise in memoria, esclusi file generici ALTRO dalla deduplicazione semantica e aggiunto recupero fallback intestatario da cartella Drive)

# Automazioni

# UI
* Invece che "Nucleo Familiare #.. Intestatario CF: ..." voglio che i nuclei familiari abbiamo come titolo una bandiera dello stato della nazionalità dell'intestatario, il cognome dell'intestatario e il numero del nucleo (non so ancora se tutto a sinistra o al centro) e colorati in base a se ci sono ancora cose da fare oppure è tutto concluso oppure è ancora da iniziare.
* Nuclei familiari dovrebbero essere visibili come bootstrap accordion che possono essere espansi per vedere più dettagli

# Funzionalità
* (Fatto) Estrarre foto da documenti per usarle nella web app (ritaglio avatar fototessera 256x256 px da bounding box Gemini Flash o webcam/smartphone, salvataggio su Drive e colonna Foto in Beneficiari)
* (Fatto) Migliorare immagini documenti in modo che occupino tutta la schermata, siano in orizzontale e nello stesso file ci sia un solo documento e fronte retro dove possibile (unione client-side Canvas su pagina singola verticale 1024x1312 px ~3:4 con Fronte in alto e Retro in basso)
* Aggiungere tra i documenti scheda di segnalazione, scheda anagrafica, foglio firme intervento individuale, 
* (Fatto) Modalità di debug real-time con intercettore RPC (latenza ms e payload), ispettore stato database in memoria, diagnostica compressione Canvas e IA Gemini Flash, trappola errori globali, benchmark ping server, pulsante esportazione report e toggle ID tecnici (scorciatoia Ctrl+Shift+D, navbar e modale impostazioni)
* (Fatto) Infrastruttura di Testing, CI/CD e Deployment Collaudo: suite unit test offline nativa Node.js v25 (`tests/unit/` per Modelli, Dominio, Validatori, Fuzzy Matching) ultra-rapida (<350ms, zero overhead), loader GAS in Node.js (`tests/loadSrc.js`), pipeline GitHub Actions automatizzate (`.github/workflows/test.yml` e `clasp-push.yml` con pre-test gate e audit sicurezza manifest) e automazione ciclo collaudo (`scripts/deploy.js` `open`/`close`) su deployment fisso con Nucleo di test dedicato #3 (Lorenzo Mazza)
* Permettere un solo intestatario per nucleo
* Dare suggerimenti sul da farsi con IA dopo aver compilato i campi
* Compilare documenti (domanda ERP, cambio residenza...) con IA
* (Fatto) Aggiungere bandierina della nazione nel prefisso e nella nazionalità
* (Fatto) Aggiungere logo "La Bussola dell'Abitare"
* (Fatto) Unificazione modello documenti in `src/Domain/documents.js` (SSOT per nome, categoria, archetipo, icona, hasValue, hasExpiration, regex, scope...)
* (Fatto) Foglio "Documenti" con ID progressivo (1..N), gestione scadenze a semaforo (🔴 🟡 🟢) e fascicolo documentale integrato
* (Fatto) Motore di diagnostica e bonifica Drive (`DriveReconciler.js`): audit anomalie, riordino file dalla radice nucleo alle cartelle membri, naming standard e auto-censimento
* (Fatto) Smart Form-Filling Multi-File con IA (Google Gemini Flash): dropzone multimodale per autocompilazione istantanea di schede anagrafiche e nuclei (CIE, ISEE, TS, PdS), ottimizzazione Canvas client-side, normalizzazione Title Case, eliminazione vecchie caselle di spunta e archiviazione automatica su Google Drive e foglio relazionale "Documenti"
* Aggiungere campi criticità
* Permettere di filtrare nuclei anche in base a nome o cognome oltre a codice fiscale
* Aggiungere icone ai form
* Aggiungere colori per evidenziare problemi o situazioni critiche
* Organizzare form in sezioni: anagrafica, documenti...
* Ampliare incontri con chiamate (con relativa data e durata)
* (Fatto) Aggiungi foto di intestatari e altri componenti prendendola dai documenti (avatar circolare nella scheda nucleo, modale anagrafica e colonna Foto)
* Aggiorna operatori
* (Fatto) Creare funzioni che controllano e fanno check o fanno bulk action
    * (Fatto) Filtrare (sia nello sheet che nella webapp) o mostrare con badge per vari problemi che possono esserci:
        * (Fatto) stato documenti: colonna e badge "Qualità Documento" e "Qualità Documenti" per monitorare conformità grafica, ritagli e unificazione Fronte/Retro con filtri a pillola nella WebApp e formattazione condizionale a 6 regole su Google Sheets
    * (Fatto) Riconciliazione documenti e file system Google Drive con IA
        * (Fatto) Controllare tramite OCR o IA che tipo di documenti sono e che informazioni hanno (Google Gemini Flash multimodale)
        * (Fatto) Dargli il nome corretto secondo le specifiche (`buildDocumentFileName`)
        * (Fatto) Controllare se ci sono documenti doppioni con deduplicazione Two-Tier (metadato nativo md5Checksum da Google Drive REST API v3 senza scaricare byte, badge 'Hash MD5 Identico - Clone 100%', azzeramento falsi positivi e scelta interattiva: cestina, archivia in _Archivio, mantieni)
        * (Fatto) Riconciliare anche i nomi delle cartelle che potrebbero essere sbagliati (inversioni Cognome Nome, nomi mancanti, refusi con fuzzy matching `analyzeFolderName`)
        * (Fatto) Fare in modo che i file vengano spostati nelle cartelle giuste (scope persona in cartella membro, scope nucleo nella radice con `file.moveTo`)
        * (Fatto) Controllare che tutti i documenti siano stati caricati nel foglio "Documenti" (se non ci sono, aggiungerli con campi editabili)
        * (Fatto) Controllare che nel foglio documenti non ci siano righe che si riferiscono a documenti che nel drive non ci sono (cancellazione previa autorizzazione)
        * (Fatto) Riconciliare i dati del beneficiario o del nucleo con le informazioni presenti nei documenti (tabella diff interattiva con valori editabili)
        * (Fatto) Fare in modo che il database sia coerente con Google Drive (esecuzione atomica transazionale del piano approvato)
        * (Fatto) Applicazione granulare delle decisioni (per singolo caso con pulsanti dedicati o per tipologia/categoria) e visualizzazione anteprima dei file (modale in-app con iframe /preview e link diretto Drive /view)
    * (Fatto) organizzazione tutti i documenti (basandoci sul nome o su riconoscimento automatico via IA) nelle rispettive cartelle e con i relativi nomi
    * controllare beneficiari a cui manca qualcosa (documenti non caricati...)
    * fare in modo che documenti e dati caricati manualmente siano considerati
        * creazione dati nuclei familiari, beneficiari
    * creazione incontri da eventi calendar
    * controlli
        * controllare che tutti i file nelle cartelle desiderate (beneficiari, modulistica...) siano presenti nel google sheet
        * rinominare tutti i file secondo gli standard
        * controllare che le cartelle siano organizzate secondo gli standard
        * controllare i dati nei documenti se corrispondono o meno a quelli presenti nel google sheet (in caso contrario proporre correzioni interattivamente)


# Ragionamenti
* (Completato) Unificazione modello nazioni in `src/Domain/country.js` (SSOT per nome stato, cittadinanza, ISO, prefisso telefonico e bandiera)
* (Completato) Unificazione modello documenti in `src/Domain/documents.js` (SSOT per nome, categoria, archetipo, icona, hasValue, hasExpiration, regex, scope...)
* (Completato) Smart Document Intelligence tramite Gemini Flash via Apps Script (UrlFetchApp)
* Sincronizzare dati con google contatti

# Prestazioni
* Ci mette molti secondi a caricare nuclei e beneficiari anche se ora come ora sono solo una ventina. Dovrò fare qualcosa per quando saranno centinaia o migliaia. Probabilmente c'è qualcosa che posso fare lato client o lato database per velocizzare le cose, non so, magari quando i nuclei diventano tanti posso permettere di caricare solo una parte di essi, o di caricarli con una ricerca, ecc... oppure ci sono problemi che rallentano il caricamento

# Dubbi
* Come gestire documenti burocratici del comune. Sia quelli che sono abbinabili univocamente a un beneficiario (scheda di segnalazione, scheda anagrafica beneficiario, foglio firme intervento individuale) sia quelli che non lo sono (diario giornaliero, foglio firme mensile e timesheet)
* Come estrarre e gestire volti beneficiari dai documenti
* In google sheet ho già creato menu "La Bussola dell'abitare" con sottosezioni per ogni campo visibile da tutti i fogli. Va però modificato con le funzioni corrette. Creare anche altri menu visibili dinamicamente che si riferiscono al foglio corrente. Per esempio se il foglio corrente è "Beneficiari" ci sarà un menu "Aggiungi beneficiario", se il foglio corrente è "Nuclei familiari" ci sarà un menu "Aggiungi nucleo familiare", se il foglio corrente è "Documenti" ci sarà un menu "Aggiungi documento" e così via... Le azioni dovrebbero aprire un popup o una sidebar. Le azioni che vorrei fare in beneficiari sono: aggiungi beneficiario (dove è possibile inserire i dati), elimina beneficiario (dovrebbe dare la possibilità di cercarlo almeno per nome, cognome o cf), modifica beneficiario, importa dati beneficiari da Drive (mostrando eventuali discrepanze con dati esistenti prima di importarle), controlla errori (due beneficiari intestatari dello stesso nucleo, beneficiari di nuclei inesistenti, beneficiari con id cartelle inesistenti, due beneficiari con stesso id cartella, dati beneficiario in conflitto tra loro... e permettendo di correggerli uno ad uno o in blocco). Poi vorrei azioni personalizzate anche per i fogli Documenti, Nuclei familiari, Diario, Incontri con operatore e Incontri con Assistente sociale