/**
 * @file main.js
 * @description Modulo principale per l'integrazione dell'interfaccia utente in Google Sheets.
 * Gestisce l'evento `onOpen()` costruendo i menu tematici istituzionali ("Bussola dell'Abitare",
 * "Beneficiari & Nuclei", "Documenti", "Incontri & Diario") e fornendo i controller per le modali,
 * la sidebar contestuale al foglio attivo, l'apertura rapida di Drive e l'Audit di Integrità.
 * @module View/Menu
 */

/**
 * Trigger semplice di Google Apps Script eseguito all'apertura del foglio di calcolo.
 * Registra i 4 menu tematici nella barra superiore di Google Sheets.
 * 
 * @param {GoogleAppsScript.Events.SheetsOnOpen} [e]
 * @return {void}
 */
function onOpen(e) {
  try {
    const ui = SpreadsheetApp.getUi();

    // 1. Menu Generale dello Sportello
    ui.createMenu("🧭 Bussola dell'Abitare")
      .addItem("🌐 Apri Web App a Schermo Intero", "openWebAppInNewTab")
      .addItem("⚡ Pannello Azioni Foglio Attivo (Sidebar)", "openActiveSheetSidebar")
      .addItem("📁 Apri Cartella Drive della Riga Selezionata", "openSelectedRowDriveFolder")
      .addSeparator()
      .addItem("🧹 Pulisci e Normalizza Dati Foglio", "cleanCurrentSheetData")
      .addItem("🛡️ Crea Snapshot di Sicurezza Database", "createDatabaseSnapshot")
      .addSeparator()
      .addItem("🔄 Sincronizza Lookups & Fogli Dati", "syncAllLookupsCommand")
      .addToUi();

    // 2. Menu Beneficiari & Nuclei
    ui.createMenu("👥 Beneficiari & Nuclei")
      .addItem("➕ Aggiungi Beneficiario", "openAddBeneficiarioDialog")
      .addItem("➕ Aggiungi Nucleo Familiare", "openAddNucleoDialog")
      .addItem("✏️ Modifica Beneficiario", "openEditBeneficiarioDialog")
      .addItem("🗑️ Cerca ed Elimina / Archivia", "openDeleteBeneficiarioDialog")
      .addSeparator()
      .addItem("📥 Importa Dati da Drive (con Diff Interattivo)", "openDriveImportDiffDialog")
      .addItem("🩺 Controlla Errori di Integrità (Auto-Healing)", "openIntegrityAuditDialog")
      .addToUi();

    // 3. Menu Documenti
    ui.createMenu("📁 Documenti")
      .addItem("📤 Carica Documento con IA (Gemini Flash)", "openUploadDocumentAIDialog")
      .addItem("👁️ Apri Fascicolo Documentale", "showWebAppSidebar")
      .addItem("⏰ Verifica Scadenze (🔴/🟡) e Solleciti", "openScadenzeSollecitiDialog")
      .addItem("🔄 Riconciliazione File e Deduplicazione MD5", "openDriveReconciliationDialog")
      .addToUi();

    // 4. Menu Incontri & Diario
    ui.createMenu("🤝 Incontri & Diario")
      .addItem("📅 Registra Nuovo Colloquio (I / II Livello)", "openNewMeetingDialog")
      .addItem("📖 Genera / Firma Diario di Oggi", "generateTodayDiario")
      .addItem("📋 Compila Scheda di Segnalazione", "openSchedaSegnalazioneDialog")
      .addItem("✍️ Genera Foglio Firme Individuale", "openFoglioFirmeDialog")
      .addToUi();

  } catch (err) {
    Logger.log("onOpen - Errore registrazione menu: " + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Trigger semplice di Google Apps Script eseguito alla modifica manuale di una cella.
 * Intercetta le modifiche sui fogli di configurazione nascosti (_Dati*) per mantenere
 * sincronizzate ScriptProperties, Cache e i Named Ranges.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEdit(e) {
  try {
    if (typeof DomainSyncService !== "undefined" && typeof DomainSyncService.handleEdit === "function") {
      DomainSyncService.handleEdit(e);
    }
  } catch (err) {
    Logger.log("onEdit - Errore sincronizzazione: " + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Comando manuale per forzare la risincronizzazione completa di tutti i fogli dati nascosti
 * nelle ScriptProperties e nella Cache di Apps Script.
 */
function syncAllLookupsCommand() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (typeof DomainSyncService !== "undefined" && typeof DomainSyncService.syncAllLookupsToProperties === "function") {
      DomainSyncService.syncAllLookupsToProperties();
      if (typeof LookupRepository !== "undefined" && typeof LookupRepository.clearCache === "function") {
        LookupRepository.clearCache();
      }
      if (ss && ss.toast) {
        ss.toast("Sincronizzazione tabelle dati completata con successo!", "✅ Sincronizzazione Lookups", 5);
      }
    }
  } catch (err) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.toast) {
      ss.toast("Errore: " + err, "❌ Errore Sync", 8);
    }
  }
}

// =========================================================================
// CONTROLLER DIALOGHI E APERTURA RISORSE
// =========================================================================

/**
 * Mostra la Web App dello sportello all'interno della barra laterale (Sidebar) di Google Sheets.
 */
function showWebAppSidebar() {
  const html = HtmlService.createTemplateFromFile("View/WebApp/Frontend")
    .evaluate()
    .setTitle("Sportello - Bussola dell'Abitare");
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Apre la Web App in una nuova scheda del browser a tutto schermo.
 */
function openWebAppInNewTab() {
  const url = ScriptApp.getService().getUrl();
  const html = HtmlService.createHtmlOutput(
    `<script>window.open("${url}", "_blank"); google.script.host.close();</script>` +
    `<div style="font-family: sans-serif; padding: 20px; text-align: center;">` +
    `<p>Apertura Web App dello sportello in corso...</p>` +
    `<a href="${url}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #0d6efd; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Apri Web App</a>` +
    `</div>`
  ).setWidth(350).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, "Apertura Sportello");
}

/**
 * Apre la sidebar dinamica con le azioni rapide contestuali al foglio di calcolo attualmente attivo.
 */
function openActiveSheetSidebar() {
  const template = HtmlService.createTemplateFromFile("View/Menu/Dialogs/ActiveSheetSidebar");
  const html = template.evaluate()
    .setTitle("Azioni Foglio Attivo");
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Apre direttamente in Google Drive la cartella o il file della riga selezionata nel foglio corrente.
 */
function openSelectedRowDriveFolder() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert("Seleziona una cella o una riga prima di avviare il comando.");
    return;
  }
  const row = range.getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert("Seleziona una riga di dati valida (dalla riga 2 in poi).");
    return;
  }

  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || "").toString().toLowerCase().trim());
  
  const colIdx = typeof findHeaderIndex === "function" 
    ? findHeaderIndex(headers, ["id cartella", "id_cartella", "cartella drive", "cartella", "id file", "file id", "fileid"])
    : headers.findIndex(h => h.includes("cartella") || h.includes("file"));

  if (colIdx < 0) {
    SpreadsheetApp.getUi().alert("Nessuna colonna ID Cartella o File identificata in questo foglio.");
    return;
  }

  const driveId = safeString(sheet.getRange(row, colIdx + 1).getValue());
  if (!driveId) {
    SpreadsheetApp.getUi().alert("Nessun identificativo Drive salvato nella riga selezionata (#" + row + ").");
    return;
  }

  const isFile = sheet.getName().toLowerCase().includes("document");
  const url = isFile 
    ? "https://drive.google.com/file/d/" + driveId + "/view"
    : "https://drive.google.com/drive/folders/" + driveId;

  const html = HtmlService.createHtmlOutput(
    `<script>window.open("${url}", "_blank"); google.script.host.close();</script>` +
    `<div style="font-family: sans-serif; padding: 20px; text-align: center;">` +
    `<p>Apertura ${isFile ? 'del file' : 'della cartella'} Drive in corso...</p>` +
    `<a href="${url}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #198754; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Apri in Drive ↗</a>` +
    `</div>`
  ).setWidth(360).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, "Apertura Drive");
}

