/**
 * @file Documento.js
 * @description Repository per l'accesso e la persistenza dei documenti del fascicolo sul foglio Google 'Documenti'.
 * Gestisce la creazione automatica del foglio con intestazioni se non presente, la generazione dell'ID numerico progressivo,
 * il caricamento massivo, il filtraggio per intestatario (codice fiscale), il salvataggio atomico e l'eliminazione.
 * @module Repository/Documento
 */

/**
 * Repository per gestire le operazioni CRUD sui documenti.
 */
class DocumentoRepository {
  /**
   * Restituisce o inizializza il foglio Google 'Documenti'.
   * Se il foglio non esiste, lo crea automaticamente applicando la formattazione e le intestazioni ufficiali.
   * @return {GoogleAppsScript.Spreadsheet.Sheet}
   */
  static getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Spreadsheet attivo non trovato.");

    const sheetName = (typeof CONFIG !== "undefined" && CONFIG.SHEET_DOCUMENTI) || "Documenti";
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log("DocumentoRepository: creo il foglio '" + sheetName + "' con intestazioni...");
      sheet = ss.insertSheet(sheetName);

      const headers = (typeof CONFIG !== "undefined" && CONFIG.HEADERS_DOCUMENTI) || [
        "ID Documento",
        "Intestatario",
        "Tipo",
        "Categoria",
        "Valore",
        "Data Emissione",
        "Data Scadenza",
        "ID Drive",
        "Note",
        "Data Inserimento"
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f1f5f9")
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    return sheet;
  }

  /**
   * Mappa gli indici delle colonne in base alle intestazioni trovate nella riga 1.
   * @private
   * @param {string[]} headers - Array delle intestazioni del foglio.
   * @return {Record<string, number>}
   */
  static _getColIndexes(headers) {
    return {
      id: findHeaderIndex(headers, ["id documento", "id_documento", "id"]),
      intestatario: findHeaderIndex(headers, ["intestatario", "codice fiscale", "cf", "beneficiario"]),
      tipo: findHeaderIndex(headers, ["tipo", "tipo documento", "tipologia"]),
      categoria: findHeaderIndex(headers, ["categoria", "ambito"]),
      valore: findHeaderIndex(headers, ["valore", "importo", "valore economico", "isee"]),
      dataEmissione: findHeaderIndex(headers, ["data emissione", "emissione", "rilascio", "data rilascio"]),
      dataScadenza: findHeaderIndex(headers, ["data scadenza", "scadenza", "termine"]),
      idDrive: findHeaderIndex(headers, ["id drive", "drive id", "id_drive", "drive"]),
      note: findHeaderIndex(headers, ["note", "annotazioni", "osservazioni"]),
      dataInserimento: findHeaderIndex(headers, ["data inserimento", "inserimento", "timestamp", "creato il"])
    };
  }

  /**
   * Genera il prossimo ID numerico progressivo per il foglio 'Documenti'.
   * Se il foglio è vuoto o non ha ID validi, riparte da 1.
   * @return {number}
   */
  static generateNextId() {
    try {
      const sheet = DocumentoRepository.getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return 1;

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const idx = DocumentoRepository._getColIndexes(headers);
      if (idx.id < 0) return 1;

      const idValues = sheet.getRange(2, idx.id + 1, lastRow - 1, 1).getValues();
      let maxId = 0;

      for (let i = 0; i < idValues.length; i++) {
        const val = idValues[i][0];
        const num = parseInt(String(val).trim(), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }

      return maxId + 1;
    } catch (e) {
      Logger.log("DocumentoRepository.generateNextId errore: " + e.message);
      return 1;
    }
  }

  /**
   * Recupera tutti i documenti presenti nel foglio.
   * @return {Documento[]}
   */
  static getAll() {
    try {
      const sheet = DocumentoRepository.getSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return [];

      const headers = data[0].map(h => h.toString().trim().toLowerCase());
      const idx = DocumentoRepository._getColIndexes(headers);

      const list = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const intestatario = idx.intestatario >= 0 ? safeString(row[idx.intestatario]) : "";
        const tipo = idx.tipo >= 0 ? safeString(row[idx.tipo]) : "";
        const id = idx.id >= 0 ? safeString(row[idx.id]) : "";

        if (intestatario || tipo || id) {
          try {
            list.push(Documento.fromRow(row, idx));
          } catch (rowErr) {
            Logger.log("DocumentoRepository.getAll errore riga " + (i + 1) + ": " + rowErr.message);
          }
        }
      }
      return list;
    } catch (e) {
      Logger.log("DocumentoRepository.getAll errore: " + e.message);
      return [];
    }
  }

