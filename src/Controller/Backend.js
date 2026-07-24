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
 * Recupera i beneficiari dal foglio e li trasforma in un array di oggetti JS piani (POJO).
 * @return {Record<string, any>[]}
 */
function getBeneficiariObjects() {
  try {
    return Beneficiario.getAll().map(b => ({
      name: b.name,
      surname: b.surname,
      cf: b.cf,
      dataNascita: b.dataNascita,
      luogoNascita: b.luogoNascita,
      email: b.email,
      phone: b.phone,
      telefono: b.telefono,
      cittadinanza: b.cittadinanza,
      residenza: b.residenza,
      domicilio: b.domicilio,
      statoLavorativo: b.statoLavorativo,
      titoloStudio: b.titoloStudio,
      inCaricoServizi: b.inCaricoServizi,
      rapportoIntestatario: b.rapportoIntestatario,
      statoCivile: b.statoCivile,
      annoArrivo: b.annoArrivo,
      idNucleo: b.idNucleo,
      passaporto: b.documents?.passaporto || false,
      patente: b.documents?.patente || false,
      permessoSoggiorno: b.documents?.permessoSoggiorno || false,
      tesseraSanitaria: b.documents?.tesseraSanitaria || false,
      cartaIdentita: b.documents?.cartaIdentita || "Non posseduto"
    }));
  } catch (err) {
    Logger.log("Errore getBeneficiariObjects: " + (err instanceof Error ? err.message : String(err)));
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
      let fullName = (b.name + " " + b.surname).trim();
      if (b.cf) {
        fullName += " (" + b.cf + ")";
      }
      if (fullName && list.indexOf(fullName) === -1) {
        list.push(fullName);
      }
    }
    return list.sort();
  } catch (err) {
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
  } catch (err) {
    Logger.log("Errore nel recupero operatori: " + (err instanceof Error ? err.message : String(err)));
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
    return { success: false, message: error instanceof Error ? error.message : String(error) };
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
    return { success: false, message: error instanceof Error ? error.message : String(error) };
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
    return { success: false, message: error instanceof Error ? error.message : String(error) };
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
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Recupera l'elenco completo di tutti gli incontri da entrambi i fogli (come POJO).
 * @return {Record<string, any>[]}
 */
function getMeetingsList() {
  try {
    return IncontroRepository.getAll().map(m => ({
      beneficiario: m.beneficiario,
      operatore: m.operatore,
      data: m.data,
      oraInizio: m.oraInizio,
      oraFine: m.oraFine,
      attivita: m.attivita,
      descrizione: m.descrizione,
      segnalazione: m.segnalazione,
      statoElaborazione: m.statoElaborazione,
      erroriValidazione: m.erroriValidazione,
      tipoIncontro: m.tipoIncontro
    }));
  } catch (err) {
    Logger.log("Errore getMeetingsList: " + (err instanceof Error ? err.message : String(err)));
    return [];
  }
}

/**
 * Recupera l'elenco completo di tutti i nuclei familiari (come POJO).
 * @return {Record<string, any>[]}
 */
function getNucleiObjects() {
  try {
    return NucleoFamiliare.getAll().map(n => ({
      id: n.id,
      intestatario: n.intestatario,
      isee: n.isee,
      residenza: n.residenza,
      domicilio: n.domicilio,
      descrizioneCaso: n.descrizioneCaso,
      obiettiviProgettualita: n.obiettiviProgettualita,
      tipologiaRichiesta: n.tipologiaRichiesta,
      orientamentoFollowUp: n.orientamentoFollowUp,
      tipologiaAbitazione: n.tipologiaAbitazione,
      assistenteSociale: n.assistenteSociale,
      medicoDiBase: n.medicoDiBase
    }));
  } catch (err) {
    Logger.log("Errore getNucleiObjects: " + (err instanceof Error ? err.message : String(err)));
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
    return { success: false, message: error instanceof Error ? error.message : String(error), id: "" };
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
    const doc = FoglioFirmeRepository.create(operator, client, d);
    return { success: true, url: doc.url, name: doc.name };
  } catch (error) {
    return { success: false, url: "", name: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Genera la Scheda di Segnalazione in Google Docs.
 * @param {Record<string, any>} data - Dati della segnalazione
 * @return {{ success: boolean; url: string }}
 */
function generateSchedaSegnalazioneDoc(data) {
  try {
    const doc = SchedaSegnalazione.create(/** @type {any} */ (data));
    return { success: true, url: doc.getUrl() };
  } catch (error) {
    return { success: false, url: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Genera il Diario Giornaliero in Google Docs.
 * @param {string} dateStr - Data di riferimento (es. "2026-07-14")
 * @return {{ success: boolean; url: string; name: string }}
 */
function generateDiarioGiornalieroDoc(dateStr) {
  try {
    const doc = DiarioGiornalieroRepository.create(dateStr);
    return { success: true, url: doc.url, name: doc.name };
  } catch (error) {
    return { success: false, url: "", name: error instanceof Error ? error.message : String(error) };
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
    return { success: false, message: error instanceof Error ? error.message : String(error) };
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
  } catch (err) {
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
    } catch(err){}

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
          eta = String(calced);
        }
      }
    } catch(err){}

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
    return { success: false, message: error instanceof Error ? error.message : String(error) };
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
  } catch (err) {
    Logger.log("Errore decodifica CF via Web App: " + (err instanceof Error ? err.message : String(err)));
  }
  return { success: false };
}
