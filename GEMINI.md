# Antigravity & Gemini Agent Guidelines

Per le linee guida complete di sviluppo, documentazione continua e convenzioni architetturali del progetto, fare riferimento al file principale:
- [AGENTS.md](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/AGENTS.md)

### Regola Fondamentale (Sintesi)
- **Documentazione Continua**: Ogni modifica a codice/funzionalità deve essere accompagnata dall'aggiornamento immediato del file `README.md` o `Istruzioni.md` nella cartella specifica, spiegando le scelte architetturali adottate e i motivi per cui sono state scartate altre soluzioni.
- **UML & Riferimenti**: Aggiornare contestualmente i diagrammi UML (`docs/uml_*.md`) e gli indici in `README.md` e `webapp.md`.
- **SSOT**: Dominio centralizzato in `src/Domain/`.
- **Concorrenza Apps Script**: Proteggere le scritture con `LockService` e aggregare le letture di bootstrap in `getInitialAppData`.
- **Protocollo di Testing e Collaudo (SSOT)**:
  - **Deployment ID**: `AKfycbzkY426RSsiBF19i2GRLd69idx3GbMKj4fZQIcg2G3INwXVSjTiRd-4MEtmp9IA0MFwMw`
  - **Nucleo di Test**: **Nucleo #3 (Lorenzo Mazza)** tassativo per qualsiasi prova interattiva o manipolazione dati/Drive.
  - **Aggiornamento ed Esecuzione Giudiziosa dei Test**: Aggiornare costantemente i test unitari (`tests/`) man mano che si apportano modifiche al codice. Eseguire però i test solo quando ritenuto opportuno e necessario, evitando esecuzioni ridondanti e limitando i test complessi da browser (che richiedono il ciclo di deploy clasp) solo a fine modulo o su specifica richiesta dell'utente.
  - **Comandi**: `npm test` per test offline, `npm run deploy:open` per abilitare il collaudo da browser, `npm run deploy:close` obbligatorio prima del commit Git.
- **Messaggi di Commit (Titolo Breve e Descrizione Esaustiva)**: I commit Git devono combinare un titolo breve e compatto nel primo `-m` (max 50-72 caratteri, es. `<tipo>(<ambito>): <sintesi>`) con una descrizione estesa, esaustiva e a punti nel secondo `-m` (motivo/problema, elenco analitico delle modifiche apportate, dettagli tecnici e test eseguiti). Sono vietati sia i titoli prolissi che i commit privi di corpo descrittivo.
