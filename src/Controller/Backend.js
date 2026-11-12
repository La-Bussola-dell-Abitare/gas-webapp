/**
 * @file Backend.js
 * @description Controller principale e interfaccia server-side (MVC) per la Web App "La Bussola dell'Abitare".
 * Gestisce l'entry point HTTP doGet, l'esposizione delle API RPC per google.script.run,
 * l'interfacciamento tra la UI e i Repository/Model, e la generazione dei documenti Google Docs.
 * @module Controller/Backend
 */

const WA_SHEET_BENEFICIARI = "Beneficiari";
const WA_SHEET_OPERATORI = "Operatori";
const WA_SHEET_INCONTRI_OPERATORE = "Incontri con operatore";
const WA_SHEET_INCONTRI_ASSISTENTE = "Incontri con assistente sociale";

/**
 * Gestisce la richiesta HTTP GET per servire la pagina web dell'applicazione.
 * Renderizza il template HTML "View/WebApp/Frontend" con configurazione viewport e x-frame.
 * 
 * @param {GoogleAppsScript.Events.AppsScriptEvent} e - Evento GET contenente parametri di query e contesto.
 * @return {GoogleAppsScript.HTML.HtmlOutput} L'output HTML per il rendering della Web App nel browser.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("View/WebApp/Frontend")
    .evaluate()
    .setTitle("Registrazione Sportello - La Bussola dell'Abitare")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Verifica l'esistenza di un foglio firme per l'operatore, il beneficiario e la data indicati.
 * 
 * @param {string|Operatore} operator - Nome o istanza dell'operatore.
 * @param {string|Beneficiario} client - Nome o istanza del beneficiario.
 * @param {Date|string} date - Data o mese di riferimento.
 * @param {GoogleAppsScript.Drive.Folder} [folder] - Cartella di destinazione su Google Drive.
 * @return {FoglioFirme|null} L'istanza del FoglioFirme se trovato, altrimenti null.
 */
function checkFoglioFirme(operator, client, date, folder) {
  return FoglioFirmeRepository.get(operator, client, date, folder);
}

/**
 * Crea un nuovo foglio firme individuale copiando il modello predefinito.
 * 
 * @param {string} operator - Nome dell'operatore assegnato.
 * @param {string} client - Nome del beneficiario associato.
 * @param {Date|string} date - Data o periodo del foglio firme.
 * @return {FoglioFirme} Il nuovo oggetto FoglioFirme creato su Google Drive/Docs.
 */
function createFoglioFirme(operator, client, date) {
  return FoglioFirmeRepository.create(operator, client, date);
}

/**
 * Aggiunge una riga di incontro all'interno del foglio firme.
 * Delega l'operazione al FoglioFirmeRepository.
 * 
 * @return {*} Risultato dell'operazione di inserimento riga.
 */
function appendRowToFoglioFirme() {
  return FoglioFirmeRepository.appendRow();
}


/**
 * Recupera i dati dal foglio "Operatori" e li trasforma in un array di oggetti JS.
 * @return {Operatore[]}
 */
function getOperatoriObjects() {
  return OperatoreRepository.getAll();
}

/**
 * Restituisce un oggetto operatore cercando per nome
 * @param {string} nome - Il nome dell'operatore (es. "Lorenzo")
 * @returns {Operatore|null} - L'oggetto operatore o null se non trovato
 */
function getOperatoreByName(nome) {
  return OperatoreRepository.getByName(nome);
}

/**
 * Recupera i beneficiari dal foglio e li trasforma in un array di oggetti JS piani (POJO).
 * @return {Record<string, any>[]}
 */
