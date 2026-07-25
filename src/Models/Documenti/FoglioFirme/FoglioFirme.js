/**
 * Classe che rappresenta l'entità Foglio Firme.
 */
class FoglioFirme {
  /**
   * @param {Operatore} operator - Operatore
   * @param {Cliente} client - Beneficiario
   * @param {Date} [date] - Data di riferimento
   */
  constructor(operator, client, date) {
    this.operator = operator;
    this.client = client;
    this.date = date;
  }
}