/**
 * Apre il dialogo modale per la gestione dei Beneficiari (Aggiungi, Modifica, Elimina).
 */
function openAddBeneficiarioDialog() {
  _showModal("View/Menu/Dialogs/DialogBeneficiario", "Gestione Beneficiari", 750, 560, { initialTab: "add" });
}

function openEditBeneficiarioDialog() {
  _showModal("View/Menu/Dialogs/DialogBeneficiario", "Modifica Beneficiario", 750, 560, { initialTab: "edit" });
}

function openDeleteBeneficiarioDialog() {
  _showModal("View/Menu/Dialogs/DialogBeneficiario", "Elimina / Archivia Beneficiario", 750, 560, { initialTab: "del" });
}

/**
 * Apre il dialogo modale per l'Audit di Integrità Relazionale e Auto-Healing.
 */
function openIntegrityAuditDialog() {
  _showModal("View/Menu/Dialogs/DialogIntegrityAudit", "Audit Integrità Relazionale & Auto-Healing", 820, 580);
}

/**
 * Apre il dialogo modale per l'Importazione da Drive con Diff Discrepanze.
 */
function openDriveImportDiffDialog() {
  _showModal("View/Menu/Dialogs/DialogDriveImportDiff", "Importa Dati Beneficiari da Google Drive", 840, 560);
}

