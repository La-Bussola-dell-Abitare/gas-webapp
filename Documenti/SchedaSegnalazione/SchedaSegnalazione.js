/**
 * Classe per la gestione delle Schede di Segnalazione generate a partire dal template.
 */
class SchedaSegnalazione {
  /**
   * @param {string} id - L'ID del documento Google Doc della scheda
   */
  constructor(id) {
    this.id = id;
  }

  /**
   * Crea una nuova scheda di segnalazione da template.
   * 
   * @param {Object} data - Dati per la scheda
   * @param {string} data.inviante - Nome e cognome dell'operatore inviante
   * @param {string} data.operatore_contatto - Email/contatto dell'operatore
   * @param {Object} data.beneficiario - Dati del beneficiario
   * @param {string} data.beneficiario.nome
   * @param {string} data.beneficiario.cognome
   * @param {string} data.beneficiario.cf
   * @param {string} [data.beneficiario.dataNascita]
   * @param {string} [data.beneficiario.luogoNascita]
   * @param {string} [data.beneficiario.telefono]
   * @param {string} data.idNucleo - ID del nucleo familiare (per il nome del file)
   * @param {string} data.nomeIntestatario - Nome dell'intestatario del nucleo
   * @param {string} [data.descrizione] - Descrizione del caso
   * @param {string} [data.luogo] - Luogo di redazione (es. "Roma")
   * @param {string} [data.data] - Data di redazione
   * @param {Object|string} [data.firma] - ID Drive dell'immagine della firma, o oggetto {id, width, height}
   * @param {Object} [data.checkboxes] - Mappa chiave-valore per spuntare checkbox (es. { "Iscrizione": true })
   * @return {SchedaSegnalazione} Nuova istanza della scheda creata
   */
  static create(data) {
    const templateId = CONFIG.ID_TEMPLATESCHEDASEGNALAZIONE;
    const folderId = CONFIG.FOLDER_SCHEDASEGNALAZIONE_ID;

    if (!templateId || !folderId) {
      throw new Error("ID template o ID cartella Scheda Segnalazione non configurati in Config.js");
    }

    // Costruisci il nome del documento secondo le istruzioni:
    // "Scheda segnalazione Numero Nucleo Familiare (Nome Cognome Intestatario) <- Nome Inviante"
    const idNucleo = data.idNucleo || "";
    const nomeIntestatario = data.nomeIntestatario || "";
    const inviante = data.inviante || "";
    const docName = "Scheda segnalazione " + idNucleo + " (" + nomeIntestatario + ") <- " + inviante;

    const params = {
      operatore_nome: inviante,
      operatore_contatto: data.operatore_contatto || "",
      beneficiario_nome: data.beneficiario.nome || "",
      beneficiario_cognome: data.beneficiario.cognome || "",
      beneficiario_datanascita: data.beneficiario.dataNascita || "",
      beneficiario_luogonascita: data.beneficiario.luogoNascita || "",
      beneficiario_cf: data.beneficiario.cf || "",
      beneficiario_tel: data.beneficiario.telefono || "",
      beneficiario_descrizione: data.descrizione || "",
      luogo: data.luogo || "",
      data: data.data || "",
      firma: data.firma || ""
    };

    // Aggiungi le checkbox ai parametri
    if (data.checkboxes) {
      Object.keys(data.checkboxes).forEach(key => {
        params[key] = data.checkboxes[key];
      });
    }

    const docId = createGoogleDocFromTemplate(templateId, folderId, docName, params);
    return new SchedaSegnalazione(docId);
  }

  /**
   * Restituisce l'URL del file Google Doc.
   * @return {string}
   */
  getUrl() {
    return DriveApp.getFileById(this.id).getUrl();
  }

  /**
   * Genera e ritorna il PDF della scheda di segnalazione come blob.
   * @return {Blob}
   */
  getPdfBlob() {
    return DriveApp.getFileById(this.id).getAs(MimeType.PDF);
  }

  /**
   * Cerca e filtra le schede esistenti nella cartella di destinazione.
   * 
   * @param {Object} filter - Filtri opzionali per la ricerca
   * @param {string} [filter.intestatario] - Parte del nome dell'intestatario
   * @param {string} [filter.inviante] - Parte del nome dell'operatore inviante
   * @param {string} [filter.idNucleo] - ID specifico del nucleo
   * @return {Array<Object>} Elenco di schede trovate con i relativi metadati
   */
  static search(filter = {}) {
    const folderId = CONFIG.FOLDER_SCHEDASEGNALAZIONE_ID;
    if (!folderId) return [];

    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const results = [];

    const intestatarioFilter = filter.intestatario ? filter.intestatario.toLowerCase() : null;
    const invianteFilter = filter.inviante ? filter.inviante.toLowerCase() : null;
    const idNucleoFilter = filter.idNucleo ? filter.idNucleo.toString() : null;

    while (files.hasNext()) {
      const file = files.next();
      const name = file.getName();

      // Corrisponde al formato: "Scheda segnalazione [Numero Nucleo] ([Intestatario]) <- [Inviante]"
      const match = name.match(/^Scheda\s+segnalazione\s+(\d*)\s*\(([^)]+)\)\s*<-\s*(.+)$/i);
      if (match) {
        const idNucleo = match[1].trim();
        const intestatario = match[2].trim();
        const inviante = match[3].trim();

        let matches = true;
        if (idNucleoFilter && idNucleo !== idNucleoFilter) matches = false;
        if (intestatarioFilter && intestatario.toLowerCase().indexOf(intestatarioFilter) === -1) matches = false;
        if (invianteFilter && inviante.toLowerCase().indexOf(invianteFilter) === -1) matches = false;

        if (matches) {
          results.push({
            id: file.getId(),
            name: name,
            url: file.getUrl(),
            idNucleo: idNucleo,
            intestatario: intestatario,
            inviante: inviante,
            dateCreated: file.getDateCreated()
          });
        }
      }
    }

    return results;
  }
}
