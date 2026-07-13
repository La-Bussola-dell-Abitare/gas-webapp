/**
 * Checks if a foglio firme exists for the given parameters.
 * @param {*} folder 
 * @param {*} date 
 * @param {*} operator 
 * @param {*} client
 * @returns the file if it exists, null otherwise
 */
function checkFoglioFirme(operator, client, date = new Date(), folder = CONFIG.FOGLIFIRME.FOLDER) {
  // check if a file with the name "year-month client (operator)" exists in the folder fogli firme
  const monthYear = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
  const fileName = `${monthYear} ${client} (${operator})`;

  // search in the folder for a file whose properties date, operator and client match the current values (Drive API Advanced Service must be enabled) 
  const existingFilesMatchingProperties = folder.searchFiles(`properties has { key='mese' and value='${monthYear}' and visibility='PUBLIC' } and properties has { key='operatore' and value='${operator}' and visibility='PUBLIC' } and properties has { key='beneficiario' and value='${client}' and visibility='PUBLIC' } and trashed = false`);
  if (existingFilesMatchingProperties.hasNext()) {
    return existingFilesMatchingProperties.next();
  } else {
  // search in the folder for a file whose title contains the monthYear, client and operator
  const existingFilesMatchingTitle = folder.searchFiles(`title contains '${monthYear}' and title contains '${client}' and title contains '${operator}' and trashed = false`);
    if (existingFilesMatchingTitle.hasNext()) {
      return existingFilesMatchingTitle.next();
    }
  }

  // if it doesn't exists, return null
  return null;
}

function createFoglioFirme(operator, client, date = new Date()) {
  // create a copy of the fogli firme template, name it with "year-month client (operator)" and save it in the folder fogli firme

  // add custom properties (month, operator, client) to the file
  // find in google docs file templates for {data}, {operatore} and {cliente} and replace them with the actual values  const monthYear = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);

  // format date as "YYYY-MM" for the file name
  const monthYear = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);

  const fileName = `${monthYear} ${client} (${operator})`;
  
  // create a copy of the template, name it and save it
  const templateFile = CONFIG.FOGLIFIRME.TEMPLATE;
  const newFoglioFirme = templateFile.makeCopy(fileName, folder);
  
  // add custom properties (month, operator, client) to the file
  try {
    Drive.Properties.insert({key: 'mese', value: monthYear, visibility: 'PUBLIC'}, newFoglioFirme.getId());
    Drive.Properties.insert({key: 'operatore', value: operator, visibility: 'PUBLIC'}, newFoglioFirme.getId());
    Drive.Properties.insert({key: 'beneficiario', value: client, visibility: 'PUBLIC'}, newFoglioFirme.getId());
  } catch(e) {
    Logger.log('Drive API Advanced Service not enabled. Properties skipped.');
  }
  
  // find in google docs file templates for {data}, {operatore} and {cliente} and replace them with the actual values
  const doc = DocumentApp.openById(newFoglioFirme.getId());
  const body = doc.getBody();
  
  const dateFormatted = ("0" + date.getDate()).slice(-2) + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + date.getFullYear();
  // Using monthYear for {data} if that's the intention for the whole document, or the specific date
  body.replaceText("{data}", monthYear);
  body.replaceText("{operatore}", operator);
  body.replaceText("{cliente}", client);
  
  doc.saveAndClose();
  
  return newFoglioFirme;
}

function appendRowToFoglioFirme() {
  // create new table row in penultimate position
  // fill row with date, hours, operator signature, client signature, 
}