function getBeneficiariObjects() {
  try {
    return BeneficiarioRepository.getAll().map(b => {
      let formattedDate = "";
      if (b.dataNascita instanceof Date) {
        if (!isNaN(b.dataNascita.getTime())) {
          try {
            const tz = (typeof Session !== "undefined" && Session.getScriptTimeZone && Session.getScriptTimeZone()) || "Europe/Rome";
            formattedDate = Utilities.formatDate(b.dataNascita, tz, "yyyy-MM-dd");
          } catch (e) {
            const y = b.dataNascita.getFullYear();
            const m = String(b.dataNascita.getMonth() + 1).padStart(2, "0");
            const d = String(b.dataNascita.getDate()).padStart(2, "0");
            formattedDate = `${y}-${m}-${d}`;
          }
        }
      } else if (b.dataNascita) {
        const s = String(b.dataNascita).trim();
        formattedDate = s.includes("T") ? s.split("T")[0] : s;
      }

      let sesso = "M";
      try {
        if (b.cf && typeof CodiceFiscale !== "undefined" && typeof CodiceFiscale.isValid === "function" && CodiceFiscale.isValid(b.cf)) {
          sesso = CodiceFiscale.getSesso(b.cf);
        }
      } catch (cfErr) {
        sesso = "M";
      }

      return {
        name: b.name,
        surname: b.surname,
        nome: b.nome,
        cognome: b.cognome,
        cf: b.cf,
        dataNascita: formattedDate,
        luogoNascita: b.luogoNascita,
        email: b.email,
        phone: b.phone,
        telefono: b.telefono,
        cittadinanza: b.cittadinanza,
        residenza: b.residenza,
        domicilio: b.domicilio,
        statoLavorativo: b.statoLavorativo,
        titoloStudio: b.titoloStudio,
        assistenteSociale: b.assistenteSociale,
        rapportoIntestatario: b.rapportoIntestatario,
        statoCivile: b.statoCivile,
        annoArrivo: b.annoArrivo,
        idNucleo: b.idNucleo !== null && b.idNucleo !== undefined ? String(b.idNucleo).trim() : "",
        passaporto: b.documents?.passaporto || false,
        patente: b.documents?.patente || false,
        permessoSoggiorno: b.documents?.permessoSoggiorno || false,
        tesseraSanitaria: b.documents?.tesseraSanitaria || false,
        cartaIdentita: b.documents?.cartaIdentita || "Non posseduto",
        firma: b.firma || b.documents?.firma || "",
        idCartella: b.idCartella || "",
        sesso: sesso
      };
    });
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
    const result = BeneficiarioRepository.add(data);
    if (result && result.success && Array.isArray(data.documenti) && data.documenti.length > 0 && typeof DriveManager !== "undefined") {
      const targetCF = data.cf ? data.cf.toUpperCase().trim() : "";
      if (targetCF) {
        let savedCount = 0;
        let saveErrors = [];
        for (const docItem of data.documenti) {
          try {
            DriveManager.saveDocumentFile(targetCF, docItem, data.idNucleo);
            savedCount++;
          } catch (docSaveErr) {
            const msg = docSaveErr instanceof Error ? docSaveErr.message : String(docSaveErr);
            Logger.log("Errore salvataggio documento beneficiario: " + msg);
            saveErrors.push(msg);
          }
        }
        if (savedCount > 0) {
          result.message += ` (${savedCount} doc archiviati su Drive e censiti nel foglio Documenti)`;
        }
        if (saveErrors.length > 0) {
          result.message += ` [Avviso Drive: ${saveErrors.join("; ")}]`;
        }
      }
    }
    return result;
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
    return BeneficiarioRepository.removeByCF(cf);
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
    return IncontroRepository.getAll().map(m => {
      let formattedDate = "";
      if (m.data instanceof Date) {
        if (!isNaN(m.data.getTime())) {
          try {
            const tz = (typeof Session !== "undefined" && Session.getScriptTimeZone && Session.getScriptTimeZone()) || "Europe/Rome";
            formattedDate = Utilities.formatDate(m.data, tz, "yyyy-MM-dd");
          } catch (e) {
            const y = m.data.getFullYear();
            const mo = String(m.data.getMonth() + 1).padStart(2, "0");
            const d = String(m.data.getDate()).padStart(2, "0");
            formattedDate = `${y}-${mo}-${d}`;
          }
        }
      } else if (m.data !== null && m.data !== undefined) {
        const s = String(m.data).trim();
        formattedDate = s.includes("T") ? s.split("T")[0] : s;
      }

      return {
        beneficiario: m.beneficiario,
        operatore: m.operatore,
        data: formattedDate || (m.data ? String(m.data).trim() : ""),
        oraInizio: m.oraInizio,
        oraFine: m.oraFine,
        attivita: m.attivita,
        descrizione: m.descrizione,
        segnalazione: m.segnalazione,
        statoElaborazione: m.statoElaborazione,
        erroriValidazione: m.erroriValidazione,
        tipoIncontro: m.tipoIncontro
      };
    });
  } catch (err) {
    Logger.log("Errore getMeetingsList: " + (err instanceof Error ? err.message : String(err)));
    return [];
  }
}

