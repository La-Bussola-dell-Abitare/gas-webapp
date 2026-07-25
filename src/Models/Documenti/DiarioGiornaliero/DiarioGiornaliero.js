/**
 * Classe che rappresenta l'entità Diario Giornaliero.
 */
class DiarioGiornaliero {
  /**
   * @param {string} id - L'ID del documento Google Docs
   * @param {string} name - Il nome del file
   * @param {string} url - L'URL di accesso al documento
   */
  constructor(id, name, url) {
    this.id = id;
    this.name = name;
    this.url = url;
  }
}