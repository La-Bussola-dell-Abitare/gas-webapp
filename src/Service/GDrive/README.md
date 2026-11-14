# Servizio Google Drive & Riconciliazione File System (`src/Service/GDrive`)

## 1. Responsabilità Architetturale

La cartella [`src/Service/GDrive`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/GDrive) governa l'alberatura, la catalogazione, l'archiviazione e la bonifica automatica e assistita da intelligenza artificiale dei file e delle cartelle su Google Drive.

### Struttura dell'Alberatura Ufficiale su Google Drive:
Tutti i file risiedono all'interno della cartella radice configurata in `CONFIG.FOLDER_BENEFICIARI_ROOT_ID`:

```text
📁 Cartella Radice Beneficiari (CONFIG.FOLDER_BENEFICIARI_ROOT_ID)
│
├── 📁 12 - Mario Rossi (Cartella Nucleo Familiare #12: "<ID> - <Nome Cognome Intestatario>")
│   ├── 📄 Attestazione ISEE (2026) - Famiglia Rossi.pdf (Scope Nucleo)
│   ├── 📄 Contratto di Locazione (2024) - Nucleo #12.pdf (Scope Nucleo)
│   │
│   ├── 📁 Mario Rossi (Sottocartella Personale Intestatario: "<Nome Cognome>")
│   │   ├── 🖼️ Firma Autografa - Mario Rossi.png
│   │   ├── 📄 Carta d'Identità (scad. 2034) - Mario Rossi.pdf
│   │   └── 📄 Patente di Guida (scad. 2030) - Mario Rossi.pdf
│   │
│   ├── 📁 Giulia Bianchi (Sottocartella Personale Coniuge: "<Nome Cognome>")
│   │   ├── 📄 Carta d'Identità (scad. 2031) - Giulia Bianchi.pdf
│   │   └── 📄 Permesso di Soggiorno (scad. 2027) - Giulia Bianchi.pdf
│   │
│   └── 📁 _Archivio (Sottocartella opzionale per file duplicati o dismessi)
│
└── 📁 105 - Ahmed Ben Ali (Cartella Nucleo Familiare #105)
    └── ...
```

---

## 2. File del Modulo

### 2.1 `DriveManager.js` — Gestione Operativa di Cartelle, Firme e Documenti
- **`getOrCreateNucleoFolder(nucleoId, intestatarioNome)`**: Fast-path O(1) con cache `idCartella` nel foglio *Nuclei Familiari*, fallback di ricerca con regex tollerante (`^\s*<id>([\s\-–—]|$)`), e fallback di creazione `[id] - [Nome Cognome]`.
- **`getOrCreateBeneficiarioFolder(cf, fallbackNucleoId, fallbackNome)`**: Individua o crea la sottocartella personale `<Nome Cognome>` all'interno della cartella del nucleo, aggiornando la colonna `idCartella` in *Beneficiari*.
- **`saveBeneficiarySignature(cf, base64Data)`**: Decodifica il canvas PNG trasparente, archivia `Firma <Nome> <Cognome>.png`, elimina firme obsolete e registra il record nel foglio *Documenti* (archetipo `UNICO`).
- **`saveDocumentFile(cf, docPayload, nucleoId)`**: Archivia il file caricato rispettando lo scope (`persona` nella cartella personale, `nucleo` nella radice del nucleo), applica `buildDocumentFileName`, scrive nel foglio relazionale *Documenti* e chiama `SpreadsheetApp.flush()`.
- **`scanBeneficiarioDocuments(cf)`** e **`scanNucleoDocuments(nucleoId)`**: Scansione in tempo reale e arricchimento con metadati di dominio SSOT.

