/**
 * WEB APP - CONTROLLER E INTERFACCIA SERVER-SIDE
 */

const WA_SHEET_BENEFICIARI = "Beneficiari";
const WA_SHEET_OPERATORI = "Operatori";
const WA_SHEET_INCONTRI_OPERATORE = "Incontri con operatore";
const WA_SHEET_INCONTRI_ASSISTENTE = "Incontri con assistente sociale";

/**
 * Gestisce la richiesta HTTP GET per servire la pagina web.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("WebApp/Frontend")
    .evaluate()
    .setTitle("Registrazione Sportello - La Bussola dell'Abitare")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Recupera i beneficiari dal foglio e li trasforma in un array di oggetti JS.
 */
function getBeneficiariObjects() {
  return Beneficiario.getAll();
}

/**
 * Ottiene la lista dei beneficiari registrati per l'autocompletamento.
 * Ritorna un array di stringhe "Nome Cognome (Codice Fiscale)" ordinate alfabeticamente.
 */
function getBeneficiariesList() {
  const beneficiari = getBeneficiariObjects();
  const list = [];

  for (let i = 0; i < beneficiari.length; i++) {
    const b = beneficiari[i];
    let fullName = (b.nome + " " + b.cognome).trim();
    if (b.cf) {
      fullName += " (" + b.cf + ")";
    }
    if (fullName && list.indexOf(fullName) === -1) {
      list.push(fullName);
    }
  }

  return list.sort();
}

/**
 * Ottiene la lista degli operatori registrati.
 */
function getOperatorsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WA_SHEET_OPERATORI);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const list = [];

  for (let i = 0; i < data.length; i++) {
    const nome = data[i][0] ? data[i][0].toString().trim() : "";
    const cognome = data[i][1] ? data[i][1].toString().trim() : "";
    if (nome || cognome) {
      const fullName = (nome + " " + cognome).trim();
      if (fullName && list.indexOf(fullName) === -1) {
        list.push(fullName);
      }
    }
  }

  return list.sort();
}

/**
 * Registra un nuovo beneficiario nel foglio "Beneficiari".
 * 
 * @param {Object} data Dati del beneficiario inviati dal frontend
 */
function submitBeneficiary(data) {
  try {
    return Beneficiario.add(data);
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Registra un nuovo incontro.
 * 
 * @param {Object} data Dati dell'incontro inviati dal frontend
 */
function submitMeeting(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const isOperatore = (data.tipoIncontro === "operatore");
    const sheetName = isOperatore ? WA_SHEET_INCONTRI_OPERATORE : WA_SHEET_INCONTRI_ASSISTENTE;

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Foglio '" + sheetName + "' non trovato nel documento.");
    }

    const lastRow = sheet.getLastRow();
    const newRowIdx = lastRow + 1;

    // Struttura colonne:
    // Estrae e pulisce il nome del beneficiario rimuovendo la parte del Codice Fiscale, se presente
    let beneficiarioNome = data.beneficiario.trim();
    // Esempio: "Mario Rossi (RSSMRA80A01F205H)" -> "Mario Rossi"
    const cfMatch = beneficiarioNome.match(/^(.*?)\s*\([A-Z0-9]{16}\)$/i);
    if (cfMatch) {
      beneficiarioNome = cfMatch[1].trim();
    }

    sheet.getRange(newRowIdx, 1).setValue(beneficiarioNome);
    sheet.getRange(newRowIdx, 2).setValue(data.operatore.trim());
    sheet.getRange(newRowIdx, 3).setValue(data.data);
    sheet.getRange(newRowIdx, 4).setValue(data.oraInizio);
    sheet.getRange(newRowIdx, 5).setValue(data.oraFine);
    sheet.getRange(newRowIdx, 6).setValue(data.attivita.trim());
    sheet.getRange(newRowIdx, 7).setValue(data.descrizione.trim());

    if (isOperatore) {
      // H (8): Richiede Segnalazione (Sì/No)
      sheet.getRange(newRowIdx, 8).setValue(data.segnalazione || "No");
      // I (9): Stato Elaborazione
      sheet.getRange(newRowIdx, 9).setValue("In attesa");
      // J (10): Errori Validazione
      sheet.getRange(newRowIdx, 10).setValue("");
    } else {
      // H (8): Stato Elaborazione
      sheet.getRange(newRowIdx, 8).setValue("In attesa");
      // I (9): Errori Validazione
      sheet.getRange(newRowIdx, 9).setValue("");
    }

    return { success: true, message: "Incontro registrato con successo in '" + sheetName + "'." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Esponi la funzione di decodifica del codice fiscale al client per la compilazione automatica.
 */
function decodeCF(cf) {
  try {
    const cfObj = new CodiceFiscale(cf);
    if (cfObj.isValid()) {
      let bDateStr = "";
      const d = cfObj.getDataNascita();
      if (d) {
        const month = ("0" + (d.getMonth() + 1)).slice(-2);
        const day = ("0" + d.getDate()).slice(-2);
        bDateStr = d.getFullYear() + "-" + month + "-" + day;
      }
      return {
        success: true,
        sesso: cfObj.getSesso(),
        dataNascita: bDateStr,
        luogoNascita: cfObj.getLuogoNascita()
      };
    }
  } catch (e) {
    Logger.log("Errore decodifica CF via Web App: " + e.message);
  }
  return { success: false };
}
