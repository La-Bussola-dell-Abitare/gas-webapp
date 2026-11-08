/**
 * @file NucleoFamiliare.js
 * @description Modello e gestione persistenza per i Nuclei Familiari assistiti dallo sportello.
 * Incapsula le informazioni socio-economiche (ISEE, anamnesi del caso, progettualità, residenza/domicilio),
 * l'assegnazione automatica dell'ID progressivo (generateNextId) e la sincronizzazione con il foglio Google.
 * @module Models/Nucleo/NucleoFamiliare
 */

/**
 * Classe per la gestione e la modellazione del Nucleo Familiare dello sportello.
 */
class NucleoFamiliare {
  /**
   * Crea un'istanza di NucleoFamiliare da una riga del foglio di calcolo.
   * @param {any[]} row - La riga di dati
   * @param {Record<string, number>} idx - Mappa degli indici delle colonne
   */
  constructor(row, idx) {
    this.id = getSheetVal(row, idx, "id", "");
    this.intestatario = getSheetVal(row, idx, "intestatario", "");
    this.isee = getSheetVal(row, idx, "isee", null);
    this.residenza = getSheetVal(row, idx, "residenza", "");
    this.domicilio = getSheetVal(row, idx, "domicilio", "");
    this.descrizioneCaso = getSheetVal(row, idx, "descrizione caso", "");
    this.obiettiviProgettualita = getSheetVal(row, idx, "obiettivi e progettualità", "");
    this.tipologiaRichiesta = getSheetVal(row, idx, "tipologia di richiesta", "");
    this.orientamentoFollowUp = getSheetVal(row, idx, "orientamento e follow-up", "");
    this.tipologiaAbitazione = getSheetVal(row, idx, "tipologia abitazione", "");
    this.assistenteSociale = getSheetVal(row, idx, "assistente sociale", "No");
    this.medicoDiBase = getSheetVal(row, idx, "medico di base", "No");
    this.serviziDaAttivare = getSheetVal(row, idx, "serviziDaAttivare", "");
    this.idCartella = getSheetVal(row, idx, "idCartella", "");
  }

  /**
   * Recupera tutti i nuclei familiari dal foglio.
   * Cerca preferibilmente il foglio "Nuclei Familiari", in alternativa "Nucleo Familiare".
   * @return {NucleoFamiliare[]} Array di istanze di NucleoFamiliare
   */
  static getAll() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Nuclei Familiari");
    if (!sheet) {
      sheet = ss.getSheetByName("Nucleo Familiare");
    }
    if (!sheet) {
      sheet = ss.getSheetByName("Nuclei");
    }
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const idx = NucleoFamiliare._getColIndexes(headers);

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const idVal = idx.id >= 0 && idx.id < row.length ? safeString(row[idx.id]) : "";
      const intestatarioVal = idx.intestatario >= 0 && idx.intestatario < row.length ? safeString(row[idx.intestatario]) : "";

