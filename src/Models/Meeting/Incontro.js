/**
 * @typedef {Object} IncontroData
 * @property {string} beneficiario - Nome del beneficiario (senza CF).
 * @property {string} operatore - Nome dell'operatore.
 * @property {string|Date} data - Data dell'incontro.
 * @property {string} oraInizio - Orario inizio (es. "10:00").
 * @property {string} oraFine - Orario fine (es. "10:30").
 * @property {string} attivita - Attività svolta.
 * @property {string} descrizione - Descrizione dettagliata dell'incontro.
 * @property {string} [segnalazione="No"] - Richiede Segnalazione ("Sì"/"No"). Solo per operatore.
 * @property {string} [statoElaborazione="In attesa"] - Stato elaborazione.
 * @property {string} [erroriValidazione=""] - Errori riscontrati nella validazione.
 * @property {string} tipoIncontro - Tipo di incontro ("operatore" | "assistente").
 */

/**
 * Classe Incontro che rappresenta un colloquio o visita dello sportello.
 */
class Incontro {
  /**
   * @param {IncontroData} data - I dati dell'incontro.
   */
  constructor(data) {
    this.beneficiario = data.beneficiario;
    this.operatore = data.operatore;
    this.data = data.data;
    this.oraInizio = data.oraInizio;
    this.oraFine = data.oraFine;
    this.attivita = data.attivita;
    this.descrizione = data.descrizione;
    this.segnalazione = data.segnalazione || "No";
    this.statoElaborazione = data.statoElaborazione || "In attesa";
    this.erroriValidazione = data.erroriValidazione || "";
    this.tipoIncontro = data.tipoIncontro;
  }

  /**
   * Factory per creare un'incontro da una riga di dati.
   * @param {any[]} row - Riga del foglio.
   * @param {Record<string, number>} idx - Indici delle colonne.
   * @param {string} tipoIncontro - "operatore" o "assistente".
   * @return {Incontro}
   */
  static fromRow(row, idx, tipoIncontro) {
    return new Incontro({
      beneficiario: getSheetVal(row, idx, "beneficiario", ""),
      operatore: getSheetVal(row, idx, "operatore", ""),
      data: getSheetVal(row, idx, "data", ""),
      oraInizio: getSheetVal(row, idx, "ora inizio", ""),
      oraFine: getSheetVal(row, idx, "ora fine", ""),
      attivita: getSheetVal(row, idx, "attivita", ""),
      descrizione: getSheetVal(row, idx, "descrizione", ""),
      segnalazione: getSheetVal(row, idx, "segnalazione", "No"),
      statoElaborazione: getSheetVal(row, idx, "stato elaborazione", "In attesa"),
      erroriValidazione: getSheetVal(row, idx, "errori validazione", ""),
      tipoIncontro: tipoIncontro
    });
  }
}

/**
 * Repository per la gestione degli Incontri sui fogli di calcolo Google.
 */
class IncontroRepository {
  /**
   * Ottiene tutti gli incontri da entrambi i fogli.
   * @return {Incontro[]}
   */
  static getAll() {
    const list = [];
    list.push(...IncontroRepository.getByTipo("operatore"));
    list.push(...IncontroRepository.getByTipo("assistente"));
    return list;
  }

