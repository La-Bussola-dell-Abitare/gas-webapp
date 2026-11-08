/**
 * @file Config.js
 * @description Modulo di configurazione centralizzato e immutabile del sistema.
 * Contiene gli identificativi univoci (ID Drive) delle cartelle di destinazione e dei template Google Docs
 * (Fogli Firme, Schede di Segnalazione, Diari Giornalieri), implementando getter lazy per ottimizzare le chiamate a DriveApp.
 * @module Utils/Config
 */

/**
 * Cache interna per le istanze Drive (evita scritture su oggetti congelati con Object.freeze).
 * @private
 */
const _CONFIG_DRIVE_CACHE = {};

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
      if (!_CONFIG_DRIVE_CACHE.fogliFirmeFolder) {
        Logger.log("Chiamata a DriveApp in corso (FOGLIFIRME.FOLDER)...");
        _CONFIG_DRIVE_CACHE.fogliFirmeFolder = DriveApp.getFolderById(this.FOLDER_ID);
      }
      return _CONFIG_DRIVE_CACHE.fogliFirmeFolder;
    },

    /**
     * Getter lazy che restituisce l'istanza File di Google Drive per il template.
     * @return {GoogleAppsScript.Drive.File}
     */
    get TEMPLATE() {
      if (!_CONFIG_DRIVE_CACHE.fogliFirmeTemplate) {
        Logger.log("Chiamata a DriveApp in corso (FOGLIFIRME.TEMPLATE)...");
        _CONFIG_DRIVE_CACHE.fogliFirmeTemplate = DriveApp.getFileById(this.TEMPLATE_ID);
      }
      return _CONFIG_DRIVE_CACHE.fogliFirmeTemplate;
    }
  }),

  /** @type {string} ID del template Google Docs per il diario giornaliero */
  ID_TEMPLATEDIARIOGIORNALIERO: "",
  /** @type {string} ID del template Google Docs per la scheda di segnalazione */
  ID_TEMPLATESCHEDASEGNALAZIONE: "1d8lSB1b40QGmZ5yC7ILh7fljzUHuqpllZnDjA0URnx0",
  /** @type {string} ID della cartella Drive in cui vengono salvate le schede di segnalazione */
  FOLDER_SCHEDASEGNALAZIONE_ID: "1RJ_GC2VpCN8tBwsa48jV6sWo6szrqYRs",
  /** @type {string} ID della cartella radice Drive contenente le cartelle dei nuclei/beneficiari */
  FOLDER_BENEFICIARI_ROOT_ID: "1cBAWWPnRZNhj1xubIM89inMehvB-sFiE",

  /**
   * Getter lazy per la cartella radice Drive dei beneficiari/nuclei.
   * @return {GoogleAppsScript.Drive.Folder}
   */
  get FOLDER_BENEFICIARI_ROOT() {
    if (!_CONFIG_DRIVE_CACHE.folderBeneficiariRoot) {
      Logger.log("Chiamata a DriveApp in corso (FOLDER_BENEFICIARI_ROOT)...");
      _CONFIG_DRIVE_CACHE.folderBeneficiariRoot = DriveApp.getFolderById(this.FOLDER_BENEFICIARI_ROOT_ID);
    }
    return _CONFIG_DRIVE_CACHE.folderBeneficiariRoot;
  },

  /**
   * Getter lazy per il file template del Diario Giornaliero.
   * @return {GoogleAppsScript.Drive.File|null}
   */
  get TEMPLATEDIARIOGIORNALIERO() {
    if (!_CONFIG_DRIVE_CACHE.templateDiario && this.ID_TEMPLATEDIARIOGIORNALIERO) {
      Logger.log("Chiamata a DriveApp in corso (TEMPLATEDIARIOGIORNALIERO)...");
      _CONFIG_DRIVE_CACHE.templateDiario = DriveApp.getFileById(this.ID_TEMPLATEDIARIOGIORNALIERO);
    }
    return _CONFIG_DRIVE_CACHE.templateDiario || null;
  },

  /**
   * Getter lazy per il file template della Scheda di Segnalazione.
   * @return {GoogleAppsScript.Drive.File}
   */
  get TEMPLATESCHEDASEGNALAZIONE() {
    if (!_CONFIG_DRIVE_CACHE.templateSegnalazione) {
      Logger.log("Chiamata a DriveApp in corso (TEMPLATESCHEDASEGNALAZIONE)...");
      _CONFIG_DRIVE_CACHE.templateSegnalazione = DriveApp.getFileById(this.ID_TEMPLATESCHEDASEGNALAZIONE);
    }
    return _CONFIG_DRIVE_CACHE.templateSegnalazione;
  },

  /** @type {string} Nome del foglio Google dedicato ai documenti e scadenze */
  SHEET_DOCUMENTI: "Documenti",

  /**
   * Intestazioni standardizzate per il foglio 'Documenti'.
   * @readonly
   * @type {readonly string[]}
   */
  HEADERS_DOCUMENTI: Object.freeze([
    "ID Documento",
    "Intestatario",
    "Tipo",
    "Categoria",
    "Valore",
    "Data Emissione",
    "Data Scadenza",
    "ID Drive",
    "Note",
    "Data Inserimento"
  ]),

  /**
   * Configurazione per Google Gemini (Document Intelligence & OCR).
   */
  GEMINI: Object.freeze({
    MODEL: "gemini-2.0-flash",
    API_URL: "https://generativelanguage.googleapis.com/v1beta/models/",
    /**
     * Recupera la chiave API da ScriptProperties o fallback.
     * @return {string}
     */
    getApiKey: function() {
      try {
        if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
          const props = PropertiesService.getScriptProperties();
          return props.getProperty("GEMINI_API_KEY") || props.getProperty("GOOGLE_API_KEY") || "";
        }
      } catch (e) {
        Logger.log("Config: errore lettura ScriptProperties per Gemini: " + e.message);
      }
      return "";
    }
  })

});
