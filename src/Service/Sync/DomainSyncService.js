/**
 * @file DomainSyncService.js
 * @description Servizio per la sincronizzazione continua e l'allineamento tra i fogli di configurazione
 * nascosti (_Dati*), le ScriptProperties, la Cache di Apps Script e i Named Ranges del foglio di calcolo.
 * Realizza l'architettura a Doppio Canale garantendo zero chiamate a SpreadsheetApp a runtime per la WebApp.
 * @module Service/Sync/DomainSyncService
 */

class DomainSyncService {
  /**
   * Tassonomia ufficiale delle chiavi per ScriptProperties e CacheService.
   */
  static get KEYS() {
    return {
      BENEFICIARI: "DATI_BENEFICIARI",
      DOCUMENTI: "DATI_DOCUMENTI",
      SPORTELLI: "DATI_SPORTELLI",
      OPERATORI: "DATI_OPERATORI",
      ORARI: "DATI_ORARI",
      BUNDLE: "DATI_BUNDLE",
      LAST_SYNC: "DATI_LAST_SYNC"
    };
  }

  /**
   * Nomi dei fogli di sistema nascosti.
   */
  static get SHEETS() {
    return {
      BENEFICIARI: "_DatiBeneficiari",
      DOCUMENTI: "_DatiDocumenti",
      SPORTELLI: "_DatiSportelli",
      OPERATORI: "_DatiOperatori",
      ORARI: "_OrarioOperatori",
      DATI: "_Dati"
    };
  }

  /**
   * Durata di conservazione in CacheService (6 ore = 21600 secondi).
   */
  static get CACHE_TTL() {
    return 21600;
  }

