# Layer di Persistenza: Repository Pattern (`src/Repository`)

## 1. Responsabilità Architetturale

La cartella `src/Repository` implementa il **Repository Pattern** per il sistema gestionale "La Bussola dell'Abitare".
In un'applicazione enterprise basata su Google Apps Script, separare la logica di business dall'accesso ai dati (`SpreadsheetApp`) è essenziale per:
1. **Evitare il vendor lock-in e l'accoppiamento stretto**: I modelli di dominio e i controller non sanno né devono sapere come sono disposte le colonne nel foglio o quali API di Google Sheets vengano chiamate.
2. **Minimizzare le chiamate a Google Sheets (Quota & Performance)**: `SpreadsheetApp` ha tempi di risposta dell'ordine dei 50-200ms per ogni chiamata I/O. I Repository leggono i dati in blocchi matriciali bidimensionali (`getDataRange().getValues()`) in una sola operazione, idratando la memoria in tempo costante.
3. **Resilienza dello Schema**: Le colonne non vengono lette tramite indici numerici hardcodati (es. `row[4]`), ma attraverso mappatura dinamica case-insensitive delle intestazioni con fallback automatici (`findHeaderIndex`).
4. **Auto-Inizializzazione**: Se un foglio o una colonna richiesta non esiste (es. il foglio `Documenti` o la colonna `idCartella`), il repository lo rileva, inserisce la colonna/foglio e ne imposta l'intestazione standard (`ensureHeaderIndex`).

---

## 2. File e Classi di Persistenza

### `Beneficiario.js` — `BeneficiarioRepository`
Gestisce la lettura, il salvataggio e la rimozione delle anagrafiche sul foglio **`Beneficiari`**.
- **`getAll()`**: legge massivamente il foglio e restituisce un array di istanze `Beneficiario`.
- **`add(data)`**: inserisce un nuovo beneficiario o aggiorna un record esistente (cercando per Codice Fiscale).
- **`removeByCF(cf)`**: elimina la riga corrispondente al beneficiario specificato.
- **`updateDriveInfo(cf, { idCartella, firma })`**: aggiorna selettivamente gli ID Drive della cartella personale e del file di firma autografa senza sovrascrivere gli altri campi.

---

### `Documento.js` — `DocumentoRepository`
Gestisce la persistenza del fascicolo relazionale sul foglio **`Documenti`**.
- **`getSheet()`**: individua il foglio `Documenti`; se assente, lo crea automaticamente applicando la formattazione grafica ufficiale (riga 1 bloccata, grassetto, sfondo `#f1f5f9`).
- **`generateNextId()`**: calcola il prossimo progressivo numerico univoco (`max(ID) + 1`), partendo da `1` a foglio vuoto.
- **`getAll()`**: restituisce tutti i record idratati in oggetti `Documento` con calcolo dinamico delle scadenze (🔴 🟡 🟢 ⚪).
- **`getByCF(cf)`**: filtra in memoria i documenti appartenenti allo specifico beneficiario.
- **`add(data)`**: inserisce o aggiorna un documento (gestendo valori numerici in €, date normalizzate `YYYY-MM-DD` e categoria automatica dal catalogo SSOT).
- **`removeById(id)`**: elimina il record dal foglio tramite `deleteRow`.
- **`removeByDriveId(driveId)`**: rimuove o scollega documenti cercando per identificativo file Drive.
- **`getScadenzeCritiche(giorniPreavviso = 60)`**: estrae tutti i documenti con stato `SCADUTO` o `IN_SCADENZA`.

---

### `LookupRepository.js` — `LookupRepository`
Fornisce i valori controllati per i menu a tendina della Web App secondo l'architettura a **Doppio Canale**:
- **Dati Generali Universali** (*Stati, Cittadinanze, ISO, Prefissi ITU, Titoli di Studio UNESCO ISCED*): letti istantaneamente in RAM dai moduli di `src/Domain/` (**0 ms**).
- **Dati Operativi di Sportello** (*Abitazione, Servizi, Criticità, Relazioni, Stati Civili, Status Lavorativi, Tipi Documento*): letti tramite architettura Two-Tier da **`CacheService` (L1, ~2 ms)** e **`ScriptProperties` (L2, ~15 ms)** alla chiave `DATI_BUNDLE`.
- **Zero chiamate a `SpreadsheetApp`** a runtime per il popolamento iniziale della WebApp.

---

### `Operatore.js` — `OperatoreRepository`
Accede al foglio configurazione **`_DatiOperatori`** (con fallback retrocompatibile su `Operatori`) per recuperare l'elenco del personale, le qualifiche e i ruoli di sportello.
- `sheet()`: risolve prioritariamente `_DatiOperatori`.
- `getAll()`: restituisce la lista delle istanze `Operatore` mappando anche email, stato (attivo/disattivo) e ore settimanali.
- `getByName(name)`: ricerca puntuale per nome operatore.

---

### `Fogliofirme.js` e `Diariogiornaliero.js`
Classi specializzate per il tracciamento dei metadati dei documenti amministrativi generati e archiviati.