  /**
   * Ottiene gli incontri per tipologia ("operatore" o "assistente").
   * @param {string} tipo - "operatore" o "assistente"
   * @return {Incontro[]}
   */
  static getByTipo(tipo) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = tipo === "operatore" ? WA_SHEET_INCONTRI_OPERATORE : WA_SHEET_INCONTRI_ASSISTENTE;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const idx = IncontroRepository._getColIndexes(headers, tipo);

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const beneficiario = idx.beneficiario >= 0 && idx.beneficiario < row.length ? safeString(row[idx.beneficiario]) : "";
      if (beneficiario) {
        list.push(Incontro.fromRow(row, idx, tipo));
      }
    }
    return list;
  }

  /**
   * Salva un nuovo incontro nel foglio corrispondente.
   * @param {IncontroData} data - I dati dell'incontro da salvare
   * @return {{ success: boolean; message: string }}
   */
  static add(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const isOperatore = (data.tipoIncontro === "operatore");
    const sheetName = isOperatore ? WA_SHEET_INCONTRI_OPERATORE : WA_SHEET_INCONTRI_ASSISTENTE;

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Foglio '" + sheetName + "' non trovato nel documento.");
    }

    const lastRow = sheet.getLastRow();
    const newRowIdx = lastRow + 1;

    let beneficiarioNome = data.beneficiario.trim();
    // Pulisce il CF dal nome se presente (es. "Mario Rossi (CF)" -> "Mario Rossi")
    const cfMatch = beneficiarioNome.match(/^(.*?)\s*\([A-Z0-9]{16}\)$/i);
    if (cfMatch) {
      beneficiarioNome = cfMatch[1].trim();
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim().toLowerCase());
    const idx = IncontroRepository._getColIndexes(headers, data.tipoIncontro);

    if (idx.beneficiario >= 0) sheet.getRange(newRowIdx, idx.beneficiario + 1).setValue(beneficiarioNome);
    if (idx.operatore >= 0) sheet.getRange(newRowIdx, idx.operatore + 1).setValue(data.operatore.trim());
    if (idx.data >= 0) sheet.getRange(newRowIdx, idx.data + 1).setValue(data.data);
    if (idx.oraInizio >= 0) sheet.getRange(newRowIdx, idx.oraInizio + 1).setValue(data.oraInizio);
    if (idx.oraFine >= 0) sheet.getRange(newRowIdx, idx.oraFine + 1).setValue(data.oraFine);
    if (idx.attivita >= 0) sheet.getRange(newRowIdx, idx.attivita + 1).setValue(data.attivita.trim());
    if (idx.descrizione >= 0) sheet.getRange(newRowIdx, idx.descrizione + 1).setValue(data.descrizione.trim());

    if (isOperatore) {
      if (idx.segnalazione >= 0) sheet.getRange(newRowIdx, idx.segnalazione + 1).setValue(data.segnalazione || "No");
      if (idx.statoElaborazione >= 0) sheet.getRange(newRowIdx, idx.statoElaborazione + 1).setValue("In attesa");
      if (idx.erroriValidazione >= 0) sheet.getRange(newRowIdx, idx.erroriValidazione + 1).setValue("");
    } else {
      if (idx.statoElaborazione >= 0) sheet.getRange(newRowIdx, idx.statoElaborazione + 1).setValue("In attesa");
      if (idx.erroriValidazione >= 0) sheet.getRange(newRowIdx, idx.erroriValidazione + 1).setValue("");
    }

    return {
      success: true,
      message: "Incontro registrato con successo in '" + sheetName + "'."
    };
  }

  /**
   * Mappa gli indici delle colonne.
   * @private
   * @param {string[]} headers
   * @param {string} tipo
   * @return {Record<string, number>}
   */
  static _getColIndexes(headers, tipo) {
    const isOperatore = (tipo === "operatore");
    return {
      beneficiario: findHeaderIndex(headers, ["beneficiario", "destinatario"]),
      operatore: findHeaderIndex(headers, ["operatore"]),
      data: findHeaderIndex(headers, ["data"]),
      oraInizio: findHeaderIndex(headers, ["ora inizio", "inizio", "orario inizio"]),
      oraFine: findHeaderIndex(headers, ["ora fine", "fine", "orario fine"]),
      attivita: findHeaderIndex(headers, ["attivita", "attività"]),
      descrizione: findHeaderIndex(headers, ["descrizione"]),
      segnalazione: isOperatore ? findHeaderIndex(headers, ["richiede segnalazione", "segnalazione"]) : -1,
      statoElaborazione: findHeaderIndex(headers, ["stato elaborazione", "stato"]),
      erroriValidazione: findHeaderIndex(headers, ["errori validazione", "errori", "validazione"])
    };
  }
}
