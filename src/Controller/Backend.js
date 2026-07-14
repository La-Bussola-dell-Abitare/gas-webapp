/**
 * WEB APP - CONTROLLER E INTERFACCIA SERVER-SIDE (MVC)
 */

const WA_SHEET_BENEFICIARI = "Beneficiari";
const WA_SHEET_OPERATORI = "Operatori";
const WA_SHEET_INCONTRI_OPERATORE = "Incontri con operatore";
const WA_SHEET_INCONTRI_ASSISTENTE = "Incontri con assistente sociale";

/**
 * Gestisce la richiesta HTTP GET per servire la pagina web.
 * @param {GoogleAppsScript.Events.AppsScriptEvent} e - Evento GET
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("View/WebApp/Frontend")
    .evaluate()
    .setTitle("Registrazione Sportello - La Bussola dell'Abitare")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Recupera i beneficiari dal foglio e li trasforma in un array di oggetti JS.
 * @return {Beneficiario[]}
 */
function getBeneficiariObjects() {
  try {
    return Beneficiario.getAll();
  } catch (e) {
    Logger.log("Errore getBeneficiariObjects: " + e.message);
    return [];
  }
}

/**
 * Ottiene la lista dei beneficiari registrati per l'autocompletamento.
 * Ritorna un array di stringhe "Nome Cognome (Codice Fiscale)" ordinate alfabeticamente.
 * @return {string[]}
 */
function getBeneficiariesList() {
  try {
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
  } catch (e) {
    return [];
  }
}

/**
 * Ottiene la lista degli operatori registrati.
 * @return {string[]} Lista ordinata dei nomi completi degli operatori.
 */
function getOperatorsList() {
  try {
    const list = OperatoreRepository.getAll().map(op => (op.name + " " + op.surname).trim());
    return [...new Set(list)].sort();
  } catch (e) {
    Logger.log("Errore nel recupero operatori: " + e.message);
    return [];
  }
}

/**
 * Registra o aggiorna un beneficiario nel foglio "Beneficiari".
 * @param {Record<string, any>} data Dati del beneficiario inviati dal frontend
 * @return {{ success: boolean; message: string }}
 */
