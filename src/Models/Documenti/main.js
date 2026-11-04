/**
 * @file main.js
 * @description Modulo di utilità e manipolazione per Google Docs e Google Drive.
 * Fornisce funzioni per la clonazione di template Google Docs, la sostituzione avanzata di segnaposto
 * testuali, caselle di spunta (checkbox) e immagini (firme autografe), nonché il popolamento dinamico di tabelle.
 * @module Models/Documenti/Main
 */

/**
 * Crea un documento Google Docs a partire da un template, lo inserisce in una cartella specifica
 * e sostituisce i segnaposto con testo, checkbox spuntate o immagini.
 *
 * @param {string} templateId - ID del file Google Docs usato come template.
 * @param {string} folderId - ID della cartella di Google Drive di destinazione.
 * @param {string} newDocName - Nome da assegnare al nuovo documento creato.
 * @param {Record<string, any>} params - Oggetto chiave/valore contenente i dati da sostituire nei placeholder `{chiave}`.
 * @return {string} L'ID del documento Google Docs appena generato.
 *
 * @example
 * const id = createGoogleDocFromTemplate("templateId123", "folderId456", "Scheda - Mario Rossi", {
 *   operatore: "Lorenzo Mazza",
 *   beneficiario: "Mario Rossi",
 *   data: "10/07/2026",
 *   Iscrizione: true
 * });
 */
function createGoogleDocFromTemplate(templateId, folderId, newDocName, params) {

    // 1. Copia del template nella cartella
    const templateFile = DriveApp.getFileById(templateId);
    const folder = DriveApp.getFolderById(folderId);
    const newFile = templateFile.makeCopy(newDocName, folder);
    const newDocId = newFile.getId();

    // 2. Apri il documento
    const doc = DocumentApp.openById(newDocId);
    const body = doc.getBody();

    // 3. Sostituzione testo, immagini e checkbox
    Object.keys(params).forEach(key => {
        const placeholder = `{${key}}`;
        const value = params[key];

        // --- Caso 1: Checkbox ---
        if (isCheckboxData(value)) {
            handleCheckboxSearchAndReplace(body, key, value);
            return;
        }

        // --- Caso 2: Immagine ---
        if (isImageData(value)) {
            replacePlaceholderWithImage(body, placeholder, value);
            return;
        }

        // --- Caso 3: Testo ---
        if (value != null && value !== "") {
            body.replaceText(placeholder, value);
        } else {
            // nessun valore → pulizia placeholder
            body.replaceText(placeholder, "");
        }
    });

    // 4. Rimuove eventuali placeholder rimasti
    // cleanRemainingPlaceholders(body);

    doc.saveAndClose();
    return newDocId;
}

/**
 * Rimuove tutti i placeholder rimasti non valorizzati nel corpo del documento.
 * Un placeholder è identificato dal formato `{qualcosa}`.
 * 
 * @param {GoogleAppsScript.Document.Body} body - Il corpo (Body) del documento Google Docs.
 * @return {void}
 */
function cleanRemainingPlaceholders(body) {
    // In Google Apps Script, replaceText richiede un pattern regex sotto forma di stringa (con double backslash)
    body.replaceText("\\{[^}]+\\}", "");
}

/**
 * Verifica se un valore corrisponde a un riferimento a un'immagine valida su Google Drive.
 * 
 * @param {*} value - Valore da verificare (ID stringa o oggetto `{ id: string }`).
 * @return {boolean} True se il valore punta a un file con MIME type di tipo immagine.
 */
function isImageData(value) {
    // Caso 1: stringa → ID immagine
    if (typeof value === "string") {
        try {
            return DriveApp.getFileById(value).getMimeType().startsWith("image/");
        } catch (e) {
            return false;
        }
    }

    // Caso 2: oggetto → deve avere .id
    if (typeof value === "object" && value !== null && value.id) {
        try {
            return DriveApp.getFileById(value.id).getMimeType().startsWith("image/");
        } catch (e) {
            return false;
        }
    }

    return false;
}

/**
 * Verifica se un dato rappresenta una configurazione di casella di spunta (checkbox).
 * 
 * @param {*} value - Valore da esaminare (booleano o oggetto con proprietà `check`).
 * @return {boolean} True se è un valore o oggetto di tipo checkbox.
 */
function isCheckboxData(value) {
    if (typeof value === "boolean") return true;
    if (typeof value === "object" && value !== null && value.check !== undefined) return true;
    return false;
}

/**
 * Cerca e spunta una casella di tipo checkbox (☐ o [ ]) associata a una determinata etichetta/chiave.
 * 
 * @param {GoogleAppsScript.Document.Body} body - Il corpo del documento Google Docs.
 * @param {string} key - La chiave di testo che individua la riga della checkbox.
 * @param {boolean|{check: boolean}} value - Il valore booleano di spunta.
 * @return {void}
 */
function handleCheckboxSearchAndReplace(body, key, value) {
    const isChecked = (value === true || (typeof value === "object" && value !== null && value.check === true));
    if (!isChecked) return; // Se non deve essere selezionato, lasciamo com'è (vuoto)

    // Trova ☐ o [ ] seguiti da testo sulla stessa riga che contiene la chiave (case-insensitive)
    const patternBox = "(?i)(☐|\\[ \\])[^\\r\\n]*?" + key;

    let found = body.findText(patternBox);
    if (found) {
        const el = found.getElement().asText();
        const text = el.getText();

        if (text.indexOf("☐") !== -1) {
            el.replaceText("☐", "☑");
        } else if (text.indexOf("[ ]") !== -1) {
            el.replaceText("\\[ \\]", "[x]");
        }
    }
}

