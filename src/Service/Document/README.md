# Servizio Document Intelligence e Generatori (`src/Service/Document`)

## 1. Responsabilità Architetturale

La cartella `src/Service/Document` gestisce la **Document Intelligence basata su Intelligenza Artificiale Multimodale** e la produzione automatica della modulistica istituzionale.

---

## 2. File Presenti

### `DocumentIntelligence.js` — Computer Vision & OCR con Google Gemini
Integra l'endpoint REST dei modelli Google Gemini Flash (`gemini-3.8-flash`) tramite `UrlFetchApp` di Google Apps Script per analizzare scansioni (PDF) e immagini (JPEG, PNG, WEBP) di documenti reali.

#### Scelte Tecniche e di Prestazione:
1. **Latenza Ultra-Bassa (~1-2 secondi)**:
   La scelta della serie **Flash** (`gemini-3.8-flash`) è orientata a consentire un'esperienza operatore in tempo reale: quando un operatore trascina un documento nella modale della Web App, i campi si compilano all'istante.
2. **Schema JSON Vincolato (`response_mime_type: "application/json"`)**:
   L'API forza il modello a rispondere con un JSON conforme allo schema prestabilito, eliminando il testo discorsivo e azzerando le allucinazioni:
   ```json
   {
     "tipoDocumento": "Carta d'Identità" | "Permesso di Soggiorno" | "Attestazione ISEE" | "...",
     "datiPersona": {
       "nome": "string",
       "cognome": "string",
       "codiceFiscale": "string (16 car)",
       "dataNascita": "YYYY-MM-DD",
       "luogoNascita": "string",
       "sesso": "M" | "F",
       "cittadinanza": "string",
       "residenza": "string"
     },
     "datiDocumento": {
       "numeroDocumento": "string",
       "dataEmissione": "YYYY-MM-DD",
       "dataScadenza": "YYYY-MM-DD",
       "valore": number | null,
       "enteRilascio": "string",
       "note": "string"
     }
   }
   ```
3. **Integrazione con il Dominio SSOT**:
   La risposta dell'IA viene passata a `findDocumentType(tipo)` per mappare automaticamente la categoria, l'archetipo temporale, l'icona e l'emoji ufficiale.
4. **Supporto Multi-File Simultaneo**:
   Gemini Flash analizza più allegati contemporaneamente (es. fronte e retro di una CIE, oppure CIE + Tessera Sanitaria + Attestazione ISEE), consolidando l'anagrafica comune in `datiPersona` e restituendo un array `documenti` contenente ciascun file individuato con tipo, scadenza e valore economico.
5. **Normalizzazione Rigorosa Title Case**:
   Il prompt prescrive esplicitamente il Title Case per nomi e comuni (con sigla provincia a 2 lettere maiuscola tra parentesi), e il servizio applica funzioni deterministiche di normalizzazione post-risposta (`normalizeProperCase`, `normalizeCity`, `normalizeAddress`, `normalizeFiscalCode`).
6. **Sicurezza e Configurabilità**:
   La chiave API viene conservata nelle proprietà dello script (`GEMINI_API_KEY`), e il modello può essere variato senza modifiche al codice tramite `GEMINI_MODEL`.

---

### `Fogliofirme.js` e `Diariogiornaliero.js` — Generatori Modulistica
- **`Fogliofirme.js`**: compila il modello di Foglio Firme Individuale mensile per il beneficiario e l'operatore, inserendo le firme autografe archiviate.
- **`Diariogiornaliero.js`**: genera il report giornaliero degli accessi per la rendicontazione delle attività di sportello.
