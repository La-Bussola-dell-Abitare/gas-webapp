# Modulo CI/CD e Automazione GitHub Actions (.github/workflows/)

Questo modulo gestisce l'infrastruttura di Continuous Integration e Continuous Deployment (CI/CD) del gestionale **"La Bussola dell'Abitare"**, garantendo la convalida automatica del codice e il rilascio sicuro su Google Apps Script.

---

## 1. Responsabilità e Ruolo nel Sistema

Le pipeline GitHub Actions operano come guardrail automatizzato per:
- **Convalida Continua della Qualità**: Eseguire l'intera suite di test unitari offline ad ogni `push` e `pull_request`.
- **Prevenzione delle Regressioni di Sicurezza**: Verificare che il manifest [`src/appsscript.json`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/appsscript.json) non venga mai committato o rilasciato con `access: "ANYONE_ANONYMOUS"` (come imposto da [`AGENTS.md`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/AGENTS.md)).
- **Deployment Atomico e Sicuro**: Sincronizzare il codice sorgente su Google Apps Script tramite `@google/clasp` ad ogni push su `main`, bloccando il push in caso di test non superati.

---

## 2. File del Modulo

```
.github/workflows/
├── test.yml        # Pipeline di Continuous Integration (Test unitari e verifica di sicurezza)
├── clasp-push.yml  # Pipeline di Continuous Deployment (Test preventivi + push automatico su Apps Script)
└── README.md       # Questo documento
```

### 2.1 [`test.yml`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/.github/workflows/test.yml)
- **Triggers**:
  - `push` su tutti i branch (`**`).
  - `pull_request` verso il branch `main`.
  - `workflow_dispatch` (avvio manuale su richiesta da interfaccia GitHub).
- **Matrice di Esecuzione**: Node.js `20` e Node.js `22` (versioni LTS attive).
- **Step**:
  1. Checkout del repository (`actions/checkout@v4`).
  2. Setup Node.js con cache npm (`actions/setup-node@v4`).
  3. Installazione pulita e deterministica delle dipendenze (`npm ci`).
  4. Audit di sicurezza del manifest GAS (blocco immediato se `access === "ANYONE_ANONYMOUS"`).
  5. Esecuzione suite unit test offline (`npm test`).

### 2.2 [`clasp-push.yml`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/.github/workflows/clasp-push.yml)
- **Triggers**: `push` esclusivo sul branch `main`.
- **Step**:
  1. Checkout e Setup Node.js 20.
  2. Installazione dipendenze (`npm ci`).
  3. Pre-check di sicurezza manifest `appsscript.json`.
  4. Esecuzione suite test unitari (`npm test`): **se fallisce, il job si arresta e il deploy viene abortito**.
  5. Installazione globale di `@google/clasp`.
  6. Generazione del file di autenticazione `~/.clasprc.json` dai secret di repository (`CLASP_ACCESS_TOKEN`, `CLASP_REFRESH_TOKEN`, `CLASP_CLIENT_ID`, `CLASP_CLIENT_SECRET`).
  7. Esecuzione `clasp status` e `clasp push --force`.

---

## 3. Scelte Architetturali Adottate

### 3.1 Separazione tra Convalida (CI) e Rilascio (CD)
- `test.yml` viene eseguito su qualsiasi branch e Pull Request, fornendo feedback rapido (<20 secondi) allo sviluppatore senza richiedere autorizzazioni o credenziali Google.
- `clasp-push.yml` gestisce i secret sensibili di Google Apps Script solo su `main`.

### 3.2 Pre-Deploy Testing Gate (Fail-Safe)
Invece di eseguire il push incondizionatamente, `clasp-push.yml` riesegue `npm test` prima di invocare `clasp push`. In questo modo un merge frettoloso o un push diretto non possono corrompere il codice attivo nel cloud.

### 3.3 Security Assertion Programmatica per il Manifest
In Apps Script il collaudo da browser richiede temporaneamente `access: "ANYONE_ANONYMOUS"` (gestito da `npm run deploy:open`). La regola operativa impone di chiuderlo con `npm run deploy:close`.
La pipeline CI verifica programmaticamente il file JSON del manifest con Node.js: se l'accesso pubblico è rimasto attivo, la pipeline fallisce con codice 1 e stampa istruzioni chiare per il ripristino.

---

## 4. Motivazioni e Alternative Scartate

1. **Unico Workflow Monolitico per Test e Deploy (Scartato)**:
   - *Motivazione*: Obbligherebbe a esporre i secret di Clasp anche nei workflow scatenati da Pull Request o branch secondari, o richiederebbe condizioni complesse `if: github.ref == 'refs/heads/main'` che rendono il log CI disordinato. La separazione in due workflow specializzati offre una visibilità netta nella scheda Actions di GitHub.

2. **Trigger di Deploy basato su `workflow_run` (Scartato)**:
   - *Motivazione*: Concatenare `clasp-push.yml` all'evento di completamento di `test.yml` tramite `workflow_run` introduce ritardi di polling e complessità nella gestione dei commit SHA. Eseguire il gate `npm test` direttamente all'inizio del job di deploy garantisce atomicità e velocità assoluta.

3. **Installazione dipendenze con `npm install` anziché `npm ci` (Scartato)**:
   - *Motivazione*: `npm ci` garantisce build riproducibili al 100% basate esclusivamente su [`package-lock.json`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/package-lock.json), prevenendo mutazioni impreviste delle librerie in ambiente CI.

---

## 5. Esempi di Utilizzo

### Esecuzione Manuale da GitHub CLI
```bash
# Avvio manuale del workflow di test sul branch corrente
gh workflow run test.yml

# Verifica dello stato di esecuzione
gh run list --workflow=test.yml
```

### Visualizzazione Badge di Stato nel README
```markdown
![Tests](https://github.com/La-Bussola-dell-Abitare/gas-webapp/actions/workflows/test.yml/badge.svg)
```
