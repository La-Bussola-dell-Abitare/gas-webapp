# Modulo Menu e Interfaccia Google Sheets (`src/View/Menu`)

## 1. Responsabilità Architetturale

La cartella `src/View/Menu` gestisce l'integrazione con l'ambiente nativo di **Google Sheets**, costruendo i menu personalizzati all'avvio (`onOpen`), coordinando i dialog modali HTML Bootstrap e offrendo una **Sidebar reattiva contestuale** che adatta i propri comandi al foglio di calcolo attualmente aperto dall'operatore.

---

## 2. File del Modulo

### `main.js` — Registrazione Menu e Controller Azioni
- **`onOpen(e)`**: inietta i 4 menu tematici nella barra superiore di Google Sheets:
  1. `🧭 Bussola dell'Abitare` (Web App a tutto schermo, Sidebar contestuale, Apri Drive riga selezionata, Normalizzazione e Snapshot sicurezza).
  2. `👥 Beneficiari & Nuclei` (Aggiungi, Modifica, Elimina con ricerca, Import da Drive con Diff, Audit Integrità & Auto-Healing).
  3. `📁 Documenti` (Carica con IA, Fascicolo Documenti, Verifica Scadenze, Deduplicazione MD5).
  4. `🤝 Incontri & Diario` (Nuovo Incontro, Diario di Oggi, Scheda Segnalazione, Foglio Firme).
- **`openSelectedRowDriveFolder()`**: identifica la colonna cartella/file della riga selezionata nel foglio corrente e apre direttamente il link in Google Drive.
- **`cleanCurrentSheetData()`**: normalizza i campi di testo del foglio (Title Case per nomi/comuni, Codice Fiscale a 16 caratteri maiuscoli, rimozione spazi superflui).
- **`createDatabaseSnapshot()`**: genera istantaneamente una copia di backup timestampata del foglio su Google Drive.

### Dialoghi Modali HTML (`src/View/Menu/Dialogs/`)
- **`DialogIntegrityAudit.html`**: interfaccia modale con metriche riepilogative, lista filtrata per severità (🔴 ERRORE, 🟡 ATTENZIONE, 🔵 INFO), pulsante "Risolvi" singolo e pulsante "🚀 Esegui Auto-Healing in Blocco".
- **`DialogBeneficiario.html`**: interfaccia modale a 3 schede (Aggiungi, Modifica, Elimina):
  - Riceve `initialTab` (`add`, `edit`, `del`) da `main.js` aprendo direttamente la scheda richiesta dal menu.
  - Interroga `getBeneficiariObjects()` per disporre di oggetti strutturati completi.
  - Implementa motore di ricerca client su Nome Cognome, Cognome Nome e Codice Fiscale, con selezione per indice numerico sicuro (`selectBeneficiaryByIndex`) e prevenzione injection XSS (`escapeHtml`).
  - Invia `isUpdate: true` e `originalCF` nel payload di modifica per consentire aggiornamenti e correzioni del Codice Fiscale in `BeneficiarioRepository.add()`.
- **`DialogDriveImportDiff.html`**: tabella di confronto side-by-side tra file su Drive e righe del foglio prima dell'importazione.
- **`ActiveSheetSidebar.html`**: pannello laterale intelligente che interroga `getActiveContextDataRPC()` e visualizza le azioni rapide del foglio attivo (Beneficiari, Nuclei, Documenti, Diario, Incontri).

---

## 3. Scelte Architetturali e Vincoli Google Apps Script

1. **Menu Statici e Azioni Contestuali Dinamiche**:
   In Google Apps Script, `createMenu` può essere eseguito solo all'apertura del documento (`onOpen`). Poiché non è possibile ridisegnare la barra dei menu ad ogni cambio di tab (`onSelectionChange`), l'interazione dinamica è delegata alla **Sidebar contestuale** che rileva il foglio corrente (`SpreadsheetApp.getActiveSheet().getName()`) e renderizza istantaneamente le azioni pertinenti.
2. **Apertura Link Drive da Sheets**:
   Apps Script non consente `window.open` dal codice server: `openSelectedRowDriveFolder` crea una modale minima temporanea che esegue `window.open(url, '_blank')` e si chiude istantaneamente, garantendo un'esperienza utente fluida.
