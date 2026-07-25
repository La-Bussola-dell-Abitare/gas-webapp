/**
 * @typedef {Object} PersonDocuments
 * @property {string} [cartaIdentita] - Tipo di carta d'identità ("Non posseduto", "cartacea", "elettronica").
 * @property {boolean} [passaporto] - Possesso passaporto.
 * @property {boolean} [patente] - Possesso patente.
 * @property {boolean} [permessoSoggiorno] - Possesso permesso di soggiorno.
 * @property {boolean} [tesseraSanitaria] - Possesso tessera sanitaria.
 */

/**
 * @typedef {Object} BeneficiarioOnlyData
 * @property {number} idNucleo - L'identificativo del nucleo familiare.
 * @property {string} [statoLavorativo] - Lo stato lavorativo del beneficiario.
 * @property {string} [titoloStudio] - Il titolo di studio del beneficiario.
 * @property {Address} residenza - La residenza del beneficiario.
 * @property {Address} [domicilio=residenza] - Il domicilio del beneficiario.
 * @property {string} [assistenteSociale] - L'ente di presa in carico del beneficiario.
 * @property {"Intestatario" | "Coniuge" | "Figlio" | "Altro"} rapportoIntestatario - Il rapporto con l'intestatario della bolletta.
 * @property {string} [statoCivile] - Lo stato civile del beneficiario.
 * @property {number | null} [annoArrivo] - L'anno di arrivo in Italia del beneficiario.
 * @property {PersonDocuments} [documents] - I documenti del beneficiario.
 */

/**
 * @typedef {PersonData & BeneficiarioOnlyData} BeneficiarioData
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
  get cartaIdentita() { return this.documents.cartaIdentita; }
  get passaporto() { return this.documents.passaporto; }
  get patente() { return this.documents.patente; }
  get permessoSoggiorno() { return this.documents.permessoSoggiorno; }
  get tesseraSanitaria() { return this.documents.tesseraSanitaria; }


}