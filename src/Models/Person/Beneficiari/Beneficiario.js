/**
 * @file Beneficiario.js
 * @description Modello per la gestione del Beneficiario dello sportello sociale "La Bussola dell'Abitare".
 * Estende la classe Person includendo i campi specialistici: nucleo familiare di appartenenza,
 * situazione lavorativa, titolo di studio, residenza e domicilio, presa in carico dei servizi sociali
 * e inventario dei documenti di identità/soggiorno posseduti.
 * @module Models/Person/Beneficiario
 */

/**
 * Stato di possesso dei documenti del beneficiario.
 * @typedef {Object} PersonDocuments
 * @property {string} [cartaIdentita] - Tipo di carta d'identità ("Non posseduto", "cartacea", "elettronica").
 * @property {boolean} [passaporto] - Indicatore di possesso del passaporto.
 * @property {boolean} [patente] - Indicatore di possesso della patente di guida.
 * @property {boolean} [permessoSoggiorno] - Indicatore di possesso del permesso di soggiorno.
 * @property {boolean} [tesseraSanitaria] - Indicatore di possesso della tessera sanitaria.
 */

/**
 * Proprietà specifiche del beneficiario che estendono PersonData.
 * @typedef {Object} BeneficiarioOnlyData
 * @property {string|number} idNucleo - L'identificativo del nucleo familiare di appartenenza.
 * @property {string} [statoLavorativo] - Lo stato occupazionale del beneficiario (es. "occupato", "disoccupato").
 * @property {string} [titoloStudio] - Il titolo di studio conseguito.
 * @property {Address|string} residenza - L'indirizzo di residenza anagrafica.
 * @property {Address|string} [domicilio=residenza] - Il domicilio effettivo del beneficiario.
 * @property {string} [assistenteSociale] - Indicazione o nominativo del servizio sociale di presa in carico.
 * @property {"Intestatario" | "Coniuge" | "Figlio" | "Altro" | string} rapportoIntestatario - Relazione con l'intestatario del nucleo.
 * @property {string} [statoCivile] - Lo stato civile del beneficiario.
 * @property {number | null} [annoArrivo] - L'anno di arrivo in Italia (se straniero).
 * @property {PersonDocuments} [documents] - L'oggetto contenente lo stato dei documenti.
 */

/**
 * Struttura combinata dei dati per la creazione di un Beneficiario.
 * @typedef {PersonData & BeneficiarioOnlyData} BeneficiarioData
 */

/**
 * Classe che rappresenta un beneficiario accolto o preso in carico dallo sportello.
 * @extends Person
 */
class Beneficiario extends Person {
  /**
   * Crea un'istanza di Beneficiario.
   * @param {BeneficiarioData} data - I dati anagrafici e sociali del beneficiario.
   */
  constructor(data) {
    super(data);
    this.idNucleo = data.idNucleo !== undefined && data.idNucleo !== null ? String(data.idNucleo) : "";
    this.statoLavorativo = data.statoLavorativo || "";
    this.titoloStudio = data.titoloStudio || "";
    this.residenza = data.residenza || "";
    this.domicilio = data.domicilio || data.residenza || "";
    this.assistenteSociale = data.assistenteSociale || "";
    this.rapportoIntestatario = data.rapportoIntestatario || "";
    this.statoCivile = data.statoCivile || "";
    this.annoArrivo = data.annoArrivo !== undefined && data.annoArrivo !== null ? Number(data.annoArrivo) : null;

    /** @type {PersonDocuments} */
    this.documents = {
      cartaIdentita: data.documents?.cartaIdentita || data.cartaIdentita || "Non posseduto",
      passaporto: !!(data.documents?.passaporto !== undefined ? data.documents.passaporto : data.passaporto),
      patente: !!(data.documents?.patente !== undefined ? data.documents.patente : data.patente),
      permessoSoggiorno: !!(data.documents?.permessoSoggiorno !== undefined ? data.documents.permessoSoggiorno : data.permessoSoggiorno),
      tesseraSanitaria: !!(data.documents?.tesseraSanitaria !== undefined ? data.documents.tesseraSanitaria : data.tesseraSanitaria)
    };
  }

  // =========================================================================
  // FACTORY METHOD E DELEGAZIONI STATICHE (ACTIVE RECORD / REPOSITORY INTEGRATION)
  // =========================================================================