/**
 * Recupera atomicamente tutti i dati iniziali per la Web App in una singola esecuzione server-side.
 * Elimina la concorrenza di 6 chiamate RPC parallele, azzera i conflitti di lock su SpreadsheetApp
 * e garantisce il caricamento fluido della dashboard.
 * 
 * @param {boolean} [forceRefresh=false] - Se true invalida la cache dei Named Ranges
 * @return {{
 *   success: boolean;
 *   lookups: Record<string, any>;
 *   operators: string[];
 *   meetings: Record<string, any>[];
 *   nuclei: Record<string, any>[];
 *   beneficiaries: Record<string, any>[];
 *   appointments: Record<string, any>[];
 * }}
 */
function getInitialAppData(forceRefresh) {
  try {
    const lookups = getFormLookups(forceRefresh);
    const operators = getOperatorsList();
    const meetings = getMeetingsList();
    const nuclei = getNucleiObjects();
    const beneficiaries = getBeneficiariObjects();
    const appointments = getAppointmentsList();
    const documenti = getDocumentiObjects();

    return {
      success: true,
      lookups: lookups || {},
      operators: operators || [],
      meetings: meetings || [],
      nuclei: nuclei || [],
      beneficiaries: beneficiaries || [],
      appointments: appointments || [],
      documenti: documenti || []
    };
  } catch (err) {
    Logger.log("Errore getInitialAppData: " + (err instanceof Error ? err.message : String(err)));
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      lookups: (typeof LookupRepository !== "undefined" && typeof LookupRepository.getDefaults === "function") ? LookupRepository.getDefaults() : {},
      operators: [],
      meetings: [],
      nuclei: [],
      beneficiaries: [],
      appointments: []
    };
  }
}

/**
 * Recupera l'elenco completo di tutti i nuclei familiari (come POJO).
 * @return {Record<string, any>[]}
 */
function getNucleiObjects() {
  try {
    return NucleoFamiliare.getAll().map(n => ({
      id: String(n.id || "").trim(),
      intestatario: String(n.intestatario || "").trim(),
      isee: n.isee,
      residenza: n.residenza,
      domicilio: n.domicilio,
      descrizioneCaso: n.descrizioneCaso,
      obiettiviProgettualita: n.obiettiviProgettualita,
      tipologiaRichiesta: n.tipologiaRichiesta,
      orientamentoFollowUp: n.orientamentoFollowUp,
      tipologiaAbitazione: n.tipologiaAbitazione,
      assistenteSociale: n.assistenteSociale,
      medicoDiBase: n.medicoDiBase,
      serviziDaAttivare: n.serviziDaAttivare || "",
      idCartella: String(n.idCartella || "").trim()
    }));
  } catch (err) {
    Logger.log("Errore getNucleiObjects: " + (err instanceof Error ? err.message : String(err)));
    return [];
  }
}

/**
 * Registra o modifica in modo atomico un Nucleo Familiare, gestendo sia la creazione contestuale
 * del nuovo intestatario tra i Beneficiari sia il collegamento a un beneficiario già registrato.
 * Protetto da LockService per prevenire race conditions e assegnazioni duplicate di ID.
 * 
 * @param {{
 *   isNuovoIntestatario: boolean;
 *   nucleo: Record<string, any>;
 *   intestatario?: Record<string, any>;
 * }} payload
 * @return {{ success: boolean; message: string; id: string }}
 */
