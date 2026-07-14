const CONFIG = Object.freeze({

  FOGLIFIRME: Object.freeze({
    FOLDER_ID: "1RtG5jByebEOKmtiVvM1paF_h573ISUB1",
    TEMPLATE_ID: "1TTMfTDKUbXyWk1R520oCOVInA5m8kvcb",
    get FOLDER() {
      if (!this._folder) {
        Logger.log("Chiamata a DriveApp in corso..."); // Vedrai questo log solo quando serve davvero
        this._folder = DriveApp.getFolderById(this.FOLDER_ID);
      }
      return this._folder;
    },
    get TEMPLATE() {
      if (!this._template) {
        Logger.log("Chiamata a DriveApp in corso..."); // Vedrai questo log solo quando serve davvero
        this._template = DriveApp.getFileById(this.TEMPLATE_ID);
      }
      return this._template;
    }
  }),

  ID_TEMPLATEDIARIOGIORNALIERO: "",
  ID_TEMPLATESCHEDASEGNALAZIONE: "1d8lSB1b40QGmZ5yC7ILh7fljzUHuqpllZnDjA0URnx0",
  FOLDER_SCHEDASEGNALAZIONE_ID: "1RJ_GC2VpCN8tBwsa48jV6sWo6szrqYRs",


  get TEMPLATEDIARIOGIORNALIERO() {
    // Usiamo una variabile interna per non ripetere la chiamata API se lo usiamo più volte nella stessa esecuzione
    if (!this._templateDiario) {
      Logger.log("Chiamata a DriveApp in corso..."); // Vedrai questo log solo quando serve davvero
      this._templateDiario = DriveApp.getFileById(this.ID_TEMPLATEDIARIOGIORNALIERO);
    }
    return this._templateDiario;
  },

  get TEMPLATESCHEDASEGNALAZIONE() {
    // Usiamo una variabile interna per non ripetere la chiamata API se lo usiamo più volte nella stessa esecuzione
    if (!this._templateSegnalazione) {
      Logger.log("Chiamata a DriveApp in corso..."); // Vedrai questo log solo quando serve davvero
      this._templateSegnalazione = DriveApp.getFileById(this.ID_TEMPLATESCHEDASEGNALAZIONE);
    }
    return this._templateSegnalazione;
  },

});