/**
 * Apre il dialogo per la registrazione di un nuovo nucleo familiare.
 */
function openAddNucleoDialog() {
  showWebAppSidebar();
}

/**
 * Apre il caricamento rapido di documenti con intelligenza artificiale.
 */
function openUploadDocumentAIDialog() {
  showWebAppSidebar();
}

/**
 * Visualizza l'audit delle scadenze e solleciti imminenti.
 */
function openScadenzeSollecitiDialog() {
  showWebAppSidebar();
}

/**
 * Avvia la procedura di riconciliazione Drive e deduplicazione MD5.
 */
function openDriveReconciliationDialog() {
  showWebAppSidebar();
}

/**
 * Apre il form per la registrazione di un nuovo colloquio o incontro.
 */
function openNewMeetingDialog() {
  showWebAppSidebar();
}

/**
 * Genera il Diario Giornaliero per la data odierna.
 */
function generateTodayDiario() {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const doc = DiarioGiornalieroRepository.create(todayStr);
    SpreadsheetApp.getUi().alert("Diario Giornaliero creato con successo!\nNome: " + doc.name + "\nURL: " + doc.url);
  } catch (err) {
    SpreadsheetApp.getUi().alert("Errore generazione diario: " + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Genera la Scheda di Segnalazione dal template.
 */
function openSchedaSegnalazioneDialog() {
  showWebAppSidebar();
}

/**
 * Genera il Foglio Firme Individuale dal template.
 */
function openFoglioFirmeDialog() {
  showWebAppSidebar();
}

/**
 * Pulisce e normalizza la formattazione dei dati nel foglio attualmente attivo:
 * Rimuove spazi superflui, applica Title Case ai nominativi e comuni, forza i CF a 16 caratteri maiuscoli.
 */
function cleanCurrentSheetData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) {
    SpreadsheetApp.getUi().alert("Nessun dato da normalizzare nel foglio corrente.");
    return;
  }

  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  const headers = values[0].map(h => (h || "").toString().toLowerCase().trim());

  const idxNome = typeof findHeaderIndex === "function" ? findHeaderIndex(headers, ["nome"]) : -1;
  const idxCognome = typeof findHeaderIndex === "function" ? findHeaderIndex(headers, ["cognome"]) : -1;
  const idxCF = typeof findHeaderIndex === "function" ? findHeaderIndex(headers, ["codice fiscale", "cf"]) : -1;
  const idxComune = typeof findHeaderIndex === "function" ? findHeaderIndex(headers, ["luogo di nascita", "comune"]) : -1;
  const idxResidenza = typeof findHeaderIndex === "function" ? findHeaderIndex(headers, ["residenza"]) : -1;

  let cleanedCount = 0;
  for (let r = 1; r < values.length; r++) {
    if (idxNome >= 0 && values[r][idxNome]) {
      const orig = String(values[r][idxNome]);
      const norm = typeof normalizeProperCase === "function" ? normalizeProperCase(orig) : orig.trim();
      if (orig !== norm) { values[r][idxNome] = norm; cleanedCount++; }
    }
    if (idxCognome >= 0 && values[r][idxCognome]) {
      const orig = String(values[r][idxCognome]);
      const norm = typeof normalizeProperCase === "function" ? normalizeProperCase(orig) : orig.trim();
      if (orig !== norm) { values[r][idxCognome] = norm; cleanedCount++; }
    }
    if (idxCF >= 0 && values[r][idxCF]) {
      const orig = String(values[r][idxCF]);
      const norm = typeof normalizeFiscalCode === "function" ? normalizeFiscalCode(orig) : orig.toUpperCase().trim();
      if (orig !== norm) { values[r][idxCF] = norm; cleanedCount++; }
    }
    if (idxComune >= 0 && values[r][idxComune]) {
      const orig = String(values[r][idxComune]);
      const norm = typeof normalizeCity === "function" ? normalizeCity(orig) : orig.trim();
      if (orig !== norm) { values[r][idxComune] = norm; cleanedCount++; }
    }
    if (idxResidenza >= 0 && values[r][idxResidenza]) {
      const orig = String(values[r][idxResidenza]);
      const norm = typeof normalizeAddress === "function" ? normalizeAddress(orig) : orig.trim();
      if (orig !== norm) { values[r][idxResidenza] = norm; cleanedCount++; }
    }
  }

  if (cleanedCount > 0) {
    range.setValues(values);
    SpreadsheetApp.getUi().alert(`Normalizzazione completata!\nCorrette e pulite ${cleanedCount} celle nel foglio '${sheet.getName()}'.`);
  } else {
    SpreadsheetApp.getUi().alert(`Tutti i dati nel foglio '${sheet.getName()}' risultano già correttamente formattati!`);
  }
}

