/**
 * @file DiarioGiornaliero.js
 * @description Modello che rappresenta l'entità Diario Giornaliero dello sportello sociale.
 * Traccia l'accesso, le ore lavorate e le attività svolte dagli operatori nel corso di ogni singola giornata.
 * @module Service/Template/DiarioGiornaliero
 */

/**
 * Classe che rappresenta un documento di Diario Giornaliero generato.
 * 
 * @property {string} id - L'ID del file Google Docs su Google Drive.
 * @property {string} name - Il nome formale del documento (es. "Diario Giornaliero 2026-07-14").
 * @property {string} url - L'URL diretto per la visualizzazione e modifica su Google Docs.
 */
class DiarioGiornaliero {
  /**
   * Crea un'istanza di DiarioGiornaliero.
   * @param {string} id - L'ID del documento Google Docs.
   * @param {string} name - Il nome del file.
   * @param {string} url - L'URL di accesso al documento.
   */
  constructor(id, name, url) {
    this.id = id;
    this.name = name;
    this.url = url;
  }
}