function submitNucleoCompleto(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    return {
      success: false,
      message: "Il server è occupato con un'altra registrazione. Riprova tra pochi istanti.",
      id: ""
    };
  }

  try {
    const isNuovo = !!(payload && payload.isNuovoIntestatario);
    const nucData = (payload && payload.nucleo) || {};
    const intestData = (payload && payload.intestatario) || {};

    const isUpdate = !!(nucData.id && String(nucData.id).trim());
    const nucleoId = isUpdate ? String(nucData.id).trim() : NucleoFamiliare.generateNextId();

    if (isNuovo) {
      // 1. Validazione preventiva dati intestatario
      const cf = (intestData.cf || "").trim().toUpperCase();
      const nome = (intestData.nome || "").trim();
      const cognome = (intestData.cognome || "").trim();

      if (!cf) {
        throw new Error("Il Codice Fiscale dell'intestatario è obbligatorio.");
      }
      if (!nome || !cognome) {
        throw new Error("Nome e Cognome dell'intestatario sono obbligatori.");
      }

      // 2. Costruzione payload del beneficiario intestatario
      const benPayload = {
        cf: cf,
        nome: nome,
        cognome: cognome,
        dataNascita: intestData.dataNascita || "",
        luogoNascita: intestData.luogoNascita || "",
        sesso: intestData.sesso || "M",
        telefono: intestData.telefono || "",
        email: intestData.email || "",
        cittadinanza: intestData.cittadinanza || "Italia",
        residenza: nucData.residenza || intestData.residenza || "",
        domicilio: nucData.domicilio || intestData.domicilio || nucData.residenza || "",
        statoCivile: intestData.statoCivile || "",
        rapportoIntestatario: "Intestatario",
        annoArrivo: (intestData.annoArrivo && !isNaN(parseInt(intestData.annoArrivo, 10))) ? Math.trunc(parseInt(intestData.annoArrivo, 10)) : null,
        statoLavorativo: intestData.statoLavorativo || "",
        titoloStudio: intestData.titoloStudio || "",
        assistenteSociale: nucData.assistenteSociale || intestData.assistenteSociale || "No",
        idNucleo: nucleoId,
        isUpdate: false,
        documents: intestData.documents || {
          cartaIdentita: intestData.cartaIdentita || "Non posseduto",
          passaporto: !!intestData.passaporto,
          patente: !!intestData.patente,
          permessoSoggiorno: !!intestData.permessoSoggiorno,
          tesseraSanitaria: !!intestData.tesseraSanitaria
        }
      };

      // 3. Registrazione beneficiario nel foglio "Beneficiari"
      const benResult = BeneficiarioRepository.add(benPayload);
      if (!benResult.success) {
        throw new Error("Errore registrazione intestatario: " + benResult.message);
      }

      // 4. Salvataggio record nel foglio "Nuclei Familiari"
      nucData.id = nucleoId;
      nucData.intestatario = `${nome} ${cognome} (${cf})`;
      const nucResult = NucleoFamiliare.add(nucData);
      if (!nucResult.success) {
        throw new Error("Errore salvataggio nucleo: " + nucResult.message);
      }

      // 5. Archiviazione dei file documenti in Google Drive e registrazione nel foglio 'Documenti'
      let docExtraMsg = "";
      const docsToSave = payload.documenti || intestData.documenti || [];
      if (Array.isArray(docsToSave) && docsToSave.length > 0 && typeof DriveManager !== "undefined") {
        let savedCount = 0;
        let saveErrors = [];
        for (const docItem of docsToSave) {
          try {
            DriveManager.saveDocumentFile(cf, docItem, nucleoId);
            savedCount++;
          } catch (docSaveErr) {
            const msg = docSaveErr instanceof Error ? docSaveErr.message : String(docSaveErr);
            Logger.log("Errore salvataggio documento nucleo: " + msg);
            saveErrors.push(msg);
          }
        }
        if (savedCount > 0) {
          docExtraMsg += ` (${savedCount} doc archiviati su Drive e censiti nel foglio Documenti)`;
        }
        if (saveErrors.length > 0) {
          docExtraMsg += ` [Avviso Drive: ${saveErrors.join("; ")}]`;
        }
      }

      return {
        success: true,
        message: `Nucleo #${nucleoId} e intestatario ${nome} ${cognome} registrati con successo!${docExtraMsg}`,
        id: nucleoId
      };
    } else {
      // Caso intestatario esistente selezionato
      if (!nucData.intestatario) {
        throw new Error("Specificare o selezionare l'Intestatario del nucleo.");
      }

      nucData.id = nucleoId;
      const nucResult = NucleoFamiliare.add(nucData);
      if (!nucResult.success) {
        throw new Error("Errore salvataggio nucleo: " + nucResult.message);
      }

      // Estrae il codice fiscale dell'intestatario esistente
      const rawIntest = String(nucData.intestatario).trim();
      const cfMatch = rawIntest.match(/\b([A-Za-z0-9]{16})\b/);
      const targetCF = cfMatch ? cfMatch[1].toUpperCase() : (rawIntest.length === 16 ? rawIntest.toUpperCase() : "");

      // Archivia eventuali documenti caricati per il nucleo o l'intestatario
      let docExtraMsg = "";
      const docsToSave = payload.documenti || nucData.documenti || [];
      if (Array.isArray(docsToSave) && docsToSave.length > 0 && typeof DriveManager !== "undefined" && targetCF) {
        let savedCount = 0;
        let saveErrors = [];
        for (const docItem of docsToSave) {
          try {
            DriveManager.saveDocumentFile(targetCF, docItem, nucleoId);
            savedCount++;
          } catch (docSaveErr) {
            const msg = docSaveErr instanceof Error ? docSaveErr.message : String(docSaveErr);
            Logger.log("Errore salvataggio documento nucleo esistente: " + msg);
            saveErrors.push(msg);
          }
        }
        if (savedCount > 0) {
          docExtraMsg += ` (${savedCount} doc archiviati su Drive e censiti nel foglio Documenti)`;
        }
        if (saveErrors.length > 0) {
          docExtraMsg += ` [Avviso Drive: ${saveErrors.join("; ")}]`;
        }
      }

      // Associa idNucleo al beneficiario esistente
      try {
        const rawIntest = String(nucData.intestatario).trim();
        const cfMatch = rawIntest.match(/\b([A-Za-z0-9]{16})\b/);
        const targetCF = cfMatch ? cfMatch[1].toUpperCase() : (rawIntest.length === 16 ? rawIntest.toUpperCase() : "");

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const benSheet = ss ? (ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : "Beneficiari") || ss.getSheetByName("Beneficiari")) : null;
        if (benSheet) {
          const bData = benSheet.getDataRange().getValues();
          if (bData.length > 1) {
            const bHeaders = bData[0].map(h => h.toString().trim().toLowerCase());
            const bIdx = BeneficiarioRepository._getColIndexes(bHeaders);
            if (bIdx.idNucleo >= 0) {
              for (let r = 1; r < bData.length; r++) {
                const rowCF = bIdx.cf >= 0 ? safeString(bData[r][bIdx.cf]).toUpperCase() : "";
                const rowName = ((bIdx.nome >= 0 ? safeString(bData[r][bIdx.nome]) : "") + " " + (bIdx.cognome >= 0 ? safeString(bData[r][bIdx.cognome]) : "")).toLowerCase();
                const matchByCF = targetCF && rowCF === targetCF;
                const matchByName = rawIntest && rowName && rawIntest.toLowerCase().includes(rowName);

                if (matchByCF || matchByName) {
                  benSheet.getRange(r + 1, bIdx.idNucleo + 1).setValue(nucleoId);
                  if (bIdx.rapportoIntestatario >= 0) {
                    benSheet.getRange(r + 1, bIdx.rapportoIntestatario + 1).setValue("Intestatario");
                  }
                } else if (bIdx.idNucleo >= 0 && bIdx.rapportoIntestatario >= 0) {
                  // Se un altro beneficiario dello stesso nucleo era registrato come Intestatario, declassa a "Altro" per garantire unicità
                  const rowNucleo = safeString(bData[r][bIdx.idNucleo]).trim();
                  const rowRapp = safeString(bData[r][bIdx.rapportoIntestatario]).toLowerCase().trim();
                  if (rowNucleo === String(nucleoId).trim() && rowRapp === "intestatario") {
                    benSheet.getRange(r + 1, bIdx.rapportoIntestatario + 1).setValue("Altro");
                  }
                }
              }
            }
          }
        }
      } catch (linkErr) {
        Logger.log("Avviso aggiornamento idNucleo beneficiario esistente: " + linkErr.message);
      }

      return {
        success: true,
        message: (isUpdate ? `Nucleo #${nucleoId} aggiornato con successo!` : `Nucleo #${nucleoId} registrato con successo!`) + docExtraMsg,
        id: nucleoId
      };
    }
  } catch (error) {
    Logger.log("Errore submitNucleoCompleto: " + (error instanceof Error ? error.message : String(error)));
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      id: ""
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) { }
  }
}

