/**
 * @typedef {Object} BeneficiarioDocuments
 * @property {string} [cartaIdentita] - Tipo di carta d'identità ("Non posseduto", "cartacea", "elettronica").
 * @property {boolean} [passaporto] - Possesso passaporto.
 * @property {boolean} [patente] - Possesso patente.
 * @property {boolean} [permessoSoggiorno] - Possesso permesso di soggiorno.
 * @property {boolean} [tesseraSanitaria] - Possesso tessera sanitaria.
 */

/**
 * @typedef {PersonData & {
 *   statoLavorativo?: string;
 *   titoloStudio?: string;
 *   residenza?: string;
 *   domicilio?: string;
 *   inCaricoServizi?: string;
 *   rapportoIntestatario?: string;
 *   statoCivile?: string;
 *   annoArrivo?: number | null;
 *   documents?: BeneficiarioDocuments;
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
    this.rapportoIntestatario = data.rapportoIntestatario || "";
    this.statoCivile = data.statoCivile || "";
    this.annoArrivo = data.annoArrivo || null;

    /** @type {BeneficiarioDocuments} */
    this.documents = {
      cartaIdentita: data.documents?.cartaIdentita || "Non posseduto",
      passaporto: !!data.documents?.passaporto,
      patente: !!data.documents?.patente,
      permessoSoggiorno: !!data.documents?.permessoSoggiorno,
      tesseraSanitaria: !!data.documents?.tesseraSanitaria
    };
  }

  // =========================================================================
  // GETTER ALIAS PER RETROCOMPATIBILITÀ DOCUMENTI
  // =========================================================================
  get cartaIdentita() { return this.documents.cartaIdentita; }
  get passaporto() { return this.documents.passaporto; }
  get patente() { return this.documents.patente; }
  get permessoSoggiorno() { return this.documents.permessoSoggiorno; }
  get tesseraSanitaria() { return this.documents.tesseraSanitaria; }

  /**
   * Factory statico per creare un'istanza di Beneficiario da una riga del foglio ed indici.
   * @param {any[]} row - La riga di dati
   * @param {Record<string, number>} idx - Mappa degli indici delle colonne
   * @return {Beneficiario}
   */
  static fromRow(row, idx) {
    const nomeVal = getSheetVal(row, idx, "nome", "");
    const cognomeVal = getSheetVal(row, idx, "cognome", "");
    const cfVal = getSheetVal(row, idx, "cf", "");
    const dataNascitaVal = getSheetVal(row, idx, "dataNascita", null);
    const luogoNascitaVal = getSheetVal(row, idx, "luogoNascita", "");
    const emailVal = getSheetVal(row, idx, "email", "");
    const telefonoVal = getSheetVal(row, idx, "telefono", "");
    const statoLavorativoVal = getSheetVal(row, idx, "statoLavorativo", "");
    const titoloStudioVal = getSheetVal(row, idx, "titoloStudio", "");
    const cittadinanzaVal = getSheetVal(row, idx, "cittadinanza", "");
    const residenzaVal = getSheetVal(row, idx, "residenza", "");
    const domicilioVal = getSheetVal(row, idx, "domicilio", "");
    const inCaricoServiziVal = getSheetVal(row, idx, "inCaricoServizi", "");
    const rapportoIntestatarioVal = getSheetVal(row, idx, "rapportoIntestatario", "");
    const cartaIdentitaVal = getSheetVal(row, idx, "cartaIdentita", "");
    const passaportoVal = getSheetVal(row, idx, "passaporto", false);
    const patenteVal = getSheetVal(row, idx, "patente", false);
    const permessoSoggiornoVal = getSheetVal(row, idx, "permessoSoggiorno", false);
    const tesseraSanitariaVal = getSheetVal(row, idx, "tesseraSanitaria", false);
    const statoCivileVal = getSheetVal(row, idx, "statoCivile", "");
    const annoArrivoVal = getSheetVal(row, idx, "annoArrivo", null);

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
      inCaricoServizi: inCaricoServiziVal,
      rapportoIntestatario: rapportoIntestatarioVal,
      cartaIdentita: cartaIdentitaVal,
      passaporto: passaportoVal,
      patente: patenteVal,
      permessoSoggiorno: permessoSoggiornoVal,
      tesseraSanitaria: tesseraSanitariaVal,
      statoCivile: statoCivileVal,
      annoArrivo: annoArrivoVal ? parseInt(annoArrivoVal, 10) : null
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
    if (idx.rapportoIntestatario >= 0) sheet.getRange(newRowIdx, idx.rapportoIntestatario + 1).setValue(data.rapportoIntestatario || "");
    if (idx.cartaIdentita >= 0) {
      const val = data.documents?.cartaIdentita || data.cartaIdentita || "Non posseduto";
      sheet.getRange(newRowIdx, idx.cartaIdentita + 1).setValue(val);
    }
    if (idx.passaporto >= 0) {
      const val = data.documents?.passaporto !== undefined ? data.documents.passaporto : data.passaporto;
      sheet.getRange(newRowIdx, idx.passaporto + 1).setValue(val ? true : false);
    }
    if (idx.patente >= 0) {
      const val = data.documents?.patente !== undefined ? data.documents.patente : data.patente;
      sheet.getRange(newRowIdx, idx.patente + 1).setValue(val ? true : false);
    }
    if (idx.permessoSoggiorno >= 0) {
      const val = data.documents?.permessoSoggiorno !== undefined ? data.documents.permessoSoggiorno : data.permessoSoggiorno;
      sheet.getRange(newRowIdx, idx.permessoSoggiorno + 1).setValue(val ? true : false);
    }
    if (idx.tesseraSanitaria >= 0) {
      const val = data.documents?.tesseraSanitaria !== undefined ? data.documents.tesseraSanitaria : data.tesseraSanitaria;
      sheet.getRange(newRowIdx, idx.tesseraSanitaria + 1).setValue(val ? true : false);
    }
    if (idx.statoCivile >= 0) sheet.getRange(newRowIdx, idx.statoCivile + 1).setValue(data.statoCivile || "");
    if (idx.annoArrivo >= 0) sheet.getRange(newRowIdx, idx.annoArrivo + 1).setValue(data.annoArrivo || "");

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
      rapportoIntestatario: findHeaderIndex(headers, ["rapporto con intestatario del nucleo familiare", "rapporto intestatario", "rapporto"]),
      cartaIdentita: findHeaderIndex(headers, ["carta identità", "carta d'identità", "ci"]),
      passaporto: findHeaderIndex(headers, ["passaporto"]),
      patente: findHeaderIndex(headers, ["patente"]),
      permessoSoggiorno: findHeaderIndex(headers, ["permesso di soggiorno", "permesso soggiorno"]),
      tesseraSanitaria: findHeaderIndex(headers, ["tessera sanitaria"]),
      statoCivile: findHeaderIndex(headers, ["stato civile"]),
      annoArrivo: findHeaderIndex(headers, ["anno arrivo in italia", "anno arrivo", "arrivo italia"]),
      dataInserimento: findHeaderIndex(headers, ["data inserimento", "data di inserimento", "inserimento"])
    };
  }
}