/**
 * Verifica se un ID di file su Google Drive punta a un file immagine supportato.
 * 
 * @param {string} fileId - ID del file Google Drive.
 * @return {boolean} True se il file esiste ed è un'immagine, false altrimenti.
 */
function isImageFile(fileId) {
    try {
        const file = DriveApp.getFileById(fileId);
        const mime = file.getMimeType();
        return mime.startsWith("image/");
    } catch (e) {
        return false;
    }
}

/**
 * Sostituisce un segnaposto testuale con un'immagine incorporata (es. firma autografa digitalizzata).
 * 
 * @param {GoogleAppsScript.Document.Body} body - Il corpo del documento Google Docs.
 * @param {string} placeholder - Il testo del segnaposto da sostituire (es. "{firma}").
 * @param {string|{ id: string, width?: number, height?: number }} imageData - ID immagine Drive o oggetto con dimensioni.
 * @return {void}
 */
function replacePlaceholderWithImage(body, placeholder, imageData) {
    const found = body.findText(placeholder);
    if (!found) return;

    const element = found.getElement();
    const parent = element.getParent();
    const index = parent.getChildIndex(element);

    // Gestione flessibile: stringa o oggetto
    let imageId, width, height;

    if (typeof imageData === "string") {
        // Solo ID → nessuna dimensione → usa dimensioni originali
        imageId = imageData;
        width = null;
        height = null;
    } else {
        // Oggetto { id, width?, height? }
        imageId = imageData.id;
        width = imageData.width || null;
        height = imageData.height || null;
    }

    const blob = DriveApp.getFileById(imageId).getBlob();
    const img = parent.insertInlineImage(index + 1, blob);

    // Applica dimensioni solo se specificate
    if (width !== null) img.setWidth(width);
    if (height !== null) img.setHeight(height);

    // Rimuove il segnaposto
    element.asText().deleteText(0, element.asText().getText().length - 1);
}

/**
 * Popola una o più tabelle presenti in un documento Google Docs con matrici di dati fornite.
 * Clona l'ultima riga esistente per preservare formattazione e bordi se le righe attuali non bastano.
 *
 * @param {string} idDocumento - L'ID del documento Google Docs da modificare.
 * @param {...Array<Array<string|number>>} listaDati - Liste 2D di dati: ciascuna matrice corrisponde a una tabella in ordine sequenziale.
 * @return {void}
 */
function addDataToGoogleDocTables(idDocumento, ...listaDati) {
  try {
    var doc = DocumentApp.openById(idDocumento);
  } catch(errore) {
    Logger.log("Errore: Impossibile trovare o accedere al documento con ID: " + idDocumento);
    return;
  }
  
  var body = doc.getBody();
  var tabelleNelDoc = body.getTables();
  
  if (tabelleNelDoc.length === 0) {
    Logger.log("Nessuna tabella trovata nel documento specificato.");
    return;
  }
  
  for (var t = 0; t < listaDati.length; t++) {
    var dati = listaDati[t];
    
    if (t >= tabelleNelDoc.length) {
      Logger.log("Attenzione: Passati dati per la tabella " + (t + 1) + ", ma il documento contiene solo " + tabelleNelDoc.length + " tabelle.");
      break; 
    }
    
    var tabella = tabelleNelDoc[t];
    var numeroRigheAttuali = tabella.getNumRows();
    var rigaInizio = 0;
    
    // 1. Trova la prima riga vuota
    for (var i = 0; i < numeroRigheAttuali; i++) {
      var rigaVuota = true;
      var riga = tabella.getRow(i);
      for (var j = 0; j < riga.getNumCells(); j++) {
        if (riga.getCell(j).getText().trim() !== "") {
          rigaVuota = false;
          break;
        }
      }
      if (rigaVuota) {
        rigaInizio = i;
        break;
      }
      if (i === numeroRigheAttuali - 1) {
        rigaInizio = numeroRigheAttuali;
      }
    }
    
    // 2. Aggiungi nuove righe clonando la formattazione dell'ultima riga esistente
    var righeNecessarie = rigaInizio + dati.length;
    if (righeNecessarie > numeroRigheAttuali) {
      var righeDaAggiungere = righeNecessarie - numeroRigheAttuali;
      
      for (var k = 0; k < righeDaAggiungere; k++) {
        // Prende l'ultima riga attualmente disponibile nella tabella
        var ultimaRigaIndice = tabella.getNumRows() - 1;
        var ultimaRiga = tabella.getRow(ultimaRigaIndice);
        
        // Clona l'ultima riga (copia esatta di stili, celle e contenuti)
        var nuovaRiga = ultimaRiga.copy();
        
        // Svuota il testo ereditato dalle celle della nuova riga appena clonata
        for (var c = 0; c < nuovaRiga.getNumCells(); c++) {
          nuovaRiga.getCell(c).setText("");
        }
        
        // Appende la nuova riga formattata alla fine della tabella
        tabella.appendTableRow(nuovaRiga);
      }
    }
    
    // 3. Scrittura dei dati cella per cella
    for (var r = 0; r < dati.length; r++) {
      var rigaCorrente = tabella.getRow(rigaInizio + r);
      for (var c = 0; c < dati[r].length; c++) {
        // Se i dati hanno più colonne delle celle clonate, aggiunge una cella vuota
        if (c >= rigaCorrente.getNumCells()) {
          rigaCorrente.appendTableCell();
        }
        rigaCorrente.getCell(c).setText(dati[r][c].toString());
      }
    }
  }
}
