/**
 * Recupera i dati dal foglio "Operatori" e li trasforma in un array di oggetti JS.
 * 
 * Restituisce una lista di oggetti con le proprietà: 
 * nome, cognome, codiceFiscale, dataNascita, luogoNascita, operatore, qualifica, ruolo, firma
 */
function getOperatoriObjects() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Operatori");
  
  if (!sheet) {
    Logger.log("Foglio 'Operatori' non trovato.");
    return [];
  }
  
  // Recupera tutti i dati, supponendo che la prima riga contenga le intestazioni
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return []; // Il foglio contiene solo l'intestazione o è vuoto
  }
  
  // Normalizziamo le intestazioni per essere più flessibili
  const headers = data[0].map(h => h.toString().trim().toLowerCase());
  
  // Mappatura delle colonne desiderate ai loro indici
  const colIndexes = {
    nome: headers.indexOf("nome"),
    cognome: headers.indexOf("cognome"),
    codiceFiscale: headers.indexOf("codice fiscale"),
    dataNascita: headers.indexOf("data di nascita"),
    luogoNascita: headers.indexOf("luogo di nascita"),
    operatore: headers.indexOf("operatore"),
    qualifica: headers.indexOf("qualifica"),
    ruolo: headers.indexOf("ruolo"),
    firma: headers.indexOf("firma")
  };
  
  const operatori = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Controlliamo che la riga non sia completamente vuota (verificando nome o cognome)
    if (colIndexes.nome >= 0 && row[colIndexes.nome] !== "" || 
        colIndexes.cognome >= 0 && row[colIndexes.cognome] !== "") {
      
      operatori.push({
        nome: colIndexes.nome >= 0 ? row[colIndexes.nome] : "",
        cognome: colIndexes.cognome >= 0 ? row[colIndexes.cognome] : "",
        codiceFiscale: colIndexes.codiceFiscale >= 0 ? row[colIndexes.codiceFiscale] : "",
        dataNascita: colIndexes.dataNascita >= 0 ? row[colIndexes.dataNascita] : "",
        luogoNascita: colIndexes.luogoNascita >= 0 ? row[colIndexes.luogoNascita] : "",
        operatore: colIndexes.operatore >= 0 ? row[colIndexes.operatore] : "",
        qualifica: colIndexes.qualifica >= 0 ? row[colIndexes.qualifica] : "",
        ruolo: colIndexes.ruolo >= 0 ? row[colIndexes.ruolo] : "",
        firma: colIndexes.firma >= 0 ? row[colIndexes.firma] : ""
      });
    }
  }
  
  return operatori;
}

/**
 * Restituisce un oggetto operatore cercando per nome
 * 
 * @param {string} nome - Il nome dell'operatore (es. "Lorenzo")
 * @returns {object|null} - L'oggetto operatore o null se non trovato
 */
function getOperatoreByName(nome) {
  const operatori = getOperatoriObjects();
  
  if (!nome) return null;
  
  const target = nome.toLowerCase().trim();

  const operator = operatori.find(op => op.nome.toLowerCase().trim() === target.toLowerCase().trim());

  return operator || null;
}
