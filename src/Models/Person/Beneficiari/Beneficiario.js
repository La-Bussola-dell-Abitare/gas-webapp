/**
 * @typedef {PersonData & {
 *   statoLavorativo?: string;
 *   titoloStudio?: string;
 *   residenza?: string;
 *   domicilio?: string;
 *   inCaricoServizi?: string;
 * }} BeneficiarioData
 */

/**
 * Classe Beneficiario che rappresenta un beneficiario dello sportello.
 * @extends Person
 */
class Beneficiario extends Person {
  /**
   * Crea un'istanza di Beneficiario.
   * @param {BeneficiarioData} data - I dati del beneficiario.
   */
  constructor(data) {
    super(data);
    this.statoLavorativo = data.statoLavorativo || "";
    this.titoloStudio = data.titoloStudio || "";
    this.residenza = data.residenza || "";
    this.domicilio = data.domicilio || "";
    this.inCaricoServizi = data.inCaricoServizi || "";
  }

  /**
   * Factory statico per creare un'istanza di Beneficiario da una riga del foglio ed indici.
   * @param {any[]} row - La riga di dati
   * @param {Record<string, number>} idx - Mappa degli indici delle colonne
   * @return {Beneficiario}
   */
  static fromRow(row, idx) {
    const nomeVal = getSheetVal(row, idx, "nome", "");
    const cognomeVal = getSheetVal(row, idx, "cognome", "");
    const cfVal = getSheetVal(row, idx, "codice fiscale", "");
    const dataNascitaVal = getSheetVal(row, idx, "data di nascita", null);
    const luogoNascitaVal = getSheetVal(row, idx, "luogo di nascita", "");
    const emailVal = getSheetVal(row, idx, "email", "");
    const telefonoVal = getSheetVal(row, idx, "telefono", "");
    const statoLavorativoVal = getSheetVal(row, idx, "stato lavorativo", "");
    const titoloStudioVal = getSheetVal(row, idx, "titolo di studio", "");
    const cittadinanzaVal = getSheetVal(row, idx, "cittadinanza", "");
    const residenzaVal = getSheetVal(row, idx, "residenza", "");
    const domicilioVal = getSheetVal(row, idx, "domicilio", "");
    const inCaricoServiziVal = getSheetVal(row, idx, "in carico ai servizi", "");

    const birthPlaceCity = new City(luogoNascitaVal);
    
    // Mappa della cittadinanza a partire dal foglio
    let citizenshipEnum = Citizenship.Apolide;
    const cleanCittadinanza = cittadinanzaVal.trim().toLowerCase();
    for (const key in Citizenship) {
      if (key.toLowerCase() === cleanCittadinanza || Citizenship[key].toLowerCase() === cleanCittadinanza) {
        citizenshipEnum = Citizenship[key];
        break;
      }
    }

    return new Beneficiario({
      name: nomeVal,
      surname: cognomeVal,
      taxCode: new CodiceFiscale(cfVal),
      birthDate: dataNascitaVal,
      birthPlace: birthPlaceCity,
      email: emailVal,
      phone: telefonoVal,
      citizenship: citizenshipEnum,
      statoLavorativo: statoLavorativoVal,
      titoloStudio: titoloStudioVal,
      residenza: residenzaVal,
      domicilio: domicilioVal,
      inCaricoServizi: inCaricoServiziVal
    });
  }

  /**
   * Recupera tutti i beneficiari dal foglio.
   * @return {Beneficiario[]} Array di istanze di Beneficiario
   */
  static getAll() {
    return BeneficiarioRepository.getAll();
  }

  /**
   * Registra un nuovo beneficiario nel foglio.
   * @param {Record<string, any>} data - Dati del beneficiario
   * @return {{ success: boolean; message: string }} Risultato dell'operazione
   */
  static add(data) {
    return BeneficiarioRepository.add(data);
  }
}

/**
 * Repository per gestire le operazioni di persistenza e lettura dei Beneficiari.
 */
class BeneficiarioRepository {
  /**
   * Ottiene tutti i beneficiari.
   * @return {Beneficiario[]}
   */
  static getAll() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(WA_SHEET_BENEFICIARI);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const idx = BeneficiarioRepository._getColIndexes(headers);

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nome = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]) : "";
      const cognome = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]) : "";

      if (nome || cognome) {
        list.push(Beneficiario.fromRow(row, idx));
      }
    }
    return list;
  }

  /**
   * Registra un nuovo beneficiario nel foglio.
   * @param {Record<string, any>} data - Dati del beneficiario da registrare
   * @return {{ success: boolean; message: string }}
   */
  static add(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(WA_SHEET_BENEFICIARI);
    if (!sheet) throw new Error("Foglio '" + WA_SHEET_BENEFICIARI + "' non trovato.");

    const targetCF = data.cf ? data.cf.toUpperCase().trim() : "";
    const targetFullName = (data.nome.trim() + " " + data.cognome.trim()).toLowerCase();

    // Validazione unicità
    const beneficiari = BeneficiarioRepository.getAll();
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
    const idx = BeneficiarioRepository._getColIndexes(headers);

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
    } catch (e) {
      Logger.log("Sincronizzazione fallita in background: " + e.message);
    }

    return { success: true, message: "Beneficiario '" + data.nome + " " + data.cognome + "' salvato con successo." };
  }

  /**
   * Mappa gli indici delle colonne in base alle intestazioni.
   * @private
   * @param {string[]} headers
   * @return {Record<string, number>}
   */
  static _getColIndexes(headers) {
    return {
      nome: findHeaderIndex(headers, ["nome"]),
      cognome: findHeaderIndex(headers, ["cognome"]),
      cf: findHeaderIndex(headers, ["codice fiscale", "cf"]),
      dataNascita: findHeaderIndex(headers, ["data di nascita", "data nascita"]),
      luogoNascita: findHeaderIndex(headers, ["luogo di nascita", "luogo nascita"]),
      email: findHeaderIndex(headers, ["email", "e-mail"]),
      telefono: findHeaderIndex(headers, ["telefono", "cellulare", "tel"]),
      statoLavorativo: findHeaderIndex(headers, ["stato lavorativo", "lavoro"]),
      titoloStudio: findHeaderIndex(headers, ["titolo di studio", "titolo studio"]),
      cittadinanza: findHeaderIndex(headers, ["cittadinanza"]),
      residenza: findHeaderIndex(headers, ["residenza"]),
      domicilio: findHeaderIndex(headers, ["domicilio"]),
      inCaricoServizi: findHeaderIndex(headers, ["in carico ai servizi", "in carico", "servizi"]),
      dataInserimento: findHeaderIndex(headers, ["data inserimento", "data di inserimento", "inserimento"])
    };
  }
}
