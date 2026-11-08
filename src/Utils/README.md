# Modulo di Configurazione e Utilità (`src/Utils`)

## 1. Responsabilità Architetturale

La cartella `src/Utils` contiene le impostazioni globali immutabili del sistema, i riferimenti all'infrastruttura Google Drive/Docs e un set di funzioni di utilità per la gestione tollerante delle tabelle Google Sheets e delle stringhe.

---

## 2. File Presenti

### `Config.js` — Configurazione Centralizzata del Sistema
Definisce l'oggetto congelato `CONFIG` contenente tutti gli identificativi Drive, i nomi dei fogli e le impostazioni dei servizi esterni.

#### Scelta Architetturale Critica: Cache Lazy e `Object.freeze`
In Google Apps Script (runtime V8), definire un getter lazy all'interno di un oggetto congelato con `Object.freeze()` (es. `get FOLDER() { if (!this._f) this._f = ...; return this._f; }`) causa un fallimento silenzioso: l'assegnazione a `this._f` viene ignorata perché l'oggetto è congelato, e il getter restituisce sistematicamente `undefined`.

Per risolvere questa criticità garantendo sia l'immutabilità della configurazione che il caricamento lazy delle risorse DriveApp:
1. Le istanze Google Drive (`Folder` e `File`) vengono memorizzate in un dizionario mutabile privato: `_CONFIG_DRIVE_CACHE = {}`.
2. I getter su `CONFIG` leggono e scrivono esclusivamente su `_CONFIG_DRIVE_CACHE`, evitando qualsiasi mutazione su `CONFIG`.

```javascript
const _CONFIG_DRIVE_CACHE = {};

const CONFIG = Object.freeze({
  FOLDER_BENEFICIARI_ROOT_ID: "1cBAWWPnRZNhj1xubIM89inMehvB-sFiE",
  get FOLDER_BENEFICIARI_ROOT() {
    if (!_CONFIG_DRIVE_CACHE.folderBeneficiariRoot) {
      _CONFIG_DRIVE_CACHE.folderBeneficiariRoot = DriveApp.getFolderById(this.FOLDER_BENEFICIARI_ROOT_ID);
    }
    return _CONFIG_DRIVE_CACHE.folderBeneficiariRoot;
  },
  // ...
});
```

#### Sezioni di Configurazione:
- **`FOGLIFIRME`**: ID cartella di destinazione e ID template Google Docs del foglio firme individuali.
- **`FOLDER_BENEFICIARI_ROOT_ID`**: ID cartella radice Drive in cui risiedono le cartelle dei nuclei e dei beneficiari (`1cBAWWPnRZNhj1xubIM89inMehvB-sFiE`).
- **`ID_TEMPLATESCHEDASEGNALAZIONE`** e **`FOLDER_SCHEDASEGNALAZIONE_ID`**: ID template e cartella delle schede per il secondo livello.
- **`SHEET_DOCUMENTI`** e **`HEADERS_DOCUMENTI`**: nome ufficiale (`"Documenti"`) e le 10 intestazioni standardizzate per il fascicolo relazionale.
- **`GEMINI`**:
  - `MODEL`: modello multimodale predefinito (`"gemini-3.8-flash"`).
  - `getModel()`: supporta l'override dinamico tramite la proprietà dello script `GEMINI_MODEL`.
  - `getApiKey()`: recupera in sicurezza la chiave API da `PropertiesService.getScriptProperties()`.

---

### `Utils.js` — Manipolazione Fogli, Colonne Dinamiche e Testo
Fornisce funzioni ad alta affidabilità per interagire con i dati non strutturati dei fogli di calcolo.

- **`findHeaderIndex(headers, keys)`**:
  Cerca l'indice (0-based) di una colonna confrontando un elenco di sinonimi o varianti case-insensitive (es. `["id documento", "id_documento", "id"]`). Evita che variazioni tipografiche nelle intestazioni rompano il codice.
- **`ensureHeaderIndex(sheet, headerName, searchKeys)`**:
  Verifica se una colonna esiste nella riga 1 del foglio; se manca, la aggiunge automaticamente a destra dell'ultima colonna e restituisce il nuovo indice. Permette l'auto-migrazione progressiva dello schema del foglio.
- **`safeString(val)`**:
  Converte qualsiasi valore di cella in stringa ripulita dagli spazi, evitando errori `TypeError: cannot read property trim of null/undefined`.
- **`normalizeProperCase(str)`**:
  Converte una stringa in Title Case italiano rispettando particelle nobiliari/patronimiche (*De Luca*, *Di Pietro*, *Dell'Acqua*, *D'Angelo*), apostrofi e nomi composti con trattino (*Jean-Luc*, *Rossi-Bianchi*).
- **`normalizeCity(str)`**:
  Formatta denominazioni di comuni e luoghi di nascita mantenendo in minuscolo le preposizioni interne (*di*, *sul*, *nell'*) e preservando la **sigla della provincia a 2 lettere obbligatoriamente in MAIUSCOLO** (es. `Reggio nell'Emilia (RE)`, `Castellammare di Stabia (NA)`).
- **`normalizeAddress(str)`**:
  Formatta indirizzi anagrafici preservando numeri civici (es. `10/A`), CAP a 5 cifre e sigle provinciali.
- **`normalizeFiscalCode(cf)`**:
  Forza il codice fiscale a 16 caratteri alfanumerici maiuscoli rimuovendo spazi o simboli spuri.
- **`getSheetVal(row, idx, key, fallback)`**:
  Estrae in modo sicuro un campo da un array di riga controllando che l'indice sia valido e compreso nei limiti della matrice.
- **`mapFormula(input, fn, fallbackOnError, emptyValue)`**:
  Permette di applicare una funzione scalare a matrici 2D di Google Sheets per funzioni personalizzate (es. `TITLECASE`).
- **`calculateLevenshteinDistance(a, b)`**:
  Calcola la distanza di modifica (Levenshtein) minima tra due stringhe per rilevare refusi e scambi di lettere.
- **`calculateStringSimilarity(a, b)`**:
  Restituisce un indice normalizzato di somiglianza tra $0.0$ e $1.0$ basato sulla distanza di Levenshtein e sulla lunghezza massima delle stringhe.
- **`analyzeFolderName(folderName, expectedFirst, expectedLast, nucleoId)`**:
  Analizza la nomenclatura di una cartella confrontandola con i nominativi anagrafici attesi, classificando lo stato in:
  - `EXACT`: perfetta conformità formale (o solo differenza di maiuscole/minuscole);
  - `INVERTED`: nominativo invertito (`Cognome Nome` invece di `Nome Cognome`);
  - `TYPO`: presenza di refusi di battitura con similarità $\ge 0.72$;
  - `PARTIAL`: nome o cognome incompleto (fornito solo un componente);
  - `MISMATCH`: totale disallineamento rispetto al nominativo atteso.
- **`computeFileMd5(blobOrBytes)`**:
  Calcola l'hash digest MD5 a 32 caratteri esadecimali di un file o blob per la deduplicazione esatta dei file su Drive.

---

### `main.js` — Helper Globali di Script
Contiene utilità generiche per la formattazione data/ora (`Utilities.formatDate`), log di diagnostica e mapping per l'interazione con l'ambiente Google Apps Script.