### 2.2 `DriveReconciler.js` — Motore di Diagnostica Avanzata e Riconciliazione IA
- **`getDriveFileMetadata(fileId, cache)`**:
  Recupera in modo mirato e ultraleggero i metadati di un file da Google Drive REST API v3 (`id`, `name`, `size`, `md5Checksum`, `mimeType`) utilizzando `UrlFetchApp` con token OAuth nativo (`ScriptApp.getOAuthToken()`). Non scarica alcun byte del file dal cloud e memorizza i risultati in una cache in memoria per la durata dell'audit.
- **`auditNucleo(nucleoId, options)`**:
  Esegue la scansione completa della cartella radice e delle sottocartelle dei componenti del nucleo, incrociando i file con il foglio *Documenti* e l'anagrafica. Rileva:
  1. `FOLDER_NAME_MISMATCH`: cartelle con nominativi invertiti (`Rossi Mario`), refusi o nomi parziali (`analyzeFolderName`).
  2. `MISSING_MEMBER_FOLDER`: componenti censiti privi di sottocartella personale.
  3. `MISPLACED_FILE`: documenti personali archiviati nella radice nucleo o nella cartella di un altro componente, o documenti di nucleo archiviati dentro la cartella di un singolo membro.
  4. `NON_STANDARD_FILENAME`: file con nomi non conformi alla convenzione ufficiale [`buildDocumentFileName`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/documents.js).
  5. `DUPLICATE_FILE`: duplicati con architettura Two-Tier (`EXACT_HASH` con verifica matematica MD5, `EXACT` per file privi di checksum come i Google Docs nativi, e duplicati semantici per stesso documento/anno per lo stesso soggetto).
  6. `UNTRACKED_FILE`: file presenti su Drive ma assenti nel foglio *Documenti*.
  7. `ORPHAN_SHEET_ROW`: righe nel foglio *Documenti* con ID Drive non più esistente o cestinato su Drive.
  8. `ANAGRAFICA_DIFF`: discrepanze tra i dati anagrafici nei fogli e quelli estratti dal contenuto del documento tramite Google Gemini Flash.
  9. `EXPIRED_DOCUMENT`: documenti scaduti o in scadenza entro 60 giorni.
- **`inspectFileWithAI(fileId)`**: Ispezione OCR e semantica on-demand di un singolo file Drive tramite Google Gemini Flash multimodale ([`DocumentIntelligence.js`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Document/DocumentIntelligence.js)).
- **`executeApprovedPlan(nucleoId, approvedPlan)`**:
  Esecuzione transazionale delle sole azioni approvate o personalizzate dall'operatore nella modale interattiva (creazione cartelle, ridenominazioni, spostamenti con `file.moveTo`, cestinamento duplicati, inserimento documenti e aggiornamento anagrafico).
- **`reconcileNucleo(nucleoId, options)`**: Wrapper di retrocompatibilità che esegue l'audit rapido e applica le bonifiche standard o il piano approvato.
- **`auditArchive()`**: Scansione sintetica globale su tutti i nuclei censiti.

### 2.3 `DriveDiscoveryService.js` — Motore di Discovery e Importazione Fascicoli da Drive (Drive &rarr; Sheets)
Implementa la logica inversa di scoperta da Google Drive verso i fogli di calcolo:
- **`getUncatalogedDriveNuclei(options)`**: Scansiona la cartella radice [`CONFIG.FOLDER_BENEFICIARI_ROOT_ID`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Utils/Config.js), ignora le cartelle di servizio (`_Archivio`, `_Template`, cestinate) e confronta ciascuna cartella con i record di *Nuclei Familiari* e *Beneficiari*. Per ogni cartella non ancora catalogata:
  - Estrae l'ID nucleo se presente nel nome (es. `12 - Mario Rossi`) o calcola il prossimo progressivo libero.
  - Rileva l'intestatario dal nome cartella.
  - Esplora le sottocartelle mappando ciascun componente della famiglia.
  - Rileva i documenti presenti nella radice e nelle sottocartelle, estraendo opzionalmente i dati anagrafici con Gemini Flash OCR.
