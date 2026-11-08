# Controller di Backend (`src/Controller`)

## 1. Responsabilità Architetturale

Il modulo `src/Controller` agisce da punto di ingresso (API Gateway / Controller) tra il frontend della Web App (`Frontend.html`) e i layer sottostanti di Dominio, Modelli, Repository e Servizi.
In Google Apps Script, l'interazione client-server avviene tramite il protocollo **RPC asincrono** `google.script.run`.

---

## 2. File Presente: `Backend.js`

### Scelta Architetturale Critica: Payload Aggregato `getInitialAppData`
Nelle prime iterazioni dell'applicazione, all'avvio venivano lanciate 6 chiamate RPC parallele (`getFormLookups`, `getOperatorsList`, `getMeetingsList`, `getNucleiObjects`, `getBeneficiariObjects`, `getAppointmentsList`).
In Google Apps Script questo pattern genera gravi colli di bottiglia:
- Le chiamate parallele competono per i lock interni di `SpreadsheetApp`.
- Il rischio di errori `Lock timeout: another process was holding the lock` aumentava esponenzialmente.
- L'interfaccia utente subiva sfarfallii dovuti ai tempi di caricamento eterogenei.

**Soluzione Adottata**: la funzione `getInitialAppData(forceRefresh)` recupera atomicamente **tutti i dati dell'applicazione** (lookups, operatori, incontri, nuclei, beneficiari, appuntamenti e il catalogo documenti) in un'unica esecuzione server-side, restituendo un unico payload completo in un solo round-trip.

---

### Mappa delle Funzioni RPC Esposte

#### 1. Inizializzazione e Lookup
- **`doGet(e)`**: punto di ingresso HTTP per la Web App. Restituisce il template HTML (`Frontend.html`) impostando X-Frame-Options su `ALLOWALL`.
- **`getInitialAppData(forceRefresh)`**: caricamento atomico all'avvio.
- **`getFormLookups(forceRefresh)`**: recupero dei Named Ranges per i menu a tendina.
- **`getOperatorsList()`** e **`getBeneficiariesList()`**: liste per l'autocompletamento rapido.

#### 2. Nuclei Familiari e Beneficiari
- **`submitNucleoCompleto(payload)`**: registrazione atomica protetta da `LockService.getScriptLock()` per la creazione contemporanea di nucleo e intestatario.
- **`submitBeneficiary(data)`**: salvataggio o aggiornamento beneficiario.
- **`removeBeneficiary(cf)`**: cancellazione beneficiario.
- **`getNucleiObjects()`** e **`getBeneficiariObjects()`**: restituzione dei dati in formato POJO per la UI.

#### 3. Incontri e Monitoraggio
- **`submitMeeting(data)`** e **`submitMeetingUpdate(key, data)`**: registrazione e modifica incontri.
- **`getMeetingsList()`**: storico unificato 1° e 2° livello.
- **`addRigaMonitoraggio(data)`**: calcolo età e popolamento automatico del foglio di monitoraggio ufficiale.

#### 4. Fascicolo Documentale e Scadenze
- **`getDocumentiObjects(cf)`**: elenca i documenti censiti (tutti o filtrati per intestatario) con stato scadenze calcolato (🔴 🟡 🟢 ⚪).
- **`submitDocumento(data)`**: registrazione o aggiornamento record nel foglio `Documenti`.
- **`removeDocumento(id)`**: cancellazione record per ID progressivo.

#### 5. Google Drive e Firme Autografe
- **`getNucleoDriveFolder(nucleoId, intestatarioNome)`**: individua o crea la cartella del nucleo.
- **`getBeneficiarioDriveFolder(cf)`**: individua o crea la sottocartella personale del membro.
- **`saveBeneficiarySignature(cf, base64Data)`**: archivia la firma PNG trasparente e sincronizza anagrafica e foglio documenti.
- **`scanBeneficiarioDocuments(cf)`** e **`scanNucleoDocuments(nucleoId)`**: scansione real-time dei file presenti nelle cartelle Drive.

#### 6. Diagnostica e Riconciliazione (Drive Reconciler)
- **`auditNucleoDrive(nucleoId)`**: restituisce il report di conformità (file fuori posto, cartelle assenti, documenti scaduti).
- **`reconcileNucleoDrive(nucleoId, options)`**: esegue la bonifica automatica (creazione cartelle, spostamento `file.moveTo`, ridenominazione standard e censimento).
- **`auditArchive()`**: audit globale di tutti i nuclei.

#### 7. Document Intelligence (Google Gemini Flash)
- **`smartClassifyDocuments(filesPayload)`**: analizza visivamente batch di file con `gemini-3.8-flash` ed estrae dati anagrafici e documentali.
- **`checkGeminiStatus()`**: verifica disponibilità e modello attivo.

#### 8. Diagnostica di Sistema e Benchmark (Modalità Debug)
- **`pingBackend()`**: endpoint diagnostico leggero che calcola la latenza server-side, restituisce l'identità dell'utente autenticato (`Session.getActiveUser().getEmail()`), il fuso orario di Apps Script, il modello IA attivo e la disponibilità della chiave Gemini API. Utilizzato dal benchmark del cassetto di debug nel frontend.
