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
