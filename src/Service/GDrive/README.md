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
- **`auditNucleo(nucleoId, options)`**:
  Esegue la scansione completa della cartella radice e delle sottocartelle dei componenti del nucleo, incrociando i file con il foglio *Documenti* e l'anagrafica. Rileva:
  1. `FOLDER_NAME_MISMATCH`: cartelle con nominativi invertiti (`Rossi Mario`), refusi o nomi parziali (`analyzeFolderName`).
  2. `MISSING_MEMBER_FOLDER`: componenti censiti privi di sottocartella personale.
  3. `MISPLACED_FILE`: documenti personali archiviati nella radice nucleo o nella cartella di un altro componente, o documenti di nucleo archiviati dentro la cartella di un singolo membro.
  4. `NON_STANDARD_FILENAME`: file con nomi non conformi alla convenzione ufficiale [`buildDocumentFileName`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/documents.js).
  5. `DUPLICATE_FILE`: duplicati esatti per dimensione in byte/hash e duplicati semantici (stesso documento/anno per lo stesso soggetto).
  6. `UNTRACKED_FILE`: file presenti su Drive ma assenti nel foglio *Documenti*.
  7. `ORPHAN_SHEET_ROW`: righe nel foglio *Documenti* con ID Drive non più esistente o cestinato su Drive.
  8. `ANAGRAFICA_DIFF`: discrepanze tra i dati anagrafici nei fogli e quelli estratti dal contenuto del documento tramite Google Gemini Flash.
  9. `EXPIRED_DOCUMENT`: documenti scaduti o in scadenza entro 60 giorni.
- **`inspectFileWithAI(fileId)`**: Ispezione OCR e semantica on-demand di un singolo file Drive tramite Google Gemini Flash multimodale ([`DocumentIntelligence.js`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Document/DocumentIntelligence.js)).
- **`executeApprovedPlan(nucleoId, approvedPlan)`**:
  Esecuzione transazionale delle sole azioni approvate o personalizzate dall'operatore nella modale interattiva (creazione cartelle, ridenominazioni, spostamenti con `file.moveTo`, cestinamento duplicati, inserimento documenti e aggiornamento anagrafico).
- **`reconcileNucleo(nucleoId, options)`**: Wrapper di retrocompatibilità che esegue l'audit rapido e applica le bonifiche standard o il piano approvato.
- **`auditArchive()`**: Scansione sintetica globale su tutti i nuclei censiti.

---

## 3. Scelte Architetturali Adottate

1. **Workflow a Due Fasi (Audit $\rightarrow$ Approvazione Selettiva $\rightarrow$ Esecuzione Atomica)**:
   Invece di eseguire modifiche distruttive immediate o script "ciechi", il sistema calcola prima un report diagnostico esaustivo (`auditNucleo`), lo presenta in una dashboard interattiva a 4 schede, e invia al backend solo il piano di modifiche esplicitamente marcate dall'utente (`executeApprovedPlan`).
2. **Architettura Ibrida Fast Audit + Deep AI Scan On-Demand**:
   La scansione ordinaria è istantanea perché basata sui metadati di Drive e sulle regex di dominio (`findDocumentType`), senza consumo di quota né rischi di timeout. Quando l'operatore attiva lo switch *"Analisi IA Gemini Flash"* o clicca *"IA"* su un singolo file, viene invocata l'API multimodale di Gemini Flash per estrarre con certezza dati anagrafici e scadenze.
3. **Fuzzy Matching e Token-Set Analysis (`analyzeFolderName`)**:
   L'analisi delle cartelle utilizza una combinazione di token matching e distanza di Levenshtein normalizzata (`calculateStringSimilarity`), distinguendo con precisione le inversioni (`INVERTED`), i refusi di battitura (`TYPO`) e i nomi parziali (`PARTIAL`).
4. **Deduplicazione Multi-Criterio**:
   I duplicati vengono individuati sia tramite confronto di dimensione esatta/hash MD5 (`computeFileMd5`), sia per identità semantica (stesso soggetto + stessa tipologia documento + stesso anno). L'operatore può scegliere per ciascun duplicato se cestinarlo, spostarlo in una cartella protetta `_Archivio` o mantenerlo.

---

## 4. Motivazioni e Alternative Scartate

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
- **Perché auto-dedurre l'intestatario dal nome cartella Drive (`^\s*\d+\s*[-–—]?\s*(.+)$`)?**
  *Motivazione*: Se un nucleo familiare o un fascicolo di test (es. Nucleo #3) ha una cartella su Drive ma non è ancora formalmente censito con righe associate nei fogli *Nuclei Familiari* o *Beneficiari*, il sistema ricava il nome direttamente dalla cartella fisica, garantendo la visualizzazione corretta della dashboard diagnostica anziché fallire o mostrare etichette vuote.

---

## 5. Esempi di Utilizzo

```javascript
// 1. Esecuzione Audit Diagnostico Rapido
const rep = DriveReconciler.auditNucleo(12, { deepAIScan: false });
Logger.log("Anomalie rilevate: " + rep.issues.length);

// 2. Ispezione on-demand di un file Drive con Google Gemini Flash
const fileInfo = DriveReconciler.inspectFileWithAI("1cBAWWPnRZNhj1xubIM89inMehvB-sFiE");
Logger.log("Tipo rilevato da IA: " + fileInfo.data.tipoDocumento);

// 3. Esecuzione Piano di Bonifica Approvato dall'Operatore
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
