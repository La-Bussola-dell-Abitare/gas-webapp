// @ts-ignore
const getSheetVal = globalThis.getSheetVal;
// @ts-ignore
const safeString = globalThis.safeString;
// @ts-ignore
const findHeaderIndex = globalThis.findHeaderIndex;
// @ts-ignore
const WA_SHEET_BENEFICIARI = globalThis.WA_SHEET_BENEFICIARI;
// @ts-ignore
const syncBeneficiaries = globalThis.syncBeneficiaries;

/**
 * Classe per la gestione e la modellazione dei Beneficiari dello sportello. (Tipizzato in TypeScript)
 */
class Beneficiario {
  [key: string]: any;

  /**
   * Crea un'istanza di Beneficiario da una riga del foglio di calcolo.
   * @param row - La riga di dati
   * @param idx - Mappa degli indici delle colonne
   */
  constructor(row: any[], idx: Record<string, number>) {
    this.nome = getSheetVal(row, idx, "nome", "");
    this.cognome = getSheetVal(row, idx, "cognome", "");
    this.cf = getSheetVal(row, idx, "codice fiscale", "").toUpperCase();
    this.dataNascita = getSheetVal(row, idx, "data di nascita", null);
    this.luogoNascita = getSheetVal(row, idx, "luogo di nascita", "");
    this.email = getSheetVal(row, idx, "email", "");
    this.telefono = getSheetVal(row, idx, "telefono", "");
    this.statoLavorativo = getSheetVal(row, idx, "stato lavorativo", "");
    this.titoloStudio = getSheetVal(row, idx, "titolo di studio", "");
    this.cittadinanza = getSheetVal(row, idx, "cittadinanza", "");
    this.residenza = getSheetVal(row, idx, "residenza", "");
    this.domicilio = getSheetVal(row, idx, "domicilio", "");
    this.inCaricoServizi = getSheetVal(row, idx, "in carico ai servizi", "");
  }

  /**
   * Recupera tutti i beneficiari dal foglio "Beneficiari".
   * @return Array di istanze di Beneficiario
   */
  static getAll(): Beneficiario[] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(WA_SHEET_BENEFICIARI);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const idx = Beneficiario._getColIndexes(headers);