  /**
   * Recupera tutti i documenti associati a un beneficiario cercando per codice fiscale.
   * @param {string} cf - Codice fiscale del beneficiario.
   * @return {Documento[]}
   */
  static getByCF(cf) {
    if (!cf) return [];
    const cleanCF = cf.toString().trim().toUpperCase();
    return DocumentoRepository.getAll().filter(doc => doc.intestatario === cleanCF);
  }

  /**
   * Recupera un singolo documento per ID univoco.
   * @param {number|string} id - ID del documento.
   * @return {Documento|null}
   */
  static getById(id) {
    const targetId = Number(id);
    if (isNaN(targetId)) return null;
    const all = DocumentoRepository.getAll();
    return all.find(d => d.id === targetId) || null;
  }

  /**
   * Registra un nuovo documento o aggiorna un documento esistente sul foglio 'Documenti'.
   * @param {Record<string, any>} data - Dati del documento da inserire o aggiornare.
   * @return {{ success: boolean; message: string; data?: Record<string, any> }}
   */
  static add(data = {}) {
    try {
      const intestatario = (data.intestatario || "").toString().trim().toUpperCase();
      if (!intestatario) {
        return { success: false, message: "Codice fiscale intestatario obbligatorio." };
      }

      const tipo = (data.tipo || "").toString().trim();
      if (!tipo) {
        return { success: false, message: "Tipologia documento obbligatoria." };
      }

      const sheet = DocumentoRepository.getSheet();
      const lastRow = sheet.getLastRow();
      const lastCol = Math.max(sheet.getLastColumn(), 1);
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const idx = DocumentoRepository._getColIndexes(headers);

      // Assicura l'esistenza di tutte le colonne fondamentali
      const requiredCols = [
        { key: "id", name: "ID Documento" },
        { key: "intestatario", name: "Intestatario" },
        { key: "tipo", name: "Tipo" },
        { key: "categoria", name: "Categoria" },
        { key: "valore", name: "Valore" },
        { key: "dataEmissione", name: "Data Emissione" },
        { key: "dataScadenza", name: "Data Scadenza" },
        { key: "idDrive", name: "ID Drive" },
        { key: "note", name: "Note" },
        { key: "dataInserimento", name: "Data Inserimento" }
      ];

      for (let c = 0; c < requiredCols.length; c++) {
        const item = requiredCols[c];
        if (idx[item.key] < 0) {
          idx[item.key] = ensureHeaderIndex(sheet, item.name);
        }
      }

      const isUpdate = !!(data.id && Number(data.id));
      let docId = isUpdate ? Number(data.id) : DocumentoRepository.generateNextId();
      let targetRowIndex = -1;

      if (isUpdate && lastRow > 1) {
        const idVals = sheet.getRange(2, idx.id + 1, lastRow - 1, 1).getValues();
        for (let r = 0; r < idVals.length; r++) {
          if (Number(idVals[r][0]) === docId) {
            targetRowIndex = r + 2;
            break;
          }
        }
      }

      // Risolve la categoria dal dominio se non presente
      let categoria = data.categoria || "";
      if (!categoria && typeof findDocumentType === "function") {
        const rec = findDocumentType(tipo);
        if (rec) categoria = rec.categoria;
      }

      const docModel = new Documento({
        id: docId,
        intestatario: intestatario,
        tipo: tipo,
        categoria: categoria,
        valore: data.valore,
        dataEmissione: data.dataEmissione,
        dataScadenza: data.dataScadenza,
        idDrive: data.idDrive,
        note: data.note,
        dataInserimento: data.dataInserimento || (isUpdate ? undefined : new Date())
      });

      const maxCol = Math.max(...Object.values(idx)) + 1;
      let rowValues = new Array(maxCol).fill("");

      if (targetRowIndex > 0) {
        rowValues = sheet.getRange(targetRowIndex, 1, 1, maxCol).getValues()[0];
      }

      rowValues[idx.id] = docModel.id;
      rowValues[idx.intestatario] = docModel.intestatario;
      rowValues[idx.tipo] = docModel.tipo;
      rowValues[idx.categoria] = docModel.categoria;
      rowValues[idx.valore] = docModel.valore !== null ? docModel.valore : "";
      rowValues[idx.dataEmissione] = docModel.dataEmissione || "";
      rowValues[idx.dataScadenza] = docModel.dataScadenza || "";
      rowValues[idx.idDrive] = docModel.idDrive || "";
      rowValues[idx.note] = docModel.note || "";
      if (!isUpdate || !rowValues[idx.dataInserimento]) {
        rowValues[idx.dataInserimento] = docModel.dataInserimento || "";
      }

      if (targetRowIndex > 0) {
        sheet.getRange(targetRowIndex, 1, 1, maxCol).setValues([rowValues]);
        return {
          success: true,
          message: "Documento ID " + docId + " aggiornato con successo.",
          data: docModel.toObject()
        };
      } else {
        sheet.appendRow(rowValues);
        return {
          success: true,
          message: "Documento ID " + docId + " registrato con successo.",
          data: docModel.toObject()
        };
      }
    } catch (e) {
      Logger.log("DocumentoRepository.add errore: " + e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * Rimuove un documento dal foglio 'Documenti' cercando per ID univoco.
   * @param {number|string} id - ID del documento da eliminare.
   * @return {{ success: boolean; message: string }}
   */
  static removeById(id) {
    try {
      const targetId = Number(id);
      if (isNaN(targetId)) return { success: false, message: "ID documento non valido." };

      const sheet = DocumentoRepository.getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return { success: false, message: "Nessun documento trovato." };

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const idx = DocumentoRepository._getColIndexes(headers);
      if (idx.id < 0) return { success: false, message: "Colonna ID non presente." };

      const idVals = sheet.getRange(2, idx.id + 1, lastRow - 1, 1).getValues();
      for (let r = 0; r < idVals.length; r++) {
        if (Number(idVals[r][0]) === targetId) {
          sheet.deleteRow(r + 2);
          return { success: true, message: "Documento ID " + targetId + " rimosso con successo." };
        }
      }

      return { success: false, message: "Documento ID " + targetId + " non trovato." };
    } catch (e) {
      Logger.log("DocumentoRepository.removeById errore: " + e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * Rimuove o scollega un documento dal foglio cercando per ID del file Google Drive.
   * @param {string} driveId - ID del file su Google Drive.
   * @return {{ success: boolean; message: string }}
   */
  static removeByDriveId(driveId) {
    try {
      if (!driveId) return { success: false, message: "ID Drive mancante." };

      const sheet = DocumentoRepository.getSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return { success: true, message: "Nessun record presente." };

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const idx = DocumentoRepository._getColIndexes(headers);
      if (idx.idDrive < 0) return { success: true, message: "Colonna ID Drive assente." };

      const driveVals = sheet.getRange(2, idx.idDrive + 1, lastRow - 1, 1).getValues();
      let count = 0;
      // Scansiona al contrario per evitare disallineamenti di indice su deleteRow
      for (let r = driveVals.length - 1; r >= 0; r--) {
        if (String(driveVals[r][0]).trim() === String(driveId).trim()) {
          sheet.deleteRow(r + 2);
          count++;
        }
      }

      return { success: true, message: count + " record documento rimosso/i." };
    } catch (e) {
      Logger.log("DocumentoRepository.removeByDriveId errore: " + e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * Restituisce tutti i documenti scaduti o in scadenza entro la soglia di giorni indicata.
   * @param {number} [giorniPreavviso=60] - Giorni di soglia.
   * @return {Documento[]}
   */
  static getScadenzeCritiche(giorniPreavviso = 60) {
    const all = DocumentoRepository.getAll();
    const now = new Date();
    return all.filter(doc => {
      const stato = doc.getStatoScadenza(now);
      return stato === "SCADUTO" || stato === "IN_SCADENZA";
    });
  }
}