  /**
   * Factory method statico per istanziare un Beneficiario a partire da una riga grezza di Google Sheets
   * e dalla mappa degli indici di colonna calcolata dinamicamente dalle intestazioni.
   * 
   * @param {any[]} row - La riga di celle dal foglio "Beneficiari".
   * @param {Record<string, number>} idx - Mappa delle colonne (nome -> indice numerico 0-based).
   * @return {Beneficiario} Nuova istanza di Beneficiario idratata con i dati del foglio.
   */
  static fromRow(row, idx) {
    const getCell = (...keys) => {
      for (const k of keys) {
        if (!k) continue;
        const col = idx[k];
        if (col !== undefined && col >= 0 && col < row.length) {
          const val = row[col];
          if (val !== null && val !== undefined && val !== "") {
            return val;
          }
        }
      }
      return "";
    };

    const getStr = (...keys) => {
      const v = getCell(...keys);
      return typeof safeString === "function" ? safeString(v) : (v !== null && v !== undefined ? String(v).trim() : "");
    };

    const toBool = (...keys) => {
      const v = getCell(...keys);
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === 1;
      if (!v) return false;
      const s = String(v).trim().toLowerCase();
      return s === "true" || s === "si" || s === "sì" || s === "1" || s === "x" || s === "v" || s === "checked";
    };

    const toNum = (...keys) => {
      const v = getCell(...keys);
      if (v === null || v === undefined || v === "") return null;
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    };

    const nomeVal = getStr("nome");
    const cognomeVal = getStr("cognome");
    const cfVal = getStr("cf", "codice fiscale").toUpperCase();

    // Data di nascita: può essere un oggetto Date o stringa
    let dataNascitaVal = getCell("dataNascita", "data di nascita", "data nascita");
    if (dataNascitaVal && !(dataNascitaVal instanceof Date)) {
      dataNascitaVal = String(dataNascitaVal).trim();
    }

    const luogoNascitaVal = getStr("luogoNascita", "luogo di nascita", "luogo nascita");
    const emailVal = getStr("email", "e-mail");
    const telefonoVal = getStr("telefono", "cellulare", "tel");
    const statoLavorativoVal = getStr("statoLavorativo", "stato lavorativo", "lavoro");
    const titoloStudioVal = getStr("titoloStudio", "titolo di studio", "titolo studio");
    const cittadinanzaVal = getStr("cittadinanza");
    const residenzaVal = getStr("residenza");
    const domicilioVal = getStr("domicilio") || residenzaVal;
    const assistenteSocialeVal = getStr("assistenteSociale", "in carico ai servizi", "in carico", "servizi");
    const rapportoIntestatarioVal = getStr("rapportoIntestatario", "rapporto con intestatario del nucleo familiare", "rapporto intestatario", "rapporto");
    const cartaIdentitaVal = getStr("cartaIdentita", "carta identità", "carta d'identità", "ci") || "Non posseduto";
    const passaportoVal = toBool("passaporto");
    const patenteVal = toBool("patente");
    const permessoSoggiornoVal = toBool("permessoSoggiorno", "permesso di soggiorno", "permesso soggiorno");
    const tesseraSanitariaVal = toBool("tesseraSanitaria", "tessera sanitaria");
    const statoCivileVal = getStr("statoCivile", "stato civile");
    const annoArrivoVal = toNum("annoArrivo", "anno arrivo in italia", "anno arrivo", "arrivo italia");
    const idNucleoVal = getStr("idNucleo", "nucleo familiare", "id nucleo", "nucleo");

    let taxCodeObj = null;
    if (cfVal) {
      try {
        taxCodeObj = new CodiceFiscale(cfVal);
      } catch (e) {
        taxCodeObj = { originale: cfVal, normalizzato: cfVal };
      }
    }

    return new Beneficiario({
      name: nomeVal,
      surname: cognomeVal,
      birthDate: dataNascitaVal,
      birthPlace: luogoNascitaVal,
      taxCode: taxCodeObj,
      email: emailVal || null,
      phone: telefonoVal || null,
      citizenship: cittadinanzaVal || null,
      idNucleo: idNucleoVal,
      statoLavorativo: statoLavorativoVal,
      titoloStudio: titoloStudioVal,
      residenza: residenzaVal,
      domicilio: domicilioVal,
      assistenteSociale: assistenteSocialeVal,
      rapportoIntestatario: rapportoIntestatarioVal,
      statoCivile: statoCivileVal,
      annoArrivo: annoArrivoVal,
      documents: {
        cartaIdentita: cartaIdentitaVal,
        passaporto: passaportoVal,
        patente: patenteVal,
        permessoSoggiorno: permessoSoggiornoVal,
        tesseraSanitaria: tesseraSanitariaVal
      }
    });
  }

  /**
   * Recupera tutti i beneficiari tramite BeneficiarioRepository.
   * @return {Beneficiario[]}
   */
  static getAll() {
    return BeneficiarioRepository.getAll();
  }

  /**
   * Salva o aggiorna un beneficiario sul foglio tramite BeneficiarioRepository.
   * @param {Record<string, any>} data - Dati del beneficiario.
   * @return {{ success: boolean; message: string }}
   */
  static add(data) {
    return BeneficiarioRepository.add(data);
  }

  /**
   * Rimuove un beneficiario cercando per codice fiscale tramite BeneficiarioRepository.
   * @param {string} cf - Codice fiscale del beneficiario da eliminare.
   * @return {{ success: boolean; message: string }}
   */
  static remove(cf) {
    return BeneficiarioRepository.removeByCF(cf);
  }

  /**
   * Alias per removeByCF.
   * @param {string} cf - Codice fiscale del beneficiario da eliminare.
   * @return {{ success: boolean; message: string }}
   */
  static removeByCF(cf) {
    return BeneficiarioRepository.removeByCF(cf);
  }

  // =========================================================================
  // GETTER ALIAS PER RETROCOMPATIBILITÀ DOCUMENTI
  // =========================================================================

  /**
   * Restituisce la tipologia di carta d'identità ("Non posseduto", "cartacea", "elettronica").
   * @return {string}
   */
  get cartaIdentita() { return this.documents.cartaIdentita; }

  /**
   * Restituisce se il beneficiario possiede il passaporto.
   * @return {boolean}
   */
  get passaporto() { return this.documents.passaporto; }

  /**
   * Restituisce se il beneficiario possiede la patente di guida.
   * @return {boolean}
   */
  get patente() { return this.documents.patente; }

  /**
   * Restituisce se il beneficiario possiede il permesso di soggiorno.
   * @return {boolean}
   */
  get permessoSoggiorno() { return this.documents.permessoSoggiorno; }

  /**
   * Restituisce se il beneficiario possiede la tessera sanitaria.
   * @return {boolean}
   */
  get tesseraSanitaria() { return this.documents.tesseraSanitaria; }
}
