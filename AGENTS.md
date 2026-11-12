# Linee Guida per gli Agenti AI (AGENTS.md)

Questo documento definisce le regole operative e le convenzioni che tutti gli agenti AI e gli sviluppatori devono seguire durante lo sviluppo e la manutenzione del gestionale **"La Bussola dell'Abitare"**.

---

## 1. Regola Fondamentale: Documentazione Contestuale e Architetturale Continua

> [!IMPORTANT]
> **Ogni volta che si aggiunge, modifica o refattorizza codice nel progetto, è obbligatorio aggiornare contestualmente la documentazione tecnica nelle relative cartelle e i diagrammi UML.** Non rimandare la documentazione a fasi successive.

### 1.1 Documentazione di Cartella (`src/**/README.md` e `Istruzioni.md`)
Per ogni cartella in cui vengono apportate modifiche:
1. **Cosa fa il modulo**: Descrivere la responsabilità del componente e il suo ruolo nel sistema.
2. **File del modulo**: Elencare i file nuovi o modificati con il loro scopo specifico.
3. **Scelte architetturali adottate**: Illustrare i pattern utilizzati (es. SSOT, Repository pattern, RPC Controller, ecc.).
4. **Motivazioni e alternative scartate**: Spiegare chiaramente **perché** è stata scelta questa soluzione e quali alternative sono state scartate e per quale motivo (es. problemi di concorrenza con `LockService`, limiti di `Object.freeze` con V8 in Apps Script, performance di rete, scalabilità, integrità dei dati).
5. **Esempi di utilizzo**: Mostrare chiamate o snippet di codice rilevanti.

### 1.2 Allineamento dei Diagrammi UML (`docs/`)
Se le modifiche impattano l'architettura, aggiornare tempestivamente i diagrammi Mermaid nei seguenti file:
- **`docs/uml_classi.md`**: Se vengono creati nuovi modelli, repository, service o se cambiano proprietà e metodi.
- **`docs/uml_sequenza.md`**: Se vengono introdotti o modificati flussi tra WebApp, Backend, Service (Drive, Gemini Flash) e Repository.
- **`docs/uml_casi_uso.md`**: Se vengono abilitati nuovi casi d'uso funzionali o nuovi attori (es. Google Gemini Flash).
- **`docs/uml_attivita.md`**: Se cambiano i diagrammi di flusso decisionali (es. logiche di validazione, auto-healing, transazioni atomiche).

### 1.3 Aggiornamento degli Indici e delle Specifiche Globali
- **`README.md` (root)**:
  - Mantenere aggiornata la Sezione 3 (Diagramma Architetturale).
  - Aggiornare la Sezione 5 (Mappa delle Funzionalità) con lo stato implementativo.
  - Aggiornare la Sezione 8 (Indice della Documentazione) se vengono aggiunti nuovi documenti.
- **`src/View/WebApp/webapp.md`**: Aggiornare le specifiche frontend se vengono toccate maschere, modali, canvas o logiche client.
- **`docs/funzionamentoSportello.md`** e **`docs/automazione.md`**: Aggiornare se cambiano le procedure operative o i trigger automatici.

---

## 2. Standard di Codifica e Convenzioni di Progetto

1. **Single Source of Truth (SSOT)**:
   - I dati di dominio (nazioni, prefissi, tipi documento, archetipi temporali, regex) risiedono esclusivamente in `src/Domain/` (`country.js`, `documents.js`).
   - Mai duplicare elenchi cablati in altre parti del frontend o backend.

2. **Google Apps Script & Vincoli V8**:
   - Evitare getter con caching su oggetti congelati con `Object.freeze`: usare pattern con cache mutabile esterna (`_CONFIG_DRIVE_CACHE`).
   - Evitare chiamate RPC multiple in parallelo all'avvio della WebApp per non saturare `LockService`: aggregare le chiamate di inizializzazione in un'unica funzione atomica (`getInitialAppData`).
   - Proteggere sempre le operazioni di scrittura concorrente (es. creazione nucleo, assegnazione ID incrementali) con `LockService.getScriptLock()`.

3. **Convenzioni Link e Formattazione Markdown**:
   - Utilizzare sempre link cliccabili con protocollo `file:///` e forward slash (es. `[country.js](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/country.js)`).
   - Formattare codice, simboli e percorsi sempre tra backtick.

---

## 3. Protocollo di Testing e Deployment Collaudo (SSOT)

Tutti gli agenti e sviluppatori devono attenersi rigorosamente al seguente protocollo per qualsiasi ciclo di verifica e collaudo:

1. **Deployment ID Fisso per Collaudo WebApp**:
   - **Deployment ID Ufficiale**: `AKfycbzkY426RSsiBF19i2GRLd69idx3GbMKj4fZQIcg2G3INwXVSjTiRd-4MEtmp9IA0MFwMw`
   - **URL WebApp Collaudo**: `https://script.google.com/macros/s/AKfycbzkY426RSsiBF19i2GRLd69idx3GbMKj4fZQIcg2G3INwXVSjTiRd-4MEtmp9IA0MFwMw/exec`

2. **Nucleo di Test Riservato**:
   - Qualsiasi operazione di collaudo live, test di caricamento documenti IA, diagnostica, bonifica o creazione incontri deve essere eseguita **tassativamente ed esclusivamente** su:
     - **Nucleo #3: Lorenzo Mazza**
   - Non operare, modificare o spostare file di nessun altro nucleo o beneficiario reale.