  /**
   * Scrive un dato nel Two-Tier Storage: ScriptProperties (L2, permanente) e CacheService (L1, 6 ore).
   * @param {string} key - Nome della chiave (es. "DATI_BUNDLE").
   * @param {string} value - Valore serializzato in stringa JSON.
   */
  static saveTwoTier(key, value) {
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        PropertiesService.getScriptProperties().setProperty(key, value);
      }
    } catch (err) {
      Logger.log(`DomainSyncService.saveTwoTier - Errore Properties (${key}): ${err}`);
    }

    try {
      if (typeof CacheService !== "undefined" && CacheService.getScriptCache) {
        const cache = CacheService.getScriptCache();
        if (cache) {
          cache.put(key, value, DomainSyncService.CACHE_TTL);
        }
      }
    } catch (err) {
      Logger.log(`DomainSyncService.saveTwoTier - Errore Cache (${key}): ${err}`);
    }
  }

  /**
   * Legge un dato dal Two-Tier Storage (L1 Cache RAM -> L2 ScriptProperties).
   * @param {string} key
   * @return {string | null}
   */
  static getTwoTier(key) {
    // 1. Prova L1 (Cache)
    try {
      if (typeof CacheService !== "undefined" && CacheService.getScriptCache) {
        const cache = CacheService.getScriptCache();
        if (cache) {
          const cached = cache.get(key);
          if (cached) return cached;
        }
      }
    } catch (e) {}

    // 2. Prova L2 (Properties)
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        const prop = PropertiesService.getScriptProperties().getProperty(key);
        if (prop) {
          // Ripristina L1
          try {
            const cache = CacheService.getScriptCache();
            if (cache) cache.put(key, prop, DomainSyncService.CACHE_TTL);
          } catch (e) {}
          return prop;
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Sincronizza i dati anagrafici dal foglio `_DatiBeneficiari`.
   * Estrae le colonne: Criticità, Relazioni, Stato Civile, Abitazione, Status lavorativo.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
   * @return {Record<string, string[]>}
   */
  static syncBeneficiari(ss) {
    const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return DomainSyncService.getDefaultBeneficiariLookups();

    const sheet = spreadsheet.getSheetByName(DomainSyncService.SHEETS.BENEFICIARI);
    if (!sheet) return DomainSyncService.getDefaultBeneficiariLookups();

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return DomainSyncService.getDefaultBeneficiariLookups();

    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    
    // Mappa colonne flessibile
    const findCol = (terms) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (terms.some(t => h.includes(t.toLowerCase()))) return i;
      }
      return -1;
    };

    const idxCriticita = findCol(["criticit", "critic"]);
    const idxRelazioni = findCol(["relazion", "rapport", "parentel"]);
    const idxStatoCivile = findCol(["stato civile", "civile"]);
    const idxAbitazione = findCol(["abitazion", "alloggio", "casa"]);
    const idxStatoLavorativo = findCol(["status lavorativo", "stato lavorativo", "lavoro", "occupaz"]);

    const extractCol = (colIdx, fallback) => {
      if (colIdx < 0) return fallback;
      const list = [];
      for (let r = 1; r < data.length; r++) {
        const val = String(data[r][colIdx] || "").trim();
        if (val && !list.includes(val)) list.push(val);
      }
      return list.length > 0 ? list : fallback;
    };

    const defaults = DomainSyncService.getDefaultBeneficiariLookups();
    const result = {
      criticita: extractCol(idxCriticita, defaults.criticita),
      relazioni: extractCol(idxRelazioni, defaults.relazioni),
      statiCivili: extractCol(idxStatoCivile, defaults.statiCivili),
      abitazione: extractCol(idxAbitazione, defaults.abitazione),
      statiLavorativi: extractCol(idxStatoLavorativo, defaults.statiLavorativi)
    };

    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.BENEFICIARI, JSON.stringify(result));
    
    // Auto-dimensiona i Named Ranges associati
    if (idxCriticita >= 0) DomainSyncService.autoAdjustNamedRange(sheet, "Criticità", idxCriticita + 1);
    if (idxRelazioni >= 0) DomainSyncService.autoAdjustNamedRange(sheet, "Relazioni", idxRelazioni + 1);
    if (idxStatoCivile >= 0) DomainSyncService.autoAdjustNamedRange(sheet, "StatoCivile", idxStatoCivile + 1);
    if (idxAbitazione >= 0) DomainSyncService.autoAdjustNamedRange(sheet, "Abitazione", idxAbitazione + 1);
    if (idxStatoLavorativo >= 0) DomainSyncService.autoAdjustNamedRange(sheet, "StatoLavorativo", idxStatoLavorativo + 1);

    return result;
  }

  /**
   * Sincronizza il catalogo dei documenti dal foglio `_DatiDocumenti`.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
   * @return {Record<string, any>[]}
   */
  static syncDocumenti(ss) {
    const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return DomainSyncService.getDefaultDocumenti();

    const sheet = spreadsheet.getSheetByName(DomainSyncService.SHEETS.DOCUMENTI);
    if (!sheet) return DomainSyncService.getDefaultDocumenti();

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return DomainSyncService.getDefaultDocumenti();

    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    const findCol = (terms) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (terms.some(t => h.includes(t.toLowerCase()))) return i;
      }
      return -1;
    };

    const idxId = findCol(["id", "codice"]);
    const idxNome = findCol(["nome", "tipo", "descrizione"]);
    const idxCategoria = findCol(["categoria"]);
    const idxArchetipo = findCol(["archetipo"]);
    const idxValore = findCol(["valore", "ha valore"]);
    const idxScadenza = findCol(["scadenza", "ha scadenza"]);
    const idxScope = findCol(["scope", "ambito"]);
    const idxNote = findCol(["note", "dettagli"]);

    const docs = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const nome = idxNome >= 0 ? String(row[idxNome] || "").trim() : "";
      if (!nome) continue;

      const id = idxId >= 0 && row[idxId] ? String(row[idxId]).trim() : nome.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const categoria = idxCategoria >= 0 ? String(row[idxCategoria] || "Altro").trim() : "Altro";
      const archetipo = idxArchetipo >= 0 ? String(row[idxArchetipo] || "UNICO").trim() : "UNICO";
      const hasValue = idxValore >= 0 ? (row[idxValore] === true || String(row[idxValore]).toLowerCase() === "true" || String(row[idxValore]).toLowerCase() === "sì") : false;
      const hasExpiration = idxScadenza >= 0 ? (row[idxScadenza] === true || String(row[idxScadenza]).toLowerCase() === "true" || String(row[idxScadenza]).toLowerCase() === "sì") : false;
      const scope = idxScope >= 0 ? String(row[idxScope] || "persona").trim().toLowerCase() : "persona";
      const note = idxNote >= 0 ? String(row[idxNote] || "").trim() : "";

      docs.push({
        id,
        name: nome,
        categoria,
        archetipo,
        hasValue,
        hasExpiration,
        scope,
        note
      });
    }

    const finalDocs = docs.length > 0 ? docs : DomainSyncService.getDefaultDocumenti();
    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.DOCUMENTI, JSON.stringify(finalDocs));

    // Auto-dimensiona il Named Range TipiDocumenti sulla colonna dei nomi
    if (idxNome >= 0) {
      DomainSyncService.autoAdjustNamedRange(sheet, "TipiDocumenti", idxNome + 1);
    }

    return finalDocs;
  }

  /**
   * Sincronizza i servizi dal foglio `_DatiSportelli`.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
   * @return {{ servizi: string[] }}
   */
  static syncSportelli(ss) {
    const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return { servizi: DomainSyncService.getDefaultServizi() };

    const sheet = spreadsheet.getSheetByName(DomainSyncService.SHEETS.SPORTELLI);
    if (!sheet) return { servizi: DomainSyncService.getDefaultServizi() };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { servizi: DomainSyncService.getDefaultServizi() };

    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    let idxServizi = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].includes("serviz")) {
        idxServizi = i;
        break;
      }
    }
    if (idxServizi < 0) idxServizi = 0;

    const list = [];
    for (let r = 1; r < data.length; r++) {
      const val = String(data[r][idxServizi] || "").trim();
      if (val && !list.includes(val)) list.push(val);
    }

    const servizi = list.length > 0 ? list : DomainSyncService.getDefaultServizi();
    const result = { servizi };
    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.SPORTELLI, JSON.stringify(result));

    DomainSyncService.autoAdjustNamedRange(sheet, "Sportello_Servizi", idxServizi + 1);
    return result;
  }

  /**
   * Sincronizza gli operatori dal foglio `_DatiOperatori`.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
   * @return {Record<string, any>[]}
   */
  static syncOperatori(ss) {
    const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return [];

    const sheet = spreadsheet.getSheetByName(DomainSyncService.SHEETS.OPERATORI);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    const findCol = (terms) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (terms.some(t => h.includes(t.toLowerCase()))) return i;
      }
      return -1;
    };

    const idxNome = findCol(["nome"]);
    const idxCognome = findCol(["cognome"]);
    const idxCf = findCol(["codice fiscale", "cf"]);
    const idxDataNascita = findCol(["data di nascita", "data nascita"]);
    const idxLuogoNascita = findCol(["luogo di nascita", "luogo nascita"]);
    const idxRuolo = findCol(["ruolo", "qualifica"]);
    const idxOperatore = findCol(["operatore"]);
    const idxFirma = findCol(["firma"]);
    const idxEmail = findCol(["email", "mail"]);
    const idxStato = findCol(["stato", "attivo"]);
    const idxOre = findCol(["ore", "ore settimanali"]);

    const list = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const nome = idxNome >= 0 ? String(row[idxNome] || "").trim() : "";
      const cognome = idxCognome >= 0 ? String(row[idxCognome] || "").trim() : "";
      if (!nome && !cognome) continue;

      list.push({
        nome,
        cognome,
        cf: idxCf >= 0 ? String(row[idxCf] || "").trim() : "",
        dataNascita: idxDataNascita >= 0 && row[idxDataNascita] ? row[idxDataNascita] : "",
        luogoNascita: idxLuogoNascita >= 0 ? String(row[idxLuogoNascita] || "").trim() : "",
        ruolo: idxRuolo >= 0 ? String(row[idxRuolo] || "").trim() : "",
        operatore: idxOperatore >= 0 ? String(row[idxOperatore] || `${nome} ${cognome}`).trim() : `${nome} ${cognome}`,
        firma: idxFirma >= 0 ? String(row[idxFirma] || "").trim() : "",
        email: idxEmail >= 0 ? String(row[idxEmail] || "").trim() : "",
        stato: idxStato >= 0 ? String(row[idxStato] || "Attivo").trim() : "Attivo",
        oreSettimanali: idxOre >= 0 && row[idxOre] ? Number(row[idxOre]) : 0
      });
    }

    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.OPERATORI, JSON.stringify(list));

    if (idxOperatore >= 0) {
      DomainSyncService.autoAdjustNamedRange(sheet, "Operatori", idxOperatore + 1);
    }

    return list;
  }

  /**
   * Sincronizza gli orari di lavoro dal foglio `_OrarioOperatori`.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
   * @return {Record<string, any>[]}
   */
  static syncOrari(ss) {
    const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return [];

    const sheet = spreadsheet.getSheetByName(DomainSyncService.SHEETS.ORARI);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    const findCol = (terms) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (terms.some(t => h.includes(t.toLowerCase()))) return i;
      }
      return -1;
    };

    const idxOp = findCol(["operatore"]);
    const idxGiorno = findCol(["giorno"]);
    const idxMStart = findCol(["inizio mattina", "ora inizio mattina"]);
    const idxMEnd = findCol(["fine mattina", "ora fine mattina"]);
    const idxPStart = findCol(["inizio pom", "ora inizio pomeriggio"]);
    const idxPEnd = findCol(["fine pom", "ora fine pomeriggio"]);
    const idxTipo = findCol(["tipo"]);

    const list = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const op = idxOp >= 0 ? String(row[idxOp] || "").trim() : "";
      if (!op) continue;

      list.push({
        operatore: op,
        giorno: idxGiorno >= 0 ? String(row[idxGiorno] || "").trim() : "",
        mattinaInizio: idxMStart >= 0 ? String(row[idxMStart] || "").trim() : "",
        mattinaFine: idxMEnd >= 0 ? String(row[idxMEnd] || "").trim() : "",
        pomInizio: idxPStart >= 0 ? String(row[idxPStart] || "").trim() : "",
        pomFine: idxPEnd >= 0 ? String(row[idxPEnd] || "").trim() : "",
        tipo: idxTipo >= 0 ? String(row[idxTipo] || "Front").trim() : "Front"
      });
    }

    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.ORARI, JSON.stringify(list));
    return list;
  }

  /**
   * Genera e memorizza il bundle unificato `DATI_BUNDLE` per il bootstrap rapido della WebApp.
   * @param {Record<string, string[]>} beneficiariData
   * @param {Record<string, any>[]} documentiData
   * @param {{ servizi: string[] }} sportelliData
   * @return {Record<string, any>}
   */
  static syncBundle(beneficiariData, documentiData, sportelliData) {
    const ben = beneficiariData || DomainSyncService.getDefaultBeneficiariLookups();
    const doc = documentiData || DomainSyncService.getDefaultDocumenti();
    const spo = sportelliData || { servizi: DomainSyncService.getDefaultServizi() };

    const bundle = {
      abitazione: ben.abitazione || [],
      servizi: spo.servizi || [],
      criticita: ben.criticita || [],
      relazioni: ben.relazioni || [],
      statiCivili: ben.statiCivili || [],
      statiLavorativi: ben.statiLavorativi || [],
      tipiDocumenti: doc.map(d => typeof d === "string" ? d : d.name).filter(Boolean)
    };

    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.BUNDLE, JSON.stringify(bundle));
    DomainSyncService.saveTwoTier(DomainSyncService.KEYS.LAST_SYNC, new Date().toISOString());

    return bundle;
  }

  /**
   * Sincronizzazione omnicomprensiva di tutti i fogli _Dati*.
   * Inizializza tutte le ScriptProperties e la cache RAM.
   * @return {Record<string, any>} Il bundle generato per la WebApp.
   */
  static syncAllLookupsToProperties() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const ben = DomainSyncService.syncBeneficiari(ss);
      const doc = DomainSyncService.syncDocumenti(ss);
      const spo = DomainSyncService.syncSportelli(ss);
      DomainSyncService.syncOperatori(ss);
      DomainSyncService.syncOrari(ss);

      return DomainSyncService.syncBundle(ben, doc, spo);
    } catch (err) {
      Logger.log("DomainSyncService.syncAllLookupsToProperties - Errore: " + err);
      return DomainSyncService.getDefaultBundle();
    }
  }

  /**
   * Auto-dimensiona un Named Range sul foglio di calcolo per contenere esattamente
   * le righe con dati non vuoti, garantendo dropdown perfetti senza righe bianche.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Foglio Google su cui agire.
   * @param {string} rangeName - Nome dell'intervallo denominato (es. "Abitazione", "TipiDocumenti").
   * @param {number} colIndex - Indice colonna 1-based (es. 1 per colonna A).
   */
  static autoAdjustNamedRange(sheet, rangeName, colIndex) {
    try {
      if (!sheet) return;
      const ss = sheet.getParent();
      if (!ss) return;

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return; // Solo riga di intestazione o foglio vuoto

      // Trova l'ultima riga effettivamente non vuota per la colonna specificata
      const values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
      let effectiveLastRow = 1;
      for (let r = values.length - 1; r >= 0; r--) {
        if (values[r][0] !== "" && values[r][0] !== null && values[r][0] !== undefined) {
          effectiveLastRow = r + 2;
          break;
        }
      }

      if (effectiveLastRow >= 2) {
        const numRows = effectiveLastRow - 1;
        const newRange = sheet.getRange(2, colIndex, numRows, 1);
        ss.setNamedRange(rangeName, newRange);
      }
    } catch (err) {
      Logger.log(`DomainSyncService.autoAdjustNamedRange - Errore intervallo '${rangeName}': ${err}`);
    }
  }

  /**
   * Handler per l'evento onEdit(e) del foglio di calcolo.
   * Esegue la sincronizzazione automatica quando viene modificato uno dei fogli nascosti.
   * @param {GoogleAppsScript.Events.SheetsOnEdit} e
   */
  static handleEdit(e) {
    if (!e || !e.range) return;

    try {
      const sheet = e.range.getSheet();
      if (!sheet) return;

      const sheetName = sheet.getName();
      const ss = sheet.getParent();

      if (sheetName === DomainSyncService.SHEETS.BENEFICIARI) {
        const ben = DomainSyncService.syncBeneficiari(ss);
        DomainSyncService._updateBundleFromStored(ss, { beneficiari: ben });
      } else if (sheetName === DomainSyncService.SHEETS.DOCUMENTI) {
        const doc = DomainSyncService.syncDocumenti(ss);
        DomainSyncService._updateBundleFromStored(ss, { documenti: doc });
      } else if (sheetName === DomainSyncService.SHEETS.SPORTELLI) {
        const spo = DomainSyncService.syncSportelli(ss);
        DomainSyncService._updateBundleFromStored(ss, { sportelli: spo });
      } else if (sheetName === DomainSyncService.SHEETS.OPERATORI) {
        DomainSyncService.syncOperatori(ss);
      } else if (sheetName === DomainSyncService.SHEETS.ORARI) {
        DomainSyncService.syncOrari(ss);
      }
    } catch (err) {
      Logger.log("DomainSyncService.handleEdit - Errore: " + err);
    }
  }

  /**
   * Aggiorna il bundle recuperando i pezzi memorizzati mancanti.
   * @private
   */
  static _updateBundleFromStored(ss, overrides) {
    let ben = overrides && overrides.beneficiari;
    if (!ben) {
      const stored = DomainSyncService.getTwoTier(DomainSyncService.KEYS.BENEFICIARI);
      ben = stored ? JSON.parse(stored) : DomainSyncService.syncBeneficiari(ss);
    }

    let doc = overrides && overrides.documenti;
    if (!doc) {
      const stored = DomainSyncService.getTwoTier(DomainSyncService.KEYS.DOCUMENTI);
      doc = stored ? JSON.parse(stored) : DomainSyncService.syncDocumenti(ss);
    }

    let spo = overrides && overrides.sportelli;
    if (!spo) {
      const stored = DomainSyncService.getTwoTier(DomainSyncService.KEYS.SPORTELLI);
      spo = stored ? JSON.parse(stored) : DomainSyncService.syncSportelli(ss);
    }

    DomainSyncService.syncBundle(ben, doc, spo);
  }

  // =========================================================================
  // VALORI DI DEFAULT / FALLBACK (Single Source of Truth)
  // =========================================================================

  static getDefaultBeneficiariLookups() {
    return {
      abitazione: [
        "Proprietà", "Affitto privato", "ERP (Edilizia Residenziale Pubblica)",
        "Ospite da parenti/amici", "Comunità/Struttura", "Senza fissa dimora", "Occupazione", "Altro"
      ],
      relazioni: [
        "Intestatario", "Coniuge", "Figlio/a", "Genitore", "Fratello/Sorella",
        "Nipote", "Altro parente", "Convivente", "Non parente"
      ],
      statiCivili: [
        "Celibe/Nubile", "Coniugato/a", "Separato/a legalmente", "Divorziato/a",
        "Vedovo/a", "Unione civile", "Convivente di fatto"
      ],
      criticita: [
        "Nessuna", "Sfratto esecutivo", "Morosità incolpevole", "Disoccupazione prolungata",
        "Problemi sanitari gravi", "Disabilità certificata", "Sovraindebitamento",
        "Isolamento sociale", "Violenza domestica", "Altro"
      ],
      statiLavorativi: [
        "Occupato a tempo indeterminato", "Occupato a tempo determinato", "Lavoro autonomo / P.IVA",
        "Lavoro intermittente / a chiamata", "Lavoro saltuario / non contrattualizzato",
        "Inoccupato (in cerca di prima occupazione)", "Disoccupato", "Cassintegrato / In mobilità",
        "Pensionato", "Inabile al lavoro / Invalidità", "Studente", "Casalingo/a"
      ]
    };
  }

  static getDefaultServizi() {
    return [
      "Sportello Sociale",
      "Segretariato Sociale",
      "Sostegno Abitativo",
      "Orientamento Lavorativo",
      "Mediazione Linguistica e Culturale",
      "Supporto Legale",
      "Consulenza Fiscale e ISEE",
      "Distribuzione Beni di Prima Necessità"
    ];
  }

  static getDefaultDocumenti() {
    if (typeof Documents !== "undefined" && Array.isArray(Documents)) {
      return Documents.map(d => ({
        id: d.id,
        name: d.name,
        categoria: d.categoria,
        archetipo: d.archetipo,
        hasValue: !!d.hasValue,
        hasExpiration: !!d.hasExpiration,
        scope: d.scope || "persona",
        note: d.description || ""
      }));
    }
    return [
      { id: "CARTA_IDENTITA", name: "Carta d'Identità", categoria: "Anagrafica", archetipo: "SCADENZA", hasValue: false, hasExpiration: true, scope: "persona", note: "" },
      { id: "PERMESSO_SOGGIORNO", name: "Permesso di Soggiorno", categoria: "Soggiorno", archetipo: "SCADENZA", hasValue: false, hasExpiration: true, scope: "persona", note: "" },
      { id: "CODICE_FISCALE", name: "Codice Fiscale", categoria: "Anagrafica", archetipo: "UNICO", hasValue: false, hasExpiration: false, scope: "persona", note: "" },
      { id: "ISEE", name: "Attestazione ISEE", categoria: "Economica", archetipo: "ANNUALE", hasValue: true, hasExpiration: true, scope: "nucleo", note: "" }
    ];
  }

  static getDefaultBundle() {
    const ben = DomainSyncService.getDefaultBeneficiariLookups();
    const doc = DomainSyncService.getDefaultDocumenti();
    const spo = { servizi: DomainSyncService.getDefaultServizi() };
    return {
      abitazione: ben.abitazione,
      servizi: spo.servizi,
      criticita: ben.criticita,
      relazioni: ben.relazioni,
      statiCivili: ben.statiCivili,
      statiLavorativi: ben.statiLavorativi,
      tipiDocumenti: doc.map(d => d.name)
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DomainSyncService };
}