/**
 * Registra o modifica un nucleo familiare (retrocompatibilità).
 * @param {Record<string, any>} data Dati del nucleo familiare da salvare
 * @return {{ success: boolean; message: string; id: string }}
 */
function submitNucleo(data) {
  return submitNucleoCompleto({ isNuovoIntestatario: false, nucleo: data });
}

/**
 * Recupera l'insieme dei valori ammessi e delle opzioni per i menu a tendina della Web App.
 * Interroga il LookupRepository con supporto ai Named Ranges, cache ed enums di dominio.
 * In caso di errore, delega al repository la restituzione dei valori di fallback (DRY).
 * 
 * @param {boolean} [forceRefresh=false] - Se true, invalida la cache e rilegge dal foglio.
 * @return {Record<string, string[]>} Dizionario contenente le liste di valori per ogni categoria.
 */
function getFormLookups(forceRefresh) {
  try {
    return LookupRepository.getAll(forceRefresh);
  } catch (err) {
    Logger.log("Errore getFormLookups: " + (err instanceof Error ? err.message : String(err)));
    return LookupRepository.getDefaults();
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
    const doc = SchedaSegnalazione.create(/** @type {any} */(data));
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
    } catch (err) { }

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
    } catch (err) { }

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

// =========================================================================
// API RPC PER GOOGLE DRIVE E ACQUISIZIONE FIRMA
// =========================================================================

