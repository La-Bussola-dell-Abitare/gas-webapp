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

/**
 * Repository per la gestione e la generazione dei Diari Giornalieri.
 */
class DiarioGiornalieroRepository {
  /**
   * Genera o copia il diario giornaliero per una determinata data.
   * @param {string} dateStr - La data in formato stringa YYYY-MM-DD
   * @return {DiarioGiornaliero} Il diario giornaliero generato
   */
  static create(dateStr) {
    const folder = CONFIG.FOGLIFIRME.FOLDER;
    const fileName = "Diario Giornaliero " + dateStr;
    let newFile;
    
    if (CONFIG.ID_TEMLATEDIARIOGIORNALIERO) {
      const template = DriveApp.getFileById(CONFIG.ID_TEMLATEDIARIOGIORNALIERO);
      newFile = template.makeCopy(fileName, folder);
    } else {
      const doc = DocumentApp.create(fileName);
      const docFile = DriveApp.getFileById(doc.getId());
      folder.addFile(docFile);
      DriveApp.getRootFolder().removeFile(docFile);
      
      const body = doc.getBody();
      body.appendParagraph("Diario Giornaliero dello Sportello").setHeading(DocumentApp.ParagraphHeading.HEADING1);
      body.appendParagraph("Data: " + dateStr);
      body.appendParagraph("\nNomi e cognomi degli operatori della giornata:\n________________________________________________");
      body.appendParagraph("\nOrari di lavoro: ________________________________");
      body.appendParagraph("\nDescrizione del lavoro svolto:\n________________________________________________");
      body.appendParagraph("\nPersone accolte:\n");
      doc.saveAndClose();
      newFile = docFile;
    }
    
    return new DiarioGiornaliero(newFile.getId(), fileName, newFile.getUrl());
  }
}