    const list: Beneficiario[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nome = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]) : "";
      const cognome = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]) : "";

      if (nome || cognome) {
        list.push(new Beneficiario(row, idx));
      }
    }
    return list;
  }

  /**
   * Registra un nuovo beneficiario nel foglio.
   * @param data - Dati del beneficiario
   * @return Risultato dell'operazione
   */
  static add(data: Record<string, any>): { success: boolean; message: string } {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(WA_SHEET_BENEFICIARI);
    if (!sheet) throw new Error("Foglio '" + WA_SHEET_BENEFICIARI + "' non trovato.");

    const targetCF = data.cf ? data.cf.toUpperCase().trim() : "";
    const targetFullName = (data.nome.trim() + " " + data.cognome.trim()).toLowerCase();

    // Validazione unicità
    const beneficiari = Beneficiario.getAll();
    for (let i = 0; i < beneficiari.length; i++) {
      const b = beneficiari[i];
      if (targetCF && b.cf === targetCF) {
        throw new Error("Un beneficiario con questo Codice Fiscale è già registrato.");
      }
      const bFullName = (b.nome + " " + b.cognome).toLowerCase();
      if (bFullName === targetFullName) {
        throw new Error("Un beneficiario con questo Nome e Cognome è già registrato.");
      }
    }

    const lastRow = sheet.getLastRow();
    const newRowIdx = lastRow + 1;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().trim().toLowerCase());
    const idx = Beneficiario._getColIndexes(headers);

    if (idx.nome >= 0) sheet.getRange(newRowIdx, idx.nome + 1).setValue(data.nome.trim());
    if (idx.cognome >= 0) sheet.getRange(newRowIdx, idx.cognome + 1).setValue(data.cognome.trim());
    if (idx.cf >= 0) sheet.getRange(newRowIdx, idx.cf + 1).setValue(targetCF);
    if (idx.dataNascita >= 0) sheet.getRange(newRowIdx, idx.dataNascita + 1).setValue(data.dataNascita || "");
    if (idx.luogoNascita >= 0) sheet.getRange(newRowIdx, idx.luogoNascita + 1).setValue(data.luogoNascita.trim());
    if (idx.email >= 0) sheet.getRange(newRowIdx, idx.email + 1).setValue(data.email.trim());
    if (idx.telefono >= 0) sheet.getRange(newRowIdx, idx.telefono + 1).setValue(data.telefono.trim());
    if (idx.statoLavorativo >= 0) sheet.getRange(newRowIdx, idx.statoLavorativo + 1).setValue(data.statoLavorativo);
    if (idx.titoloStudio >= 0) sheet.getRange(newRowIdx, idx.titoloStudio + 1).setValue(data.titoloStudio);
    if (idx.cittadinanza >= 0) sheet.getRange(newRowIdx, idx.cittadinanza + 1).setValue(data.cittadinanza.trim());
    if (idx.residenza >= 0) sheet.getRange(newRowIdx, idx.residenza + 1).setValue(data.residenza.trim());
    if (idx.domicilio >= 0) sheet.getRange(newRowIdx, idx.domicilio + 1).setValue(data.domicilio.trim());
    if (idx.inCaricoServizi >= 0) sheet.getRange(newRowIdx, idx.inCaricoServizi + 1).setValue(data.inCaricoServizi);

    if (idx.dataInserimento >= 0) {
      sheet.getRange(newRowIdx, idx.dataInserimento + 1).setValue(new Date());
    } else {
      sheet.getRange(newRowIdx, 20).setValue(new Date());
    }

    try {
      if (typeof syncBeneficiaries === 'function') {
        SpreadsheetApp.flush();
        syncBeneficiaries();
      }
    } catch (e: any) {
      Logger.log("Sincronizzazione fallita in background: " + e.message);
    }

    return { success: true, message: "Beneficiario '" + data.nome + " " + data.cognome + "' salvato con successo." };
  }

  /**
   * Mappa gli indici delle colonne in base alle intestazioni.
   * @private
   */
  private static _getColIndexes(headers: string[]): Record<string, number> {
    let idxNome = findHeaderIndex(headers, ["nome"]);
    let idxCognome = findHeaderIndex(headers, ["cognome"]);
    let idxCF = findHeaderIndex(headers, ["codice fiscale", "cf"]);
    let idxDataNascita = findHeaderIndex(headers, ["data di nascita", "data nascita"]);
    let idxLuogoNascita = findHeaderIndex(headers, ["luogo di nascita", "luogo nascita"]);
    let idxEmail = findHeaderIndex(headers, ["email", "e-mail"]);
    let idxTelefono = findHeaderIndex(headers, ["telefono", "cellulare", "tel"]);
    let idxStatoLavorativo = findHeaderIndex(headers, ["stato lavorativo", "lavoro"]);
    let idxTitoloStudio = findHeaderIndex(headers, ["titolo di studio", "titolo studio"]);
    let idxCittadinanza = findHeaderIndex(headers, ["cittadinanza"]);
    let idxResidenza = findHeaderIndex(headers, ["residenza"]);
    let idxDomicilio = findHeaderIndex(headers, ["domicilio"]);
    let idxInCaricoServizi = findHeaderIndex(headers, ["in carico ai servizi", "in carico", "servizi"]);
    let idxDataInserimento = findHeaderIndex(headers, ["data inserimento", "data di inserimento", "inserimento"]);

    return {
      nome: idxNome,
      cognome: idxCognome,
      cf: idxCF,
      dataNascita: idxDataNascita,
      luogoNascita: idxLuogoNascita,
      email: idxEmail,
      telefono: idxTelefono,
      statoLavorativo: idxStatoLavorativo,
      titoloStudio: idxTitoloStudio,
      cittadinanza: idxCittadinanza,
      residenza: idxResidenza,
      domicilio: idxDomicilio,
      inCaricoServizi: idxInCaricoServizi,
      dataInserimento: idxDataInserimento
    };
  }
}
