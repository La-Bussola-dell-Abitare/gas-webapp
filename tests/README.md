# Modulo di Testing Offline (tests/)

Infrastruttura di test unitari offline per il gestionale **"La Bussola dell'Abitare"**, progettata per convalidare rapidamente la logica di business, le entità di dominio, i modelli e le funzioni di utilità senza dipendere dalle API di Google Workspace.

---

## 1. Responsabilità e Ruolo nel Sistema

Google Apps Script (GAS) opera su un runtime V8 proprietario nel cloud, rendendo l'esecuzione di test automatizzati end-to-end lenta e soggetta a quote/autorizzazioni.
Il modulo `tests/` fornisce un ambiente di esecuzione **completamente locale, ultra-rapido (<350ms)** per:
- Convalidare i modelli di dominio e le relative regole di business (es. calcolo scadenze documenti, deduplicazione categorie).
- Verificare la correttezza del calcolo del Codice Fiscale, controllo del carattere di controllo (CIN) e gestione delle omocodie.
- Testare il catalogo SSOT di tipologie documentali ([`documents.js`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/documents.js)) e gli algoritmi di standardizzazione dei nomi file.
- Verificare le funzioni pure di fuzzy matching, distanza di Levenshtein, analisi delle cartelle Drive e normalizzazione del testo.

---

## 2. Struttura dei File

```
tests/
├── loadSrc.js                # Loader CommonJS per caricare codice sorgente GAS nel contesto globale Node.js (via vm)
├── unit/
│   ├── codiceFiscale.test.js # Test suite per Models/CodiceFiscale.js (CIN, sesso, data nascita, omocodie)
│   ├── documentoModel.test.js# Test suite per Models/Documenti/Documento.js (semafori scadenze, normalizzazione date)
│   ├── domain.test.js        # Test suite per Domain/documents.js (catalogo SSOT, findDocumentType, buildDocumentFileName)
│   ├── driveDiscovery.test.js# Test suite per Service/GDrive/DriveDiscoveryService.js (scansione radice Drive, importazione atomica)
│   └── utils.test.js         # Test suite per Utils/Utils.js (Levenshtein, analyzeFolderName, normalizzatori di testo)
└── README.md                 # Questo documento
```

---

## 3. Scelte Architetturali Adottate

### 3.1 Runner Nativo Node.js (`node:test` e `node:assert`)
I test utilizzano il test runner nativo integrato in Node.js (introdotto da Node v18+ e maturo in Node v25):
- Nessuna dipendenza esterna da installare o aggiornare (`node_modules` snello).
- Avvio istantaneo (<15ms per processo).
- Pieno supporto a costrutti BDD standard (`describe`, `it`, `before`, `after`).

### 3.2 Script Loader GAS in Node.js (`loadSrc.js`)
In Google Apps Script, tutti i file `.js` condividono il namespace globale senza `import` o `export`.
Per caricare ed eseguire questi file in Node.js senza modificare il codice sorgente di produzione né transpilare:
- Viene utilizzato il modulo standard `node:vm` (`vm.runInThisContext`).
- Il codice sorgente viene letto dal filesystem e iniettato nel contesto globale corrente di Node.js (`global`).
- I mock minimi di runtime GAS (es. `global.Logger = { log: () => {} }`) vengono definiti prima del caricamento.

---

## 4. Motivazioni e Alternative Scartate

1. **Vitest / Vite (Scartato)**:
   - *Problema riscontrato*: Il percorso assoluto della cartella di lavoro contiene il carattere cancelletto `#` (`D:\Lorenzo\Public\#Work\...`).
   - Vitest e il motore di risoluzione moduli basato su URL di Vite interpretano `#` come frammento di ancoraggio URL, fallendo con errore `Cannot find module ...`.
   - *Soluzione*: Il runner nativo `node:test` risolve i percorsi a livello di filesystem del sistema operativo senza passare per URL fragments, azzerando qualunque incompatibilità con percorsi contenenti caratteri speciali.

2. **Jest / Babel / Webpack (Scartato)**:
   - Introdurrebbe centinaia di megabyte di dipendenze `node_modules`, configurazioni complesse di trasformazione (`babel-jest`) e tempi di avvio di svariati secondi per una codebase che in runtime è puro JavaScript V8.

3. **Mocking Globale Completo di Google Apps Script (Scartato per i test unitari)**:
   - Simulare per intero servizi monolitici e chiusi come `DriveApp`, `SpreadsheetApp`, `UrlFetchApp` o `LockService` in JavaScript puro genera test fragili che testano i mock anziché il comportamento reale.
   - Si è scelto di separare nettamente:
     - **Test Unitari Offline (`tests/unit/`)**: Solo logica pura, modelli, validatori e SSOT.
     - **Collaudo Funzionale Live**: Eseguito direttamente sull'infrastruttura reale Google Apps Script tramite il deployment fisso dedicato (vedi [Protocollo di Testing in `AGENTS.md`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/AGENTS.md)).

---

## 5. Esempi di Utilizzo

### Esecuzione della Suite Completa
```bash
npm test
```
*Output tipico: 39 test passati in ~300ms.*

### Modalità Watch (Riesecuzione Automatica durante lo Sviluppo)
```bash
npm run test:watch
```

### Struttura Tipica di un Test Unitario
```javascript
const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('Domain/documents.js', () => {
  before(() => {
    loadScript('src/Domain/documents.js');
  });

  it('catalogo espone documenti congelati', () => {
    assert.strictEqual(Object.isFrozen(Documents), true);
  });
});
```

---

## 6. Integrazione Continuous Integration (GitHub Actions)

La suite di test viene eseguita automaticamente in ambiente cloud tramite GitHub Actions per garantire l'integrità del codice prima di ogni merge o deploy:

- [**`.github/workflows/test.yml`**](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/.github/workflows/test.yml):
  - Viene scatenato su ogni `push` (qualsiasi branch), ogni `pull_request` verso `main` e manualmente via `workflow_dispatch`.
  - Testa la suite in parallelo sulle versioni LTS di **Node.js (20 e 22)** su ambiente Ubuntu.
  - Include un pre-check di sicurezza per verificare che il manifest [`src/appsscript.json`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/appsscript.json) abbia `access: "MYSELF"` e non `ANYONE_ANONYMOUS`.
- [**`.github/workflows/clasp-push.yml`**](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/.github/workflows/clasp-push.yml):
  - Esegue `npm test` come gate blocker preventivo prima di autenticare Clasp ed eseguire il push del codice sorgente su Google Apps Script. Se anche un solo test fallisce, il push viene interrotto.

*(Per i dettagli sull'infrastruttura di automazione, consultare [`.github/workflows/README.md`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/.github/workflows/README.md)).*
