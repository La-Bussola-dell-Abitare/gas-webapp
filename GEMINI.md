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
  - **Comandi**: `npm test` per test offline, `npm run deploy:open` per abilitare il collaudo da browser, `npm run deploy:close` obbligatorio prima del commit Git.
- **Messaggi di Commit Descrittivi**: I commit Git devono tassativamente seguire la struttura Conventional Commits con corpo descrittivo a elenco puntato (cosa è stato fatto, motivazioni, dettagli implementativi e verifiche effettuate), vietando messaggi generici o privi di contesto.