3. **Ciclo Operativo, Aggiornamento ed Esecuzione Giudiziosa dei Test**:
   - **Aggiornamento Continuo della Suite di Test (`tests/`)**:
     - Man mano che si aggiungono funzionalità, logiche di dominio o si correggono bug (es. vincoli di unicità, semafori scadenze, formattazione dati, controlli di conformità), è obbligatorio aggiornare contestualmente i relativi test unitari in `tests/unit/` per garantire che il nuovo comportamento sia formalmente coperto da asserzioni.
   - **Esecuzione Selettiva dei Test (Minimizzare l'Overhead)**:
     - **Test Unitari Locali (`npm test`)**: Eseguirli solo quando si ritiene opportuno (es. a conclusione logica di una modifica o prima di finalizzare un rilascio), evitando esecuzioni ridondanti a ogni singola micro-istruzione.
     - **Test Live da Browser e Cicli Clasp (`npm run deploy:open` / CDP)**: Richiedono tempo, latenza di rete e consumo di quota Apps Script. Vanno eseguiti **solo ed esclusivamente quando strettamente necessario** (es. verifica finale di un'interfaccia complessa o su esplicita richiesta dell'utente), mai durante le fasi intermedie di sviluppo.
   - **Apertura Temporanea per Collaudo da Browser**:
     ```bash
     npm run deploy:open
     ```
     *(Apre temporaneamente l'accesso impostando `access: "ANYONE_ANONYMOUS"`, effettua `clasp push` e aggiorna il deployment fisso).*
   - **Chiusura Obbligatoria prima del Commit**:
     ```bash
     npm run deploy:close
     ```
     *(Ripristina `access: "MYSELF"`, effettua `clasp push` e ritira l'accesso pubblico sul deployment fisso).*
   - **Commit e Push Git**: Il manifest `src/appsscript.json` non deve **mai** essere committato con `access: "ANYONE_ANONYMOUS"`.

---

## 4. Standard dei Messaggi di Commit Git (Titolo Breve e Descrizione Esaustiva)

> [!IMPORTANT]
> **I commit Git devono sempre combinare un titolo breve e compatto con una descrizione estesa, esaustiva e dettagliata a punti.**
> È vietato l'uso di titoli prolissi così come l'uso di commit privi di corpo descrittivo o con messaggi generici (es. vietati "fix", "aggiornamenti", "modifiche varie").

### 4.1 Struttura del Messaggio e Convenzione del Doppio Flag `-m`
La convenzione raccomandata prevede l'uso di due flag `-m` distinti (oppure un file di messaggio strutturato):

1. **Primo `-m`: Titolo / Header (Breve e Conciso)**:
   - Formato: `<tipo>(<ambito>): <sintesi breve e chiara>`
   - Limite raccomandato: **massimo 50-72 caratteri**.
   - Linguaggio: indicativo presente o imperativo in italiano o inglese, focalizzato sull'obiettivo principale.
   - Tipi ammessi: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
   - Esempi corretti:
     - `fix(ui): allineamento a filo 24px del popup toast`
     - `feat(drive): anteprima file e diagnostica granulare`
     - `fix(core): bonifica chiamate RPC e template GAS`

2. **Secondo `-m`: Descrizione / Body (Esaustiva, Dettagliata e a Punti)**:
   - Deve contenere la spiegazione approfondita di tutto ciò che è stato realizzato.
   - Organizzato obbligatoriamente in **elenco puntato (`- `)** strutturato:
     - **Motivo o anomalia**: spiegazione chiara del contesto, dell'errore riscontrato o della richiesta dell'utente.
     - **Cosa è stato fatto (punto per punto)**: elenco puntuale di tutte le modifiche apportate ai file e ai componenti.
     - **Dettagli tecnici e scelte architetturali**: spiegazione delle motivazioni dietro a specifiche implementazioni (es. elevazione `z-index: 10050` contro i modali, `align-items: flex-end` per eliminare il disallineamento della larghezza fissa Bootstrap, scrittura atomica con rename contro i blocchi Windows `ERROR_USER_MAPPED_FILE`, prevenzione comment stripping GAS).
     - **Verifiche e collaudi**: menzione esplicita dei test unitari superati (`npm test`) e delle misurazioni o collaudi live eseguiti (es. Chrome CDP, hard refresh).

### 4.2 Esempio Pratico di Invocazione Git Conforme
```bash
git commit -m "fix(ui): allineamento a filo 24px del popup toast" -m "- Problema: il toast di errore appariva a 129px dal margine destro a causa della larghezza fissa di 350px del toast Bootstrap allineato a sinistra nel flex container da 440px
- Allineamento: impostato align-items: flex-end sul container .toast-container-custom e rimossa la larghezza fissa (ora width: auto con max-width: calc(100vw - 48px))
- Flessibilità toast: impostato width: auto, min-width: 320px e max-width: 480px sui singoli toast per adattamento elastico al testo
- Elevazione z-index: mantenuto z-index 10050 per garantire che il toast galleggi sopra qualsiasi modale o backdrop oscurante
- Scrittura sicura: integrata la funzione safeWriteFile in scripts/deploy.js per evitare blocchi NTFS user-mapped section durante il deploy
- Test e verifiche: misurazione Chrome CDP sul browser live confermata a 24px esatti dal limite della finestra (1883px clientWidth - 1859px toastRight = 24px)
- Documentazione: aggiornati README.md di modulo (sez. 3.6) e webapp.md (sez. 4.1)"
```