- **`importNuclei(approvedList)`**: Esecuzione atomica transazionale (protetta da `LockService.getScriptLock`):
  - Inserisce la riga nel foglio *Nuclei Familiari* collegando l'`idCartella`.
  - Inserisce le righe nel foglio *Beneficiari* per intestatario e componenti.
  - Inserisce tutti i file nel foglio *Documenti* collegando l'`idDrive`.
  - Normalizza facoltativamente la cartella su Google Drive nel formato canonico `<ID> - <Nome Intestatario>`.

---

## 3. Scelte Architetturali Adottate

1. **Workflow a Due Fasi (Audit $\rightarrow$ Approvazione Selettiva $\rightarrow$ Esecuzione Atomica)**:
   Invece di eseguire modifiche distruttive immediate o script "ciechi", il sistema calcola prima un report diagnostico esaustivo (`auditNucleo`), lo presenta in una dashboard interattiva a 4 schede, e invia al backend solo il piano di modifiche esplicitamente marcate dall'utente (`executeApprovedPlan`).
2. **Architettura Ibrida Fast Audit + Deep AI Scan On-Demand**:
   La scansione ordinaria è istantanea perché basata sui metadati di Drive e sulle regex di dominio (`findDocumentType`), senza consumo di quota né rischi di timeout. Quando l'operatore attiva lo switch *"Analisi IA Gemini Flash"* o clicca *"IA"* su un singolo file, viene invocata l'API multimodale di Gemini Flash per estrarre con certezza dati anagrafici e scadenze.
3. **Fuzzy Matching e Token-Set Analysis (`analyzeFolderName`)**:
   L'analisi delle cartelle utilizza una combinazione di token matching e distanza di Levenshtein normalizzata (`calculateStringSimilarity`), distinguendo con precisione le inversioni (`INVERTED`), i refusi di battitura (`TYPO`) e i nomi parziali (`PARTIAL`).
4. **Deduplicazione Ibrida Two-Tier con Hash MD5 Nativo da Google Drive API**:
   La deduplicazione combina velocità O(N) e rigore crittografico:
   - **Tier 1 (Memoria / Zero I/O extra)**: raggruppamento per dimensione in byte tramite `file.getSize()`. I file con dimensioni univoche vengono scartati all'istante senza alcuna richiesta HTTP.
   - **Tier 2 (Drive REST API v3 mirata)**: per i soli gruppi di file con identico byte size, viene invocato `DriveReconciler.getDriveFileMetadata` per estrarre il metadato nativo `md5Checksum`.
   - Se gli MD5 coincidono, il file è un clone indistinguibile bit-a-bit al 100% (`EXACT_HASH`).
   - Se gli MD5 differiscono, i file non vengono considerati duplicati esatti, azzerando i falsi allarmi (es. foto o template con stessa dimensione).
   - Per file speciali o documenti Google Workspace nativi (Doc/Sheets) privi di MD5, interviene un fallback elegante su match di nome normalizzato (`EXACT`).
   - In aggiunta, opera la deduplicazione semantica per stesso soggetto + stesso documento + stesso anno (`SEMANTIC`).

---

## 4. Motivazioni e Alternative Scartate

- **Perché richiedere `md5Checksum` tramite Drive REST API invece di scaricare il blob con `Utilities.computeDigest`?**
  *Motivazione e alternative scartate*: Scaricare l'intero blob di byte in memoria RAM per ogni file consuma ingenti risorse di rete, rallenta drasticamente l'audit ed espone al limite Apps Script di 50 MB per singolo Blob (`Blob too large`). Google Drive calcola già internamente l'hash MD5 al momento dell'upload e lo espone nei metadati di sistema. Richiedere `fields: 'id,name,size,md5Checksum,mimeType'` via REST API v3 trasferisce una manciata di byte JSON in millisecondi, con 0 KB di download del contenuto del file.
