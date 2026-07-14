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

    const nextId = isUpdate ? targetId : NucleoFamiliare.generateNextId();
    const newRowIdx = isUpdate ? targetRowIdx : sheet.getLastRow() + 1;
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

    if (idx.dataInserimento >= 0 && !isUpdate) {
      sheet.getRange(newRowIdx, idx.dataInserimento + 1).setValue(new Date());
    }

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
      id: findHeaderIndex(headers, ["id", "identificativo"]),
      intestatario: findHeaderIndex(headers, ["intestatario", "cf intestatario", "codice fiscale"]),
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
      dataInserimento: findHeaderIndex(headers, ["data inserimento", "data di inserimento", "inserimento"])
    };
  }
}