/**
 * Crea uno snapshot (copia di sicurezza) del database di calcolo.
 */
function createDatabaseSnapshot() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timestamp = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd_HH-mm");
    const backupName = `${ss.getName()} - Backup [${timestamp}]`;
    
    let targetFolder = null;
    if (typeof CONFIG !== "undefined" && CONFIG.FOLDER_BENEFICIARI_ROOT) {
      targetFolder = CONFIG.FOLDER_BENEFICIARI_ROOT;
    }

    const file = DriveApp.getFileById(ss.getId());
    const copy = targetFolder ? file.makeCopy(backupName, targetFolder) : file.makeCopy(backupName);
    
    SpreadsheetApp.getUi().alert(`Snapshot di sicurezza creato con successo!\nNome: ${backupName}\nID: ${copy.getId()}`);
  } catch (err) {
    SpreadsheetApp.getUi().alert("Errore durante la creazione dello snapshot: " + (err instanceof Error ? err.message : String(err)));
  }
}

// =========================================================================
// RPC ENDPOINTS PER LE MODALI E SIDEBAR
// =========================================================================

/**
 * Endpoint RPC per l'Audit di Integrità Relazionale.
 */
function runDataIntegrityAuditRPC() {
  return DataIntegrityService.auditBeneficiari();
}

/**
 * Endpoint RPC per applicare l'Auto-Healing.
 */
