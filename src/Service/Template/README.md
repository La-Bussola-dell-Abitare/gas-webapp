# Modulo Service Template (`src/Service/Template`)

## 1. Responsabilità Architetturale

Il modulo `src/Service/Template` accoglie i motori applicativi e i generatori di documenti formali Google Docs a partire da template Drive istituzionali:
1. **Motore di Sostituzione Template** ([`DocumentTemplateEngine.js`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Template/DocumentTemplateEngine.js)): Clona template Docs, sostituisce segnaposto testuali (`{chiave}`), gestisce checkbox spuntate/deselezionate (☑, ☒, ☐), inietta firme autografe PNG dimensionate e popola tabelle dinamiche.
2. **Generatore Diario Giornaliero** ([`DiarioGiornaliero.js`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Template/DiarioGiornaliero.js)): Rappresenta e compila il diario presenze e colloqui giornalieri degli operatori.
3. **Generatore Foglio Firme Individuale** ([`FoglioFirme.js`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Template/FoglioFirme.js)): Genera il documento per la rendicontazione oraria mensile operatore-beneficiario.
4. **Generatore Scheda di Segnalazione** ([`SchedaSegnalazione.js`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Template/SchedaSegnalazione.js)): Crea e compila la scheda di passaggio al secondo livello con dati anagrafici, nucleo familiare e firma operatore.

---

## 2. Motivazioni Architetturali e Scelte Adottate

- **Separazione tra Database Entity e Template Automation**:
  Precedentemente, questi file risiedevano in `src/Models/Documenti/`, generando confusione tra il record relazionale del foglio di calcolo (`Documento.js`) e i generatori/motori di documenti Google Docs.
  Secondo i principi del Domain-Driven Design (DDD), `Models/` contiene esclusivamente le entità persistenti del database, mentre i processi di generazione e manipolazione file appartengono al layer applicativo `Service/`.
- **Prestazioni e Pulizia**:
  `DocumentTemplateEngine` opera direttamente tramite `DocumentApp` e `DriveApp` in modo isolato, senza dipendenze circolari con i modelli dati.
