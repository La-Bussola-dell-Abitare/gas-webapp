/**
 * Classe che rappresenta l'entità Foglio Firme.
 */
class FoglioFirme {
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
 * Repository per la gestione dei Fogli Firme su Google Drive e Google Docs.
 */
class FoglioFirmeRepository {
  /**
   * Verifica se esiste un foglio firme per i parametri specificati.
   * @param {string} operator - Nome operatore
   * @param {string} client - Nome beneficiario
   * @param {Date} [date] - Data di riferimento
   * @param {GoogleAppsScript.Drive.Folder} [folder] - Cartella di destinazione
   * @return {FoglioFirme | null} L'oggetto FoglioFirme se trovato, altrimenti null
   */
  static get(operator, client, date = new Date(), folder = CONFIG.FOGLIFIRME.FOLDER) {
    const monthYear = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
    const existingFilesMatchingProperties = folder.searchFiles(
      `properties has { key='mese' and value='${monthYear}' and visibility='PUBLIC' } and properties has { key='operatore' and value='${operator}' and visibility='PUBLIC' } and properties has { key='beneficiario' and value='${client}' and visibility='PUBLIC' } and trashed = false`
    );
    if (existingFilesMatchingProperties.hasNext()) {
      const file = existingFilesMatchingProperties.next();
      return new FoglioFirme(file.getId(), file.getName(), file.getUrl());
    } else {
      const existingFilesMatchingTitle = folder.searchFiles(
        `title contains '${monthYear}' and title contains '${client}' and title contains '${operator}' and trashed = false`
      );
      if (existingFilesMatchingTitle.hasNext()) {
        const file = existingFilesMatchingTitle.next();
        return new FoglioFirme(file.getId(), file.getName(), file.getUrl());
      }
    }
    return null;
  }

  /**
   * Crea un nuovo foglio firme individuale copiandolo dal template.
   * @param {string} operator - Nome operatore
   * @param {string} client - Nome beneficiario
   * @param {Date} [date] - Data di riferimento
   * @return {FoglioFirme} Il nuovo FoglioFirme creato
   */
  static create(operator, client, date = new Date()) {
    const monthYear = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
    const fileName = `${monthYear} ${client} (${operator})`;
    
    const templateFile = CONFIG.FOGLIFIRME.TEMPLATE;
    const folder = CONFIG.FOGLIFIRME.FOLDER;
    const newFile = templateFile.makeCopy(fileName, folder);
    const id = newFile.getId();
    
    try {
      Drive.Properties.insert({key: 'mese', value: monthYear, visibility: 'PUBLIC'}, id);
      Drive.Properties.insert({key: 'operatore', value: operator, visibility: 'PUBLIC'}, id);
      Drive.Properties.insert({key: 'beneficiario', value: client, visibility: 'PUBLIC'}, id);
    } catch(e) {
      Logger.log('Drive API Advanced Service not enabled. Properties skipped.');
    }
    
    const doc = DocumentApp.openById(id);
    const body = doc.getBody();
    
    body.replaceText("{data}", monthYear);
    body.replaceText("{operatore}", operator);
    body.replaceText("{cliente}", client);
    
    doc.saveAndClose();
    
    return new FoglioFirme(id, fileName, newFile.getUrl());
  }

  /**
   * Aggiunge una riga al foglio firme.
   */
  static appendRow() {
    // Implementazione vuota per retrocompatibilità
  }
}

// Wrapper per retrocompatibilità con vecchie chiamate procedurali
function checkFoglioFirme(operator, client, date, folder) {
  return FoglioFirmeRepository.get(operator, client, date, folder);
}
function createFoglioFirme(operator, client, date) {
  return FoglioFirmeRepository.create(operator, client, date);
}
function appendRowToFoglioFirme() {
  return FoglioFirmeRepository.appendRow();
}