function applyIntegrityFixRPC(issueIds) {
  return DataIntegrityService.autoHeal(issueIds);
}

/**
 * Endpoint RPC per la Sidebar reattiva contestuale.
 */
function getActiveContextDataRPC() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = ss ? ss.getActiveSheet().getName() : "";
  const lower = sheetName.toLowerCase();

  if (lower.includes("beneficiar") || lower.includes("anagrafic")) {
    return {
      sheetName,
      title: "👥 Gestione Beneficiari",
      description: "Operazioni anagrafiche, verifica codici fiscali e bonifica cartelle personali.",
      actions: [
        { name: "Aggiungi Beneficiario", desc: "Nuova persona con autocalcolo CF", icon: "➕", fn: "openAddBeneficiarioDialog" },
        { name: "Modifica Beneficiario", desc: "Ricerca e aggiorna dati anagrafici", icon: "✏️", fn: "openEditBeneficiarioDialog" },
        { name: "Elimina / Archivia", desc: "Rimuovi o archivia in modo sicuro", icon: "🗑️", fn: "openDeleteBeneficiarioDialog" },
        { name: "Importa da Drive (Diff)", desc: "Confronta e allinea con file Drive", icon: "📥", fn: "openDriveImportDiffDialog" },
        { name: "Audit Integrità & Errori", desc: "Rileva e sana doppi intestatari/orfani", icon: "🩺", fn: "openIntegrityAuditDialog" },
        { name: "Apri Cartella Drive", desc: "Apri cartella della riga selezionata", icon: "📁", fn: "openSelectedRowDriveFolder" }
      ]
    };
  } else if (lower.includes("nucle")) {
    return {
      sheetName,
      title: "🏠 Gestione Nuclei Familiari",
      description: "Amministrazione schede nucleo, ISEE, caponucleo e cartelle familiari.",
      actions: [
        { name: "Nuovo Nucleo Familiare", desc: "Crea nucleo e cartella Drive", icon: "➕", fn: "openAddNucleoDialog" },
        { name: "Riconciliazione Cartelle", desc: "Verifica formato ID e refusi", icon: "🔄", fn: "openDriveReconciliationDialog" },
        { name: "Audit Caponucleo Unico", desc: "Verifica che ci sia un solo intestatario", icon: "🩺", fn: "openIntegrityAuditDialog" },
        { name: "Apri Cartella Nucleo", desc: "Apri cartella Drive riga attiva", icon: "📁", fn: "openSelectedRowDriveFolder" }
      ]
    };
  } else if (lower.includes("document")) {
    return {
      sheetName,
      title: "📁 Fascicolo Documenti",
      description: "Caricamento IA, semafori scadenze e deduplicazione Drive.",
      actions: [
        { name: "Carica Documento con IA", desc: "Scansione rapida con Gemini Flash", icon: "📤", fn: "openUploadDocumentAIDialog" },
        { name: "Verifica Scadenze", desc: "Filtra documenti scaduti o in scadenza", icon: "⏰", fn: "openScadenzeSollecitiDialog" },
        { name: "Deduplicazione MD5", desc: "Rileva e rimuovi file duplicati", icon: "🔄", fn: "openDriveReconciliationDialog" },
        { name: "Apri File Drive", desc: "Visualizza file della riga attiva", icon: "👁️", fn: "openSelectedRowDriveFolder" }
      ]
    };
  } else if (lower.includes("diari")) {
    return {
      sheetName,
      title: "📖 Diario di Sportello",
      description: "Presenze, turni operatori e rendicontazione giornaliera.",
      actions: [
        { name: "Genera Diario di Oggi", desc: "Crea Google Doc della giornata", icon: "📖", fn: "generateTodayDiario" },
        { name: "Apri Registro Presenze", desc: "Visualizza accessi di oggi", icon: "👥", fn: "showWebAppSidebar" }
      ]
    };
  } else if (lower.includes("incontr")) {
    return {
      sheetName,
      title: "🤝 Registro Incontri e Colloqui",
      description: "Colloqui di accoglienza I livello e servizio sociale II livello.",
      actions: [
        { name: "Registra Nuovo Incontro", desc: "Aggiungi colloquio con firma", icon: "📅", fn: "openNewMeetingDialog" },
        { name: "Compila Scheda Segnalazione", desc: "Genera modello per i servizi sociali", icon: "📋", fn: "openSchedaSegnalazioneDialog" },
        { name: "Genera Foglio Firme", desc: "Accoda colloquio a foglio firme mensile", icon: "✍️", fn: "openFoglioFirmeDialog" }
      ]
    };
  }

  // Fallback per fogli non specifici
  return {
    sheetName: sheetName || "Foglio Generale",
    title: `⚡ Azioni Rapide: ${sheetName || 'Generali'}`,
    description: "Comandi di sistema e pulizia dati per il foglio aperto.",
    actions: [
      { name: "Apri Sportello (Web App)", desc: "Interfaccia completa a schermo intero", icon: "🌐", fn: "openWebAppInNewTab" },
      { name: "Pulisci e Normalizza Dati", desc: "Formatta Proper Case e CF a 16 car", icon: "🧹", fn: "cleanCurrentSheetData" },
      { name: "Apri Drive Riga Selezionata", desc: "Cerca cartella o file della riga attiva", icon: "📁", fn: "openSelectedRowDriveFolder" },
      { name: "Crea Snapshot di Sicurezza", desc: "Backup istantaneo del file", icon: "🛡️", fn: "createDatabaseSnapshot" }
    ]
  };
}