      if (idVal || intestatarioVal) {
        list.push(new NucleoFamiliare(row, idx));
      }
    }
    return list;
  }

  /**
   * Genera il prossimo ID seriale incrementale rispetto al valore massimo esistente.
   * @return {string} Il prossimo ID seriale (es. "1", "2" o "101")
   */
  static generateNextId() {
    const nuclei = NucleoFamiliare.getAll();
    let maxId = 0;
    
    nuclei.forEach(n => {
      const numId = parseInt(n.id, 10);
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    });
    
    return (maxId + 1).toString();
  }

  /**
   * Registra un nuovo nucleo familiare nel foglio.
   * @param {Record<string, any>} data - Dati del nucleo familiare da salvare
   * @return {{ success: boolean; message: string; id: string }} Risultato dell'operazione e ID generato
   */
  static add(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Nuclei Familiari");
    if (!sheet) {
      sheet = ss.getSheetByName("Nucleo Familiare");
    }
    if (!sheet) {
      throw new Error("Foglio 'Nuclei Familiari' non trovato.");
    }

    if (!data.intestatario) {
      throw new Error("Il campo Intestatario (Codice Fiscale) è obbligatorio.");
    }

    let isUpdate = false;
    let targetRowIdx = -1;
    let targetId = data.id ? data.id.toString().trim() : "";

    if (targetId) {
      const dataValues = sheet.getDataRange().getValues();
      if (dataValues.length > 1) {
        const tempHeaders = dataValues[0].map(h => h.toString().trim().toLowerCase());
        const tempIdx = NucleoFamiliare._getColIndexes(tempHeaders);
        if (tempIdx.id >= 0) {
          for (let i = 1; i < dataValues.length; i++) {
            if (dataValues[i][tempIdx.id].toString().trim() === targetId) {
              isUpdate = true;
              targetRowIdx = i + 1;
              break;
            }
          }
        }
      }
    }

    // Ricerca prima riga vuota nel foglio
    let firstEmptyRowIdx = -1;
    for (let r = 1; r < dataValues.length; r++) {
      const row = dataValues[r];
      const idVal = tempIdx.id >= 0 && tempIdx.id < row.length ? safeString(row[tempIdx.id]).trim() : "";
      const intestVal = tempIdx.intestatario >= 0 && tempIdx.intestatario < row.length ? safeString(row[tempIdx.intestatario]).trim() : "";
      if (!idVal && !intestVal) {
        firstEmptyRowIdx = r + 1;
        break;
      }
    }
    if (firstEmptyRowIdx < 0) {
      firstEmptyRowIdx = dataValues.length + 1;
    }

    const nextId = isUpdate ? targetId : NucleoFamiliare.generateNextId();
    const newRowIdx = isUpdate ? targetRowIdx : firstEmptyRowIdx;
    if (newRowIdx > sheet.getMaxRows()) {
      sheet.insertRowAfter(sheet.getMaxRows());
    }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim().toLowerCase());
    const idx = NucleoFamiliare._getColIndexes(headers);

    // Salvataggio dei dati nelle rispettive colonne trovate
    if (idx.id >= 0) sheet.getRange(newRowIdx, idx.id + 1).setValue(nextId);
    if (idx.intestatario >= 0) sheet.getRange(newRowIdx, idx.intestatario + 1).setValue(data.intestatario.trim().toUpperCase());
    if (idx.isee >= 0) sheet.getRange(newRowIdx, idx.isee + 1).setValue(data.isee !== null && data.isee !== undefined && data.isee !== "" ? parseFloat(data.isee) : "");
    if (idx.residenza >= 0) sheet.getRange(newRowIdx, idx.residenza + 1).setValue(data.residenza ? data.residenza.trim() : "");
    if (idx.domicilio >= 0) sheet.getRange(newRowIdx, idx.domicilio + 1).setValue(data.domicilio ? data.domicilio.trim() : "");
    if (idx.descrizioneCaso >= 0) sheet.getRange(newRowIdx, idx.descrizioneCaso + 1).setValue(data.descrizioneCaso ? data.descrizioneCaso.trim() : "");
    if (idx.obiettiviProgettualita >= 0) sheet.getRange(newRowIdx, idx.obiettiviProgettualita + 1).setValue(data.obiettiviProgettualita ? data.obiettiviProgettualita.trim() : "");
    if (idx.tipologiaRichiesta >= 0) sheet.getRange(newRowIdx, idx.tipologiaRichiesta + 1).setValue(data.tipologiaRichiesta ? data.tipologiaRichiesta.trim() : "");
    if (idx.orientamentoFollowUp >= 0) sheet.getRange(newRowIdx, idx.orientamentoFollowUp + 1).setValue(data.orientamentoFollowUp ? data.orientamentoFollowUp.trim() : "");
    if (idx.tipologiaAbitazione >= 0) sheet.getRange(newRowIdx, idx.tipologiaAbitazione + 1).setValue(data.tipologiaAbitazione ? data.tipologiaAbitazione.trim() : "");
    if (idx.assistenteSociale >= 0) sheet.getRange(newRowIdx, idx.assistenteSociale + 1).setValue(data.assistenteSociale ? data.assistenteSociale.trim() : "No");
    if (idx.medicoDiBase >= 0) sheet.getRange(newRowIdx, idx.medicoDiBase + 1).setValue(data.medicoDiBase ? data.medicoDiBase.trim() : "No");

    if (data.serviziDaAttivare !== undefined) {
      let sIdx = idx.serviziDaAttivare;
      if (sIdx < 0 && data.serviziDaAttivare) {
        sIdx = ensureHeaderIndex(sheet, "Servizi da attivare");
        idx.serviziDaAttivare = sIdx;
      }
      if (sIdx >= 0) {
        sheet.getRange(newRowIdx, sIdx + 1).setValue(data.serviziDaAttivare ? data.serviziDaAttivare.trim() : "");
      }
    }

    if (idx.idCartella >= 0 && data.idCartella !== undefined) sheet.getRange(newRowIdx, idx.idCartella + 1).setValue(data.idCartella ? data.idCartella.trim() : "");

    if (idx.dataInserimento >= 0 && !isUpdate) {
      sheet.getRange(newRowIdx, idx.dataInserimento + 1).setValue(new Date());
    }

    // Collega automaticamente idNucleo all'intestatario nel foglio Beneficiari se non ancora associato
    try {
      const rawIntest = data.intestatario ? String(data.intestatario).trim() : "";
      const match = rawIntest.match(/\b([A-Za-z0-9]{16})\b/);
      const intestCF = match ? match[1].toUpperCase() : (rawIntest.length === 16 ? rawIntest.toUpperCase() : "");

      const benSheet = ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : "Beneficiari") || ss.getSheetByName("Beneficiari") || ss.getSheetByName("Beneficiario");
      if (benSheet) {
        const bData = benSheet.getDataRange().getValues();
        if (bData.length > 1) {
          const bHeaders = bData[0].map(h => h.toString().trim().toLowerCase());
          const bIdx = BeneficiarioRepository._getColIndexes(bHeaders);
          if (bIdx.idNucleo >= 0) {
            for (let r = 1; r < bData.length; r++) {
              const rowCF = bIdx.cf >= 0 ? safeString(bData[r][bIdx.cf]).toUpperCase() : "";
              const rowName = ((bIdx.nome >= 0 ? safeString(bData[r][bIdx.nome]) : "") + " " + (bIdx.cognome >= 0 ? safeString(bData[r][bIdx.cognome]) : "")).toLowerCase();
              const matchByCF = intestCF && rowCF === intestCF;
              const matchByName = rawIntest && rowName && rawIntest.toLowerCase().includes(rowName);

              if (matchByCF || matchByName) {
                const currentNuc = safeString(bData[r][bIdx.idNucleo]);
                if (!currentNuc) {
                  benSheet.getRange(r + 1, bIdx.idNucleo + 1).setValue(nextId);
                }
                break;
              }
            }
          }
        }
      }
    } catch (linkErr) {
      Logger.log("Avviso: Impossibile collegare idNucleo dell'intestatario: " + (linkErr instanceof Error ? linkErr.message : String(linkErr)));
    }

    try {
      SpreadsheetApp.flush();
    } catch (e) {}

    return {
      success: true,
      message: isUpdate ? "Nucleo Familiare aggiornato con successo (ID " + nextId + ")." : "Nucleo Familiare registrato con successo con ID " + nextId + ".",
      id: nextId
    };
  }

  /**
   * Mappa gli indici delle colonne in base alle intestazioni del foglio.
   * @private
   * @param {string[]} headers
   * @return {Record<string, number>}
   */
  static _getColIndexes(headers) {
    return {
      id: findHeaderIndex(headers, ["id", "identificativo", "id nucleo", "id_nucleo", "codice nucleo"]),
      intestatario: findHeaderIndex(headers, ["intestatario", "cf intestatario", "codice fiscale", "cf"]),
      isee: findHeaderIndex(headers, ["isee", "valore isee"]),
      residenza: findHeaderIndex(headers, ["residenza", "indirizzo residenza"]),
      domicilio: findHeaderIndex(headers, ["domicilio", "indirizzo domicilio"]),
      descrizioneCaso: findHeaderIndex(headers, ["descrizione caso", "descrizione"]),
      obiettiviProgettualita: findHeaderIndex(headers, ["obiettivi e progettualità", "progettualità"]),
      tipologiaRichiesta: findHeaderIndex(headers, ["tipologia di richiesta", "richiesta"]),
      orientamentoFollowUp: findHeaderIndex(headers, ["orientamento e follow-up", "follow-up"]),
      tipologiaAbitazione: findHeaderIndex(headers, ["tipologia abitazione", "abitazione"]),
      assistenteSociale: findHeaderIndex(headers, ["assistente sociale", "assistente"]),
      medicoDiBase: findHeaderIndex(headers, ["medico di base", "medico"]),
      serviziDaAttivare: findHeaderIndex(headers, ["servizi da attivare", "servizi da attivare / erogati", "servizi"]),
      idCartella: findHeaderIndex(headers, ["id cartella drive", "id cartella", "cartella drive", "cartella", "id_cartella"]),
      dataInserimento: findHeaderIndex(headers, ["data inserimento", "data di inserimento", "inserimento"])
    };
  }

  /**
   * Aggiorna in modo mirato gli identificativi Drive per un nucleo familiare cercato per ID.
   * Crea le colonne nel foglio se non ancora esistenti.
   * @param {string|number} id - Identificativo del nucleo familiare.
   * @param {Record<string, any>} updates - Mappa dei campi da aggiornare (es. { idCartella: "..." }).
   * @return {boolean} true se aggiornato con successo.
   */
  static updateDriveInfo(id, updates) {
    if (!id) return false;
    const targetId = String(id).trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Nuclei Familiari") || ss.getSheetByName("Nucleo Familiare") || ss.getSheetByName("Nuclei");
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const idx = NucleoFamiliare._getColIndexes(headers);
    if (idx.id < 0) return false;

    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (safeString(data[i][idx.id]).trim() === targetId) {
        rowIdx = i + 1;
        break;
      }
    }
    if (rowIdx < 0) return false;

    for (const [key, val] of Object.entries(updates)) {
      let colIdx = idx[key];
      if (colIdx < 0) {
        let headerName = key;
        if (key === "idCartella") headerName = "ID Cartella Drive";
        colIdx = ensureHeaderIndex(sheet, headerName);
        idx[key] = colIdx;
      }
      sheet.getRange(rowIdx, colIdx + 1).setValue(val || "");
    }
    return true;
  }
}