- **Perché non richiedere l'MD5 a tappeto per tutti i file all'inizio dell'audit?**
  *Scartata*: Ogni chiamata HTTP tramite `UrlFetchApp` o API Drive impiega circa 100-250 ms in Apps Script. Su cartelle con decine di file, effettuare chiamate a vuoto per file che hanno già dimensioni in byte completamente distinte aggiungerebbe 4-8 secondi di latenza inutile. Il Tier 1 basato su `file.getSize()` (già in memoria dalla scansione `getFiles()`) filtra istantaneamente il 95%+ dei file con zero chiamate di rete.
- **Perché escludere dai duplicati esatti i file con stessa dimensione ma diverso MD5?**
  *Motivazione*: Due file generati da un medesimo scanner, fotocamera o template d'ufficio possono accidentalmente condividere la stessa dimensione in byte pur contenendo documenti o pagine diverse. Segnalarli come duplicati indurrebbe l'operatore a cestinare erroneamente documenti validi.
- **Perché non eseguire la bonifica completamente automatica senza conferma utente?**
  *Scartata*: L'eliminazione automatica di file o la sovrascrittura di anagrafiche senza revisione umana comporta gravi rischi di perdita accidentale di dati, specie in contesti con file denominati in modo ambiguo (`doc01.pdf`). L'anteprima diff consente all'operatore di verificare e ritoccare ogni singolo valore.
- **Perché non scansionare tutti i file di default con Gemini Flash?**
  *Scartata*: Google Apps Script ha un limite di esecuzione di 6 minuti per invocazione RPC e quote UrlFetchApp. L'analisi OCR di decine di file contemporanei rallenterebbe la UI. L'approccio ibrido (Fast Audit di default + Deep AI opzionale/on-demand con limite `maxAIFiles: 5`) garantisce reattività istantanea e scalabilità.
- **Perché usare `file.moveTo` invece di cancellazione e ricreazione?**
  *Motivazione*: `file.moveTo` preserva l'ID univoco del file Google Drive, la cronologia delle versioni e le autorizzazioni di condivisione, evitando di rompere i collegamenti già registrati.
- **Perché sanitizzare il report con `JSON.parse(JSON.stringify(report))` prima dell'invio RPC?**
  *Motivazione*: Il serializzatore RPC nativo di Google Apps Script (`google.script.run`) non supporta grafi di memoria con riferimenti condivisi (es. lo stesso oggetto `dupInfo` presente sia in `duplicateGroups` che in `issues[i].extra`) né date non formattate in contesti complessi. In caso di errore di serializzazione, Apps Script recapita silenziosamente `null` al client, causando il fallimento con errore `"Rapporto non disponibile"`. La serializzazione preventiva crea un albero JSON puro, privo di cicli o referenze condivise, con date in formato ISO 8601 standard.
- **Perché escludere categoricamente i documenti `ALTRO` / `Altro Documento` dalla deduplicazione semantica?**
  *Motivazione*: I file non classificati condividono la tipologia di fallback e spesso non contengono anni nel nome file. Permettere il raggruppamento semantico su di essi genererebbe un'esplosione combinatoria di falsi duplicati (es. tutti i file PDF o immagini non tipizzati scambiati per copie l'uno dell'altro).
- **Perché non rinominare in `Altro Documento - ...` i file sconosciuti durante la riconciliazione lasciandoli come sono?**
  *Motivazione e alternative scartate*: Quando l'audit o l'ispezione IA incontra un file il cui nome o contenuto non corrisponde a nessuna delle tipologie standard censite (es. ricevute di bonifico, note, relazioni sociali, attestazioni atipiche), rinominarlo forzatamente in `Altro Documento - Persona.pdf` cancellerebbe l'indicazione descrittiva originaria data dall'utente (es. `ricevuta_bonifico_novembre.pdf` verrebbe appiattita in un generico `Altro Documento - Mario Rossi.pdf`), creando peraltro collisioni di file omonimi in presenza di più file non tipizzati per lo stesso componente. Il sistema lascia pertanto intatto il nome file originale, non emette issue di tipo `NON_STANDARD_FILENAME` e ne propone unicamente il censimento nel foglio *Documenti* come `Altro Documento`.