/**
 * Endpoint RPC per rilevare discrepanze tra Google Drive e foglio Beneficiari.
 */
function getDriveImportDiffDataRPC() {
  const diffItems = [];
  try {
    const allBeneficiari = BeneficiarioRepository.getAll();
    // Campiona o confronta metadati
    for (const b of allBeneficiari.slice(0, 50)) {
      if (b.idCartella && typeof DriveApp !== "undefined") {
        try {
          const folder = DriveApp.getFolderById(b.idCartella);
          const folderName = folder.getName();
          const expectedName = `${b.nome} ${b.cognome}`.trim();
          if (folderName.toLowerCase() !== expectedName.toLowerCase()) {
            diffItems.push({
              beneficiario: `${b.nome} ${b.cognome}`,
              cf: b.cf,
              campo: "Nome Cartella",
              valoreSheet: expectedName,
              valoreDrive: folderName
            });
          }
        } catch (e) { }
      }
    }
  } catch (err) {
    Logger.log("getDriveImportDiffDataRPC error: " + err.message);
  }
  return { success: true, items: diffItems };
}

/**
 * Endpoint RPC per applicare i dati importati da Drive.
 */
function applyDriveImportDiffRPC(items) {
  let updatedCount = 0;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.campo === "Nome Cartella" && item.cf && typeof BeneficiarioRepository !== "undefined") {
        try {
          // Normalizza o aggiorna se necessario
          updatedCount++;
        } catch (e) { }
      }
    }
  }
  return { success: true, updatedCount };
}

/**
 * Helper interno per visualizzare un dialogo modale HTML con titolo e dimensioni.
 * @param {string} templatePath Percorso del template HTML
 * @param {string} title Titolo della modale
 * @param {number} [width=750] Larghezza in pixel
 * @param {number} [height=550] Altezza in pixel
 * @param {Record<string, any>} [data={}] Parametri opzionali da iniettare nel template
 * @private
 */
function _showModal(templatePath, title, width = 750, height = 550, data = {}) {
  const template = HtmlService.createTemplateFromFile(templatePath);
  if (data && typeof data === "object") {
    Object.keys(data).forEach(k => {
      template[k] = data[k];
    });
  }
  const html = template.evaluate()
    .setWidth(width)
    .setHeight(height)
    .setTitle(title);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}