/**
 * Recupera o crea la cartella Google Drive per il Nucleo Familiare specificato.
 * @param {string|number} nucleoId - ID del nucleo.
 * @param {string} [intestatarioNome=""] - Nome dell'intestatario per la cartella.
 * @return {{ success: boolean; data?: { id: string; url: string; name: string }; message?: string }}
 */
function getNucleoDriveFolder(nucleoId, intestatarioNome = "") {
  try {
    const info = DriveManager.getOrCreateNucleoFolder(nucleoId, intestatarioNome);
    return { success: true, data: info };
  } catch (err) {
    Logger.log("Errore getNucleoDriveFolder: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Recupera o crea la cartella Google Drive per il Beneficiario specificato (tramite CF).
 * @param {string} cf - Codice Fiscale del beneficiario.
 * @return {{ success: boolean; data?: { id: string; url: string; name: string }; message?: string }}
 */
function getBeneficiarioDriveFolder(cf) {
  try {
    const info = DriveManager.getOrCreateBeneficiarioFolder(cf);
    return { success: true, data: info };
  } catch (err) {
    Logger.log("Errore getBeneficiarioDriveFolder: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Salva la firma autografa del beneficiario nella sua sottocartella personale Drive.
 * @param {string} cf - Codice Fiscale del beneficiario firmatario.
 * @param {string} base64Data - Immagine in Base64 (PNG trasparente).
 * @return {{ success: boolean; fileId?: string; fileUrl?: string; message: string }}
 */
function saveBeneficiarySignature(cf, base64Data) {
  try {
    return DriveManager.saveBeneficiarySignature(cf, base64Data);
  } catch (err) {
    Logger.log("Errore saveBeneficiarySignature: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Esegue la scansione on-demand dei documenti nella cartella del beneficiario.
 * @param {string} cf - Codice Fiscale del beneficiario.
 * @return {{ success: boolean; data?: any; message?: string }}
 */
function scanBeneficiarioDocuments(cf) {
  try {
    const res = DriveManager.scanBeneficiarioDocuments(cf);
    return { success: true, data: res };
  } catch (err) {
    Logger.log("Errore scanBeneficiarioDocuments: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Esegue la scansione on-demand dei documenti nella cartella del nucleo familiare.
 * @param {string|number} nucleoId - ID del nucleo familiare.
 * @return {{ success: boolean; data?: any; message?: string }}
 */
function scanNucleoDocuments(nucleoId) {
  try {
    const res = DriveManager.scanNucleoDocuments(nucleoId);
    return { success: true, data: res };
  } catch (err) {
    Logger.log("Errore scanNucleoDocuments: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Recupera l'elenco dei documenti censiti nel foglio 'Documenti' come array di oggetti POJO.
 * Se viene specificato un codice fiscale, filtra i soli documenti di quell'intestatario.
 * @param {string} [cf] - Codice Fiscale dell'intestatario (opzionale).
 * @return {Record<string, any>[]}
 */
function getDocumentiObjects(cf) {
  try {
    if (typeof DocumentoRepository === "undefined") return [];
    const list = cf ? DocumentoRepository.getByCF(cf) : DocumentoRepository.getAll();
    return list.map(doc => doc.toObject());
  } catch (err) {
    Logger.log("Errore getDocumentiObjects: " + (err instanceof Error ? err.message : String(err)));
    return [];
  }
}

/**
 * Registra o aggiorna un documento nel foglio 'Documenti'.
 * @param {Record<string, any>} data - Dati del documento inviati dal frontend.
 * @return {{ success: boolean; message: string; data?: Record<string, any> }}
 */
function submitDocumento(data) {
  try {
    if (typeof DocumentoRepository === "undefined") {
      throw new Error("Modulo DocumentoRepository non disponibile.");
    }
    return DocumentoRepository.add(data);
  } catch (err) {
    Logger.log("Errore submitDocumento: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Rimuove un documento dal foglio 'Documenti' per ID.
 * @param {number|string} id - ID del documento da eliminare.
 * @return {{ success: boolean; message: string }}
 */
function removeDocumento(id) {
  try {
    if (typeof DocumentoRepository === "undefined") {
      throw new Error("Modulo DocumentoRepository non disponibile.");
    }
    return DocumentoRepository.removeById(id);
  } catch (err) {
    Logger.log("Errore removeDocumento: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Esegue l'audit diagnostico di conformità Drive e scadenze per un singolo nucleo familiare.
 * Supporta l'opzione deepAIScan per l'ispezione OCR multimodale con Google Gemini Flash.
 * @param {string|number} nucleoId - ID del nucleo da analizzare.
 * @param {Object} [options] - Opzioni di scansione (es. { deepAIScan: boolean, maxAIFiles: number }).
 * @return {Record<string, any>} Report con stato e lista anomalie.
 */
function auditNucleoDrive(nucleoId, options) {
  try {
    if (typeof DriveReconciler === "undefined") {
      throw new Error("Modulo DriveReconciler non disponibile.");
    }
    const report = DriveReconciler.auditNucleo(nucleoId, options);
    return { success: true, report: JSON.parse(JSON.stringify(report)) };
  } catch (err) {
    Logger.log("Errore auditNucleoDrive: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Esegue l'ispezione OCR/IA di un singolo file su Drive tramite Google Gemini Flash.
 * @param {string} fileId - ID del file Google Drive da ispezionare.
 * @return {Record<string, any>} Dati estratti dal documento.
 */
function inspectDriveFileWithAI(fileId) {
  try {
    if (typeof DriveReconciler === "undefined") {
      throw new Error("Modulo DriveReconciler non disponibile.");
    }
    return JSON.parse(JSON.stringify(DriveReconciler.inspectFileWithAI(fileId)));
  } catch (err) {
    Logger.log("Errore inspectDriveFileWithAI: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Esegue il piano di riconciliazione e bonifica approvato selettivamente dall'operatore.
 * @param {string|number} nucleoId - ID del nucleo familiare.
 * @param {Object} approvedPlan - Il piano delle azioni selezionate nel frontend.
 * @return {{ success: boolean; actionsApplied: string[]; errors: string[] }}
 */
function executeDriveReconciliation(nucleoId, approvedPlan) {
  try {
    if (typeof DriveReconciler === "undefined") {
      throw new Error("Modulo DriveReconciler non disponibile.");
    }
    return JSON.parse(JSON.stringify(DriveReconciler.executeApprovedPlan(nucleoId, approvedPlan)));
  } catch (err) {
    Logger.log("Errore executeDriveReconciliation: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, actionsApplied: [], errors: [err instanceof Error ? err.message : String(err)] };
  }
}

/**
 * Esegue la bonifica e riconciliazione delle cartelle e dei documenti di un nucleo.
 * Mantenuta per retrocompatibilità.
 * @param {string|number} nucleoId - ID del nucleo familiare.
 * @param {Object} [options] - Opzioni di riconciliazione.
 * @return {{ success: boolean; actionsApplied: string[]; errors: string[] }}
 */
function reconcileNucleoDrive(nucleoId, options) {
  try {
    if (typeof DriveReconciler === "undefined") {
      throw new Error("Modulo DriveReconciler non disponibile.");
    }
    return DriveReconciler.reconcileNucleo(nucleoId, options);
  } catch (err) {
    Logger.log("Errore reconcileNucleoDrive: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, actionsApplied: [], errors: [err instanceof Error ? err.message : String(err)] };
  }
}

/**
 * Esegue l'audit diagnostico dell'intero archivio Drive su tutti i nuclei censiti.
 * @return {Record<string, any>} Sintesi globale dell'archivio.
 */
function auditArchive() {
  try {
    if (typeof DriveReconciler === "undefined") {
      throw new Error("Modulo DriveReconciler non disponibile.");
    }
    return JSON.parse(JSON.stringify(DriveReconciler.auditArchive()));
  } catch (err) {
    Logger.log("Errore auditArchive: " + (err instanceof Error ? err.message : String(err)));
    return { totalNuclei: 0, healthyNuclei: 0, warningNuclei: 0, criticalNuclei: 0, reports: [] };
  }
}

/**
 * Analizza un documento caricato tramite Google Gemini (Vision & OCR)
 * estraendo automaticamente i dati anagrafici e i metadati documentali in formato JSON.
 * 
 * @param {string} base64Data - File codificato in Base64.
 * @param {string} [mimeType="application/pdf"] - Tipo MIME del file.
 * @param {string} [fileName="documento.pdf"] - Nome originario del file.
 * @return {Record<string, any>} Dati estratti conformi allo schema di dominio.
 */
function smartClassifyDocument(base64Data, mimeType, fileName) {
  try {
    if (typeof DocumentIntelligence === "undefined") {
      throw new Error("Modulo DocumentIntelligence non disponibile.");
    }
    return DocumentIntelligence.smartClassifyBase64(base64Data, mimeType, fileName);
  } catch (err) {
    Logger.log("Errore smartClassifyDocument: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Analizza una serie di documenti contemporaneamente tramite Google Gemini Flash (Multimodale),
 * consolidando in un unico flusso i dati anagrafici unificati e l'elenco dei documenti riconosciuti.
 * 
 * @param {Array<{ base64Data: string; mimeType?: string; fileName?: string }>} filesArray - Elenco dei file in Base64.
 * @return {Record<string, any>} Dati estratti consolidati.
 */
function smartClassifyDocuments(filesArray) {
  try {
    if (typeof DocumentIntelligence === "undefined") {
      throw new Error("Modulo DocumentIntelligence non disponibile.");
    }
    return DocumentIntelligence.smartClassifyMultipleBase64(filesArray);
  } catch (err) {
    Logger.log("Errore smartClassifyDocuments: " + (err instanceof Error ? err.message : String(err)));
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Restituisce lo stato di disponibilità del servizio Google Gemini.
 * @return {{ available: boolean; model: string }}
 */
function checkGeminiStatus() {
  try {
    const isAvail = (typeof DocumentIntelligence !== "undefined") && DocumentIntelligence.isAvailable();
    const model = (typeof CONFIG !== "undefined" && CONFIG.GEMINI && CONFIG.GEMINI.getModel)
      ? CONFIG.GEMINI.getModel()
      : ((typeof CONFIG !== "undefined" && CONFIG.GEMINI && CONFIG.GEMINI.MODEL) || "gemini-3.8-flash");
    return { available: isAvail, model: model };
  } catch (e) {
    return { available: false, model: "gemini-3.8-flash" };
  }
}

/**
 * Esegue un ping di benchmark diagnostico per la modalità di debug.
 * Restituisce timestamp del server, tempo di esecuzione, utente attivo e disponibilità dei servizi.
 * 
 * @return {{ success: boolean; serverTime: string; executionMs: number; userEmail: string; timeZone: string; geminiAvailable: boolean; geminiModel: string }}
 */
function pingBackend() {
  const startTime = Date.now();
  let userEmail = "";
  try {
    userEmail = Session.getActiveUser().getEmail();
  } catch (e) {
    userEmail = "anonimo / accesso ristretto";
  }
  const geminiStatus = checkGeminiStatus();
  return {
    success: true,
    serverTime: new Date().toISOString(),
    executionMs: Date.now() - startTime,
    userEmail: userEmail || "anonimo",
    timeZone: Session.getScriptTimeZone(),
    geminiAvailable: geminiStatus.available,
    geminiModel: geminiStatus.model
  };
}
