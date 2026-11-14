# Modulo Service Sync (`src/Service/Sync`)

## 1. Responsabilità Architetturale

Il modulo `src/Service/Sync` gestisce la sincronizzazione in tempo reale e bidirezionale tra i fogli di configurazione nascosti (`_Dati*`), le proprietà di script persistenti (`ScriptProperties`), la cache in memoria RAM di Google Apps Script (`CacheService`) e i Named Ranges del foglio di calcolo attivo:

1. **`DomainSyncService.js`**:
   - Legge i fogli di configurazione:
     - `_DatiBeneficiari` $\rightarrow$ `DATI_BENEFICIARI` (*Criticità, Relazioni, Stato Civile, Abitazione, Status lavorativo*)
     - `_DatiDocumenti` $\rightarrow$ `DATI_DOCUMENTI` (*ID, Nome Visualizzato, Categoria, Archetipo, Valore, Scadenza, Scope, Note*)
     - `_DatiSportelli` $\rightarrow$ `DATI_SPORTELLI` (*Servizi*)
     - `_DatiOperatori` $\rightarrow$ `DATI_OPERATORI` (*Anagrafica staff, ruoli, email, ore*)
     - `_OrarioOperatori` $\rightarrow$ `DATI_ORARI` (*Turnazione e orari*)
   - Assembla e pubblica `DATI_BUNDLE` e `DATI_LAST_SYNC` per il caricamento istantaneo della WebApp (`getInitialAppData`).
   - Auto-dimensiona i Named Ranges (`Criticità`, `Relazioni`, `StatoCivile`, `Abitazione`, `StatoLavorativo`, `TipiDocumenti`, `Sportello_Servizi`, `Operatori`) sull'esatto numero di righe popolate per eliminare righe vuote nei menu a tendina.
   - Fornisce l'aggancio per il trigger `onEdit(e)`.

---

## 2. Modello a Doppio Canale (Two-Tier Storage)

- **Livello 1 (Cache RAM - TTL 6 ore)**: lettura in **~2 ms**.
- **Livello 2 (ScriptProperties - Permanente)**: lettura in **~15 ms**.
- **Runtime WebApp**: **0 chiamate a `SpreadsheetApp`** per il recupero delle lookup lists.

---

## 3. Alternative Scartate e Motivazioni

- **Lettura diretta dei Named Ranges a ogni avvio della WebApp**:
  Scartata perché ogni chiamata a `getRangeByName()` su SpreadsheetApp richiede 300-800 ms. Con 8-10 Named Ranges, il tempo di avvio della WebApp superava i 5-8 secondi.
- **CacheService da solo senza ScriptProperties**:
  Scartata perché `CacheService` ha una durata massima di 6 ore e viene invalidata automaticamente dai server Google in condizioni di carico, costringendo a frequenti riletture da foglio.
  L'adozione di `ScriptProperties` come livello L2 garantisce persistenza infinita con dimensioni di payload compresse (~2.5 KB su max 9 KB ammessi).
