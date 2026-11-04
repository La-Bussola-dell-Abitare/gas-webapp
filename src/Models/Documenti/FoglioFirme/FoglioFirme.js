/**
 * @file FoglioFirme.js
 * @description Modello che rappresenta l'entità Foglio Firme Individuale.
 * Raccoglie e attesta gli incontri e le ore di colloquio intercorse mensilmente tra uno specifico
 * operatore e un beneficiario dello sportello "La Bussola dell'Abitare".
 * @module Models/Documenti/FoglioFirme
 */

/**
 * Classe che rappresenta il Foglio Firme di intervento individuale.
 * 
 * @property {string|Operatore} operator - Nome o istanza dell'operatore referente.
 * @property {string|Beneficiario} client - Nome o istanza del beneficiario accolto.
 * @property {Date|string} [date] - Mese e anno o data di riferimento del foglio.
 * @property {string} [id] - L'ID del documento Google Docs su Drive (se generato).
 * @property {string} [name] - Il nome del file Google Docs generato.
 * @property {string} [url] - L'URL di accesso al documento su Google Docs.
 */
class FoglioFirme {
  /**
   * Crea un'istanza di FoglioFirme.
   * @param {string|Operatore} operator - L'operatore referente o l'ID del file se creato da repository.
   * @param {string|Beneficiario} client - Il beneficiario associato o il nome del file.
   * @param {Date|string} [date] - La data/mese di riferimento o l'URL del file.
   */
  constructor(operator, client, date) {
    this.operator = operator;
    this.client = client;
    this.date = date;

    // Supporto retrocompatibile nel caso sia istanziato con (id, fileName, url)
    if (typeof operator === "string" && typeof client === "string" && typeof date === "string" && date.startsWith("http")) {
      this.id = operator;
      this.name = client;
      this.url = date;
    }
  }
}
