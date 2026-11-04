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
    this.idNucleo = data.idNucleo || "";
    this.statoLavorativo = data.statoLavorativo || "";
    this.titoloStudio = data.titoloStudio || "";
    this.residenza = data.residenza || "";
    this.domicilio = data.domicilio || "";
    this.assistenteSociale = data.assistenteSociale || "";
    this.rapportoIntestatario = data.rapportoIntestatario || "";
    this.statoCivile = data.statoCivile || "";
    this.annoArrivo = data.annoArrivo || null;

    /** @type {PersonDocuments} */
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
