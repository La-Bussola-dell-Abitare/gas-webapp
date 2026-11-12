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

3. **Ciclo Operativo di Sviluppo e Rilascio**:
   - **Durante lo sviluppo / refactoring**: Eseguire test unitari rapidi locali con `npm test` (`node --test`).
   - **Prima del collaudo da browser**:
     ```bash
     npm run deploy:open
     ```
     *(Apre temporaneamente l'accesso impostando `access: "ANYONE_ANONYMOUS"`, effettua `clasp push` e aggiorna il deployment fisso).*
   - **Esecuzione collaudo**: Se ritenuto utile, testare le funzionalità da browser sull'URL ufficiale verificando il comportamento sul **Nucleo #3**.
   - **Chiusura obbligatoria prima del commit**:
     ```bash
     npm run deploy:close
     ```
     *(Ripristina `access: "MYSELF"`, effettua `clasp push` e ritira l'accesso pubblico sul deployment fisso).*
   - **Commit e Push Git**: Il manifest `src/appsscript.json` non deve **mai** essere committato con `access: "ANYONE_ANONYMOUS"`.

---

## 4. Standard dei Messaggi di Commit Git (Descrittivi e Dettagliati)

> [!IMPORTANT]
> **I messaggi di commit Git non devono mai essere generici, telegrafici o privi di contesto (es. vietati "fix", "aggiornamenti", "modifiche varie").** Devono documentare puntualmente **cosa** è stato modificato, **il motivo** dell'intervento e **i dettagli implementativi**.

### 4.1 Struttura Obbligatoria del Messaggio
I commit devono adottare lo standard **Conventional Commits** arricchito da un corpo descrittivo a punti:

1. **Header (Oggetto)**:
   - Formato: `<tipo>(<ambito>): <sintesi chiara e concisa>`
   - Tipi ammessi: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
   - Limite raccomandato: massimo 72 caratteri.
   - Esempi corretti:
     - `feat(ui): aggiunta anteprima file e diagnostica granulare drive`
     - `fix(ui): allineamento a filo 24px del toast e z-index sovraordinato ai modali`
     - `fix(core): bonifica chiamate RPC e correzione troncamento template GAS`

2. **Body (Corpo del Messaggio - Obbligatorio per modifiche strutturali o funzionali)**:
   - Separato dall'header da una riga vuota.
   - Organizzato in elenco puntato (`- `) che dettagli:
     - **Problema riscontrato o richiesta funzionale**: breve spiegazione del contesto o dell'anomalia.
     - **Cosa è stato fatto**: elenco analitico delle modifiche apportate ai file e ai moduli.
     - **Dettagli tecnici o architetturali**: motivazione di scelte specifiche (es. elevazione `z-index`, gestione concorrenza, prevenzione comment stripping GAS, ecc.).
     - **Allineamenti documentali e test**: menzione dei test eseguiti (`npm test`) e della documentazione aggiornata.

3. **Esempio di Commit Conforme**:
   ```text
   fix(ui): correzione cambio tab, rimozione blocchi orfani e allineamento toast a filo destro (24px)

   - Correzione navigazione a schede: pulsanti semantici native button e scoping .active
   - Risoluzione troncamento template GAS: helper getDriveFileUrl senza // nei template literals
   - Rimozione di 31 iniezioni orfane che bloccavano le chiamate RPC con ReferenceError
   - Elevazione stacking context toast a z-index 10050 per galleggiare sopra i modali
   - Allineamento elastico del toast container a filo destro a 24px esatti
   - Scrittura atomica sicura per appsscript.json in scripts/deploy.js
   - Aggiornamento documentazione tecnica di modulo in README.md e webapp.md
   ```
