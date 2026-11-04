/**
 * @file Config.js
 * @description Modulo di configurazione centralizzato e immutabile del sistema.
 * Contiene gli identificativi univoci (ID Drive) delle cartelle di destinazione e dei template Google Docs
 * (Fogli Firme, Schede di Segnalazione, Diari Giornalieri), implementando getter lazy per ottimizzare le chiamate a DriveApp.
 * @module Utils/Config
 */

/**
 * Oggetto di configurazione immutabile dell'applicazione.
 * @readonly
 */
const CONFIG = Object.freeze({

  /**
   * Configurazione per la gestione dei Fogli Firme Individuali.
   */
  FOGLIFIRME: Object.freeze({
    /** @type {string} ID della cartella Drive contenente i fogli firme generati */
    FOLDER_ID: "1RtG5jByebEOKmtiVvM1paF_h573ISUB1",
    /** @type {string} ID del file template Google Docs del foglio firme */
    TEMPLATE_ID: "1TTMfTDKUbXyWk1R520oCOVInA5m8kvcb",

    /**
     * Getter lazy che restituisce l'istanza Folder di Google Drive (esegue DriveApp solo alla prima chiamata).
     * @return {GoogleAppsScript.Drive.Folder}
     */
    get FOLDER() {
      if (!this._folder) {
        Logger.log("Chiamata a DriveApp in corso (FOGLIFIRME.FOLDER)...");
        this._folder = DriveApp.getFolderById(this.FOLDER_ID);
      }
      return this._folder;
    },

    /**
     * Getter lazy che restituisce l'istanza File di Google Drive per il template.
     * @return {GoogleAppsScript.Drive.File}
     */
    get TEMPLATE() {
      if (!this._template) {
        Logger.log("Chiamata a DriveApp in corso (FOGLIFIRME.TEMPLATE)...");
        this._template = DriveApp.getFileById(this.TEMPLATE_ID);
      }
      return this._template;
    }
  }),

  /** @type {string} ID del template Google Docs per il diario giornaliero */
  ID_TEMPLATEDIARIOGIORNALIERO: "",
  /** @type {string} ID del template Google Docs per la scheda di segnalazione */
  ID_TEMPLATESCHEDASEGNALAZIONE: "1d8lSB1b40QGmZ5yC7ILh7fljzUHuqpllZnDjA0URnx0",
  /** @type {string} ID della cartella Drive in cui vengono salvate le schede di segnalazione */
  FOLDER_SCHEDASEGNALAZIONE_ID: "1RJ_GC2VpCN8tBwsa48jV6sWo6szrqYRs",

  /**
   * Getter lazy per il file template del Diario Giornaliero.
   * @return {GoogleAppsScript.Drive.File|null}
   */
  get TEMPLATEDIARIOGIORNALIERO() {
    if (!this._templateDiario && this.ID_TEMPLATEDIARIOGIORNALIERO) {
      Logger.log("Chiamata a DriveApp in corso (TEMPLATEDIARIOGIORNALIERO)...");
      this._templateDiario = DriveApp.getFileById(this.ID_TEMPLATEDIARIOGIORNALIERO);
    }
    return this._templateDiario || null;
  },

  /**
   * Getter lazy per il file template della Scheda di Segnalazione.
   * @return {GoogleAppsScript.Drive.File}
   */
  get TEMPLATESCHEDASEGNALAZIONE() {
    if (!this._templateSegnalazione) {
      Logger.log("Chiamata a DriveApp in corso (TEMPLATESCHEDASEGNALAZIONE)...");
      this._templateSegnalazione = DriveApp.getFileById(this.ID_TEMPLATESCHEDASEGNALAZIONE);
    }
    return this._templateSegnalazione;
  },

});