- **Perché auto-dedurre l'intestatario dal nome cartella Drive (`^\s*\d+\s*[-–—]?\s*(.+)$`)?**
  *Motivazione*: Se un nucleo familiare o un fascicolo di test (es. Nucleo #3) ha una cartella su Drive ma non è ancora formalmente censito con righe associate nei fogli *Nuclei Familiari* o *Beneficiari*, il sistema ricava il nome direttamente dalla cartella fisica, garantendo la visualizzazione corretta della dashboard diagnostica anziché fallire o mostrare etichette vuote.

- **Perché supportare l'esecuzione granulare (singolo caso o per categoria) oltre al piano globale?**
  *Motivazione*: Negli audit complessi con decine di file, l'operatore non sempre desidera applicare in blocco tutte le azioni. Poter applicare subito una singola decisione (es. rinominare un solo file, cestinare un duplicato o creare una cartella) o un'intera tipologia (es. solo i duplicati) senza toccare il resto delle selezioni offre un controllo totale e riduce il rischio di modifiche premature o non verificate.
- **Perché integrare l'anteprima interna e il link diretto a Google Drive per ogni file?**
  *Motivazione*: Consente all'operatore di verificare visivamente il documento (confronto fianco a fianco tra originale e duplicato, controllo del documento prima di censirlo nel foglio, verifica del documento sorgente da cui Gemini ha estratto un dato) senza consumare banda o memoria server, sfruttando l'endpoint `/preview` e `/view` nativo di Google Drive.

---

## 5. Esempi di Utilizzo

```javascript
// 1. Esecuzione Audit Diagnostico Rapido
const rep = DriveReconciler.auditNucleo(12, { deepAIScan: false });
Logger.log("Anomalie rilevate: " + rep.issues.length);

// 2. Ispezione on-demand di un file Drive con Google Gemini Flash
const fileInfo = DriveReconciler.inspectFileWithAI("1cBAWWPnRZNhj1xubIM89inMehvB-sFiE");
Logger.log("Tipo rilevato da IA: " + fileInfo.data.tipoDocumento);

// 3. Esecuzione Piano Parziale o per Singolo Caso (Granular Execution)
const singleRenamePlan = {
  fileRenames: [{ fileId: "file456", newName: "Carta d'Identità (scad. 2034) - Mario Rossi.pdf" }]
};
const resSingle = DriveReconciler.executeApprovedPlan(12, singleRenamePlan);
Logger.log("Singola azione applicata: " + resSingle.actionsApplied[0]);

// 4. Esecuzione Piano di Bonifica Approvato Completo
const approvedPlan = {
  folderRenames: [{ folderId: "fld123", newName: "Mario Rossi" }],
  fileMoves: [{ fileId: "file456", targetFolderId: "fld123" }],
  fileRenames: [{ fileId: "file456", newName: "Carta d'Identità (scad. 2034) - Mario Rossi.pdf" }],
  duplicates: [{ fileId: "file789", action: "trash" }],
  documentRegistrations: [{
    intestatario: "RSSMRA80A01H501Z",
    tipo: "Carta d'Identità",
    categoria: "Anagrafica",
    idDrive: "file456",
    dataScadenza: "2034-05-10"
  }],
  anagraficaUpdates: [{
    entityType: "BENEFICIARIO",
    entityId: "RSSMRA80A01H501Z",
    updates: { luogoNascita: "Roma (RM)" }
  }]
};
const res = DriveReconciler.executeApprovedPlan(12, approvedPlan);
Logger.log("Azioni applicate con successo: " + res.actionsApplied.length);
```