function submitBeneficiary(data) {
  try {
    return Beneficiario.add(data);
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Rimuove un beneficiario cercando per codice fiscale.
 * @param {string} cf - Il codice fiscale del beneficiario
 * @return {{ success: boolean; message: string }}
 */
function removeBeneficiary(cf) {
  try {
    return Beneficiario.remove(cf);
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Registra un nuovo incontro.
 * @param {IncontroData} data Dati dell'incontro inviati dal frontend
 * @return {{ success: boolean; message: string }}
 */
function submitMeeting(data) {
  try {
    return IncontroRepository.add(data);
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Modifica un incontro esistente.
 * @param {Object} originalKey - Chiave identificativa originale dell'incontro
 * @param {IncontroData} data - Nuovi dati dell'incontro
 * @return {{ success: boolean; message: string }}
 */
function submitMeetingUpdate(originalKey, data) {
  try {
    return IncontroRepository.update(originalKey, data);
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Recupera l'elenco completo di tutti gli incontri da entrambi i fogli.
 * @return {Incontro[]}
 */
function getMeetingsList() {
  try {
    return IncontroRepository.getAll();
  } catch (e) {
    Logger.log("Errore getMeetingsList: " + e.message);
    return [];
  }
}

/**
 * Recupera l'elenco completo di tutti i nuclei familiari.
 * @return {NucleoFamiliare[]}
 */
function getNucleiObjects() {
  try {
    return NucleoFamiliare.getAll();
  } catch (e) {
    Logger.log("Errore getNucleiObjects: " + e.message);
    return [];
  }
}

/**
 * Registra o modifica un nucleo familiare.
 * @param {Record<string, any>} data Dati del nucleo familiare da salvare
 * @return {{ success: boolean; message: string; id: string }}
 */
function submitNucleo(data) {
  try {
    return NucleoFamiliare.add(data);
  } catch (error) {
    return { success: false, message: error.message, id: "" };
  }
}

/**
 * Genera il Foglio Firme individuale in Google Docs.
 * @param {string} operator - Nome dell'operatore
 * @param {string} client - Nome del beneficiario
 * @param {string} dateStr - Stringa data (es. "2026-07")
 * @return {{ success: boolean; url: string; name: string }}
 */
function generateFoglioFirmeDoc(operator, client, dateStr) {
  try {
    const d = dateStr ? new Date(dateStr + "-02") : new Date();
    const file = createFoglioFirme(operator, client, d);
    return { success: true, url: file.getUrl(), name: file.getName() };
  } catch (error) {
    return { success: false, url: "", name: error.message };
  }
}

/**
 * Genera la Scheda di Segnalazione in Google Docs.
 * @param {Record<string, any>} data - Dati della segnalazione
 * @return {{ success: boolean; url: string }}
 */
function generateSchedaSegnalazioneDoc(data) {
  try {
    const doc = SchedaSegnalazione.create(data);
    return { success: true, url: doc.getUrl() };
  } catch (error) {
    return { success: false, url: error.message };
  }
}

/**
 * Genera il Diario Giornaliero in Google Docs.
 * @param {string} dateStr - Data di riferimento (es. "2026-07-14")
 * @return {{ success: boolean; url: string; name: string }}
 */
function generateDiarioGiornalieroDoc(dateStr) {
  try {
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
    return { success: true, url: newFile.getUrl(), name: newFile.getName() };
  } catch (error) {
    return { success: false, url: "", name: error.message };
  }
}

/**
 * Registra un nuovo appuntamento.
 * @param {Record<string, any>} data Dati dell'appuntamento
 * @return {{ success: boolean; message: string }}
 */
function submitAppointment(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Appuntamenti");
    if (!sheet) {
      sheet = ss.insertSheet("Appuntamenti");
      sheet.appendRow(["Data", "Ora", "Beneficiario", "Operatore", "Note", "Data Creazione"]);
    }
    sheet.appendRow([
      data.data,
      data.ora,
      data.beneficiario,
      data.operatore,
      data.note || "",
      new Date()
    ]);
    return { success: true, message: "Appuntamento registrato con successo!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Ottiene la lista degli appuntamenti registrati.
 * @return {Array<Record<string, any>>}
 */
function getAppointmentsList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Appuntamenti");
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    const list = [];
    for (let i = 1; i < values.length; i++) {
      list.push({
        data: values[i][0] ? safeString(values[i][0]) : "",
        ora: values[i][1] ? safeString(values[i][1]) : "",
        beneficiario: values[i][2] ? safeString(values[i][2]) : "",
        operatore: values[i][3] ? safeString(values[i][3]) : "",
        note: values[i][4] ? safeString(values[i][4]) : ""
      });
    }
    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Aggiunge una riga al foglio "Monitoraggio Ufficiale".
 * @param {Record<string, any>} data Dati per il monitoraggio
 * @return {{ success: boolean; message: string }}
 */
function addRigaMonitoraggio(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Monitoraggio Ufficiale") || ss.getSheetByName("Monitoraggio");
    if (!sheet) {
      sheet = ss.insertSheet("Monitoraggio Ufficiale");
      sheet.appendRow([
        "Municipio", "Annualità QSFP Operatore", "Titolo Progetto", "Annualità", "CIG", "Tipologia",
        "Nome Operatore", "Tipo Operatore", "Qualifica", "Ruolo",
        "Nome Destinatario", "Codice Fiscale", "Sesso", "Cittadinanza", "Stato Lavorativo", "Titolo di Studio", "Età", "Data Inserimento"
      ]);
    }
    
    // Calcola dati operatore
    let opNome = data.operatore || "";
    let opQualifica = "";
    let opRuolo = "";
    let opTipo = "Interno";
    try {
      const op = OperatoreRepository.getAll().find(o => (o.name + " " + o.surname).toLowerCase() === opNome.toLowerCase());
      if (op) {
        opNome = (op.name + " " + op.surname);
        opQualifica = op.qualifica || "";
        opRuolo = op.ruolo || "";
      }
    } catch(e){}

    // Calcola dati destinatario
    let benNome = data.beneficiario || "";
    let benCF = "";
    let benSesso = "";
    let benCittadinanza = "";
    let benLavoro = "";
    let benStudio = "";
    let eta = "";

    const cfMatch = benNome.match(/\(([A-Z0-9]{16})\)/i);
    if (cfMatch) {
      benCF = cfMatch[1].toUpperCase();
      benNome = benNome.replace(/\s*\([A-Z0-9]{16}\)$/i, "").trim();
    }

    try {
      const ben = BeneficiarioRepository.getAll().find(b => b.cf === benCF || (b.nome + " " + b.cognome).toLowerCase() === benNome.toLowerCase());
      if (ben) {
        benNome = (ben.nome + " " + ben.cognome);
        benCF = ben.cf;
        benSesso = ben.taxCode ? CodiceFiscale.getSesso(ben.cf) : "";
        benCittadinanza = ben.cittadinanza || "";
        benLavoro = ben.statoLavorativo || "";
        benStudio = ben.titoloStudio || "";
        
        if (ben.cf) {
          const nascita = CodiceFiscale.getBirthdate(ben.cf);
          const oggi = new Date();
          let calced = oggi.getFullYear() - nascita.getFullYear();
          if (oggi.getMonth() < nascita.getMonth() || (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate())) {
            calced--;
          }
          eta = calced;
        }
      }
    } catch(e){}

    sheet.appendRow([
      "Municipio XI", 
      "2026",
      "La Bussola dell'Abitare",
      "Annualità 1",
      "CIG-12345",
      "Accoglienza",
      opNome, opTipo, opQualifica, opRuolo, 
      benNome, benCF, benSesso, benCittadinanza, benLavoro, benStudio, eta, 
      new Date() 
    ]);
    
    return { success: true, message: "Riga aggiunta al Monitoraggio Ufficiale con successo!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Esponi la funzione di decodifica del codice fiscale al client per la compilazione automatica.
 * @param {string} cf - Il codice fiscale da decodificare.
 * @return {{ success: boolean; sesso?: string; dataNascita?: string; luogoNascita?: string }}
 */
function decodeCF(cf) {
  try {
    const cfObj = new CodiceFiscale(cf);
    if (cfObj.isValid()) {
      let bDateStr = "";
      const d = cfObj.getBirthdate();
      if (d) {
        const month = ("0" + (d.getMonth() + 1)).slice(-2);
        const day = ("0" + d.getDate()).slice(-2);
        bDateStr = d.getFullYear() + "-" + month + "-" + day;
      }
      return {
        success: true,
        sesso: cfObj.getSesso(),
        dataNascita: bDateStr,
        luogoNascita: cfObj.getBirthplace()
      };
    }
  } catch (e) {
    Logger.log("Errore decodifica CF via Web App: " + e.message);
  }
  return { success: false };
}
