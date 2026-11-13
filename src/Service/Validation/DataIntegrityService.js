/**
 * @file DataIntegrityService.js
 * @description Servizio per l'audit di consistenza relazionale e l'Auto-Healing dei dati di Google Sheets.
 * Esegue controlli avanzati su unicità caponucleo, beneficiari orfani, integrità cartelle Google Drive,
 * collisioni di cartelle personali e conflitti di conformità del Codice Fiscale.
 * @module Service/Validation/DataIntegrityService
 */

class DataIntegrityService {
  /**
   * Esegue la scansione completa di integrità relazionale tra Beneficiari, Nuclei e Google Drive.
   * 
   * @param {Object} [options]
   * @param {any[][]} [options.beneficiariData] - Matrice dati Beneficiari (per testing offline o override).
   * @param {any[][]} [options.nucleiData] - Matrice dati Nuclei (per testing offline o override).
   * @param {boolean} [options.skipDriveCheck=false] - Se true, salta la verifica fisica su DriveApp.
   * @return {{
   *   success: boolean;
   *   timestamp: string;
   *   totalChecked: number;
   *   totalIssues: number;
   *   issues: Array<{
   *     id: string;
   *     type: "DUPLICATE_INTESTATARI" | "ORPHAN_BENEFICIARY" | "MISSING_FOLDER" | "DUPLICATE_FOLDER" | "ANAGRAFICA_CONFLICT";
   *     severity: "ERROR" | "WARNING" | "INFO";
   *     title: string;
   *     description: string;
   *     suggestedFix: string;
   *     autoHealable: boolean;
   *     data: Record<string, any>;
   *   }>;
   *   summary: Record<string, number>;
   * }}
   */
  static auditBeneficiari(options = {}) {
    const issues = [];
    const summary = {
      duplicateIntestatari: 0,
      orphanBeneficiaries: 0,
      missingFolders: 0,
      duplicateFolders: 0,
      anagraficaConflicts: 0
    };

    // 1. Estrazione dati Beneficiari
    let benRows = [];
    let benHeaders = [];
    let benIdx = {};

    if (options.beneficiariData && options.beneficiariData.length > 0) {
      benHeaders = options.beneficiariData[0].map(h => (h || "").toString().trim().toLowerCase());
      benIdx = DataIntegrityService._getBenColIndexes(benHeaders);
      benRows = options.beneficiariData.slice(1);
    } else {
      const ss = typeof SpreadsheetApp !== "undefined" ? SpreadsheetApp.getActiveSpreadsheet() : null;
      if (ss) {
        let sheet = ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : 'Beneficiari')
          || ss.getSheetByName('Beneficiari') || ss.getSheetByName('Beneficiario');
        if (sheet) {
          const vals = sheet.getDataRange().getValues();
          if (vals.length > 1) {
            benHeaders = vals[0].map(h => (h || "").toString().trim().toLowerCase());
            benIdx = DataIntegrityService._getBenColIndexes(benHeaders);
            benRows = vals.slice(1);
          }
        }
      }
    }

    // 2. Estrazione dati Nuclei
    const validNucleiIds = new Set();
    const nucleiMap = new Map();

    if (options.nucleiData && options.nucleiData.length > 0) {
      const nucHeaders = options.nucleiData[0].map(h => (h || "").toString().trim().toLowerCase());
      const nucIdxId = typeof findHeaderIndex === "function" ? findHeaderIndex(nucHeaders, ["id", "id nucleo", "nucleo id"]) : nucHeaders.indexOf("id");
      const nucIdxIntestatario = typeof findHeaderIndex === "function" ? findHeaderIndex(nucHeaders, ["intestatario", "nome"]) : nucHeaders.indexOf("intestatario");
      const nucIdxCartella = typeof findHeaderIndex === "function" ? findHeaderIndex(nucHeaders, ["id cartella", "idcartella", "cartella"]) : nucHeaders.indexOf("id cartella");

      for (let i = 1; i < options.nucleiData.length; i++) {
        const row = options.nucleiData[i];
        const idVal = (nucIdxId >= 0 ? (row[nucIdxId] || "") : (row[0] || "")).toString().trim();
        if (idVal) {
          validNucleiIds.add(idVal);
          nucleiMap.set(idVal, {
            id: idVal,
            intestatario: nucIdxIntestatario >= 0 ? (row[nucIdxIntestatario] || "") : "",
            idCartella: nucIdxCartella >= 0 ? (row[nucIdxCartella] || "") : "",
            rowIndex: i + 1
          });
        }
      }
    } else if (typeof NucleoFamiliare !== "undefined" && typeof NucleoFamiliare.getAll === "function") {
      try {
        const allN = NucleoFamiliare.getAll();
        for (const n of allN) {
          const nid = (n.id || "").toString().trim();
          if (nid) {
            validNucleiIds.add(nid);
            nucleiMap.set(nid, {
              id: nid,
              intestatario: n.intestatario || "",
              idCartella: n.idCartella || ""
            });
          }
        }
      } catch (e) {
        Logger.log("DataIntegrityService - Errore lettura nuclei: " + e.message);
      }
    }

    const totalChecked = benRows.length;
    const nucleiIntestatariMap = new Map(); // nucleoId -> Array<{ cf, nome, cognome, rowIdx }>
    const folderToBeneficiariMap = new Map(); // idCartella -> Array<{ cf, nome, cognome, rowIdx }>
    const cfToBeneficiariMap = new Map(); // cf -> Array<{ cf, nome, cognome, rowIdx }>

    // 3. Analisi riga per riga dei Beneficiari
    for (let i = 0; i < benRows.length; i++) {
      const row = benRows[i];
      const rowIdx = i + 2; // 1-based, escludendo riga intestazioni

      const nome = benIdx.nome >= 0 ? (row[benIdx.nome] || "").toString().trim() : "";
      const cognome = benIdx.cognome >= 0 ? (row[benIdx.cognome] || "").toString().trim() : "";
      const cfRaw = benIdx.cf >= 0 ? (row[benIdx.cf] || "").toString().trim() : "";
      const cf = cfRaw.toUpperCase();
      const idNucleo = benIdx.idNucleo >= 0 ? (row[benIdx.idNucleo] || "").toString().trim() : "";
      const ruolo = benIdx.rapportoIntestatario >= 0 ? (row[benIdx.rapportoIntestatario] || "").toString().trim() : "";
      const idCartella = benIdx.idCartella >= 0 ? (row[benIdx.idCartella] || "").toString().trim() : "";
      const sesso = benIdx.sesso >= 0 ? (row[benIdx.sesso] || "").toString().trim().toUpperCase() : "";
      const dataNascita = benIdx.dataNascita >= 0 ? row[benIdx.dataNascita] : null;

      // Salta righe completamente vuote
      if (!nome && !cognome && !cf) continue;

      const benRef = { rowIdx, nome, cognome, cf, idNucleo, ruolo, idCartella };

      // --- CHECK A: Mappatura Intestatari per Nucleo ---
      const isIntestatario = /(intestatari|capo|caponucleo)/i.test(ruolo);
      if (idNucleo && isIntestatario) {
        if (!nucleiIntestatariMap.has(idNucleo)) {
          nucleiIntestatariMap.set(idNucleo, []);
        }
        nucleiIntestatariMap.get(idNucleo).push(benRef);
      }

      // --- CHECK B: Beneficiario Orfano (idNucleo inesistente) ---
      if (idNucleo && validNucleiIds.size > 0 && !validNucleiIds.has(idNucleo)) {
        issues.push({
          id: `ORPHAN_${rowIdx}_${cf || idNucleo}`,
          type: "ORPHAN_BENEFICIARY",
          severity: "WARNING",
          title: `Beneficiario associato a nucleo inesistente (#${idNucleo})`,
          description: `${nome} ${cognome} (CF: ${cf || 'N/D'}) è collegato al Nucleo #${idNucleo}, ma questo ID non esiste nella tabella Nuclei.`,
          suggestedFix: `Assegna a un nucleo esistente o crea la scheda per il Nucleo #${idNucleo}.`,
          autoHealable: true,
          data: { rowIdx, cf, nome, cognome, idNucleo }
        });
        summary.orphanBeneficiaries++;
      }

      // --- CHECK C & D: Integrità e Collisioni Cartelle Drive ---
      if (idCartella) {
        if (!folderToBeneficiariMap.has(idCartella)) {
          folderToBeneficiariMap.set(idCartella, []);
        }
        folderToBeneficiariMap.get(idCartella).push(benRef);

        // Controllo esistenza fisica su Drive (se non disabilitato e in ambiente Google)
        if (!options.skipDriveCheck && typeof DriveApp !== "undefined") {
          try {
            const folder = DriveApp.getFolderById(idCartella);
            if (!folder || folder.isTrashed()) {
              issues.push({
                id: `MISSING_FOLDER_${rowIdx}_${idCartella}`,
                type: "MISSING_FOLDER",
                severity: "WARNING",
                title: `Cartella Drive inesistente o nel cestino`,
                description: `${nome} ${cognome} ha ID cartella '${idCartella}', ma la cartella non è accessibile o si trova nel cestino di Google Drive.`,
                suggestedFix: `Rigenera automaticamente la cartella personale '${nome} ${cognome}' su Drive.`,
                autoHealable: true,
                data: { rowIdx, cf, nome, cognome, idCartella, idNucleo }
              });
              summary.missingFolders++;
            }
          } catch (e) {
            issues.push({
              id: `MISSING_FOLDER_${rowIdx}_${idCartella}`,
              type: "MISSING_FOLDER",
              severity: "WARNING",
              title: `ID Cartella Drive non valido o autorizzazione negata`,
              description: `Impossibile accedere alla cartella Drive con ID '${idCartella}' per ${nome} ${cognome}.`,
              suggestedFix: `Crea una nuova cartella personale in Drive e aggiorna l'ID.`,
              autoHealable: true,
              data: { rowIdx, cf, nome, cognome, idCartella, idNucleo }
            });
            summary.missingFolders++;
          }
        }
      } else {
        // Beneficiario privo di ID cartella Drive
        issues.push({
          id: `MISSING_FOLDER_${rowIdx}_EMPTY`,
          type: "MISSING_FOLDER",
          severity: "INFO",
          title: `Cartella Drive personale non ancora assegnata`,
          description: `${nome} ${cognome} (CF: ${cf || 'N/D'}) non ha ancora una cartella personale su Google Drive registrata nel foglio.`,
          suggestedFix: `Crea la cartella personale su Google Drive e salva l'ID.`,
          autoHealable: true,
          data: { rowIdx, cf, nome, cognome, idCartella: "", idNucleo }
        });
        summary.missingFolders++;
      }

      // --- CHECK E: Conflitti Anagrafici e Validazione Codice Fiscale ---
      if (cf) {
        if (!cfToBeneficiariMap.has(cf)) {
          cfToBeneficiariMap.set(cf, []);
        }
        cfToBeneficiariMap.get(cf).push(benRef);

        // Controllo formale del Codice Fiscale
        if (typeof CodiceFiscale !== "undefined") {
          const isValidCF = typeof CodiceFiscale.validate === "function" ? CodiceFiscale.validate(cf) : (cf.length === 16);
          if (!isValidCF) {
            issues.push({
              id: `CF_INVALID_${rowIdx}_${cf}`,
              type: "ANAGRAFICA_CONFLICT",
              severity: "WARNING",
              title: `Codice Fiscale formalmente non valido`,
              description: `${nome} ${cognome} ha un Codice Fiscale (${cf}) non conforme ai controlli formali o con carattere di controllo (CIN) errato.`,
              suggestedFix: `Ricalcola o correggi il Codice Fiscale nel foglio.`,
              autoHealable: false,
              data: { rowIdx, cf, nome, cognome }
            });
            summary.anagraficaConflicts++;
          } else {
            // Controllo congruenza sesso e data se disponibili
            if (typeof CodiceFiscale.decode === "function") {
              try {
                const decoded = CodiceFiscale.decode(cf);
                if (decoded) {
                  if (sesso && decoded.sesso && sesso !== decoded.sesso) {
                    issues.push({
                      id: `CF_MISMATCH_SEX_${rowIdx}_${cf}`,
                      type: "ANAGRAFICA_CONFLICT",
                      severity: "WARNING",
                      title: `Discrepanza Sesso vs Codice Fiscale`,
                      description: `${nome} ${cognome} ha sesso '${sesso}' nel foglio ma '${decoded.sesso}' nel Codice Fiscale (${cf}).`,
                      suggestedFix: `Allinea il campo sesso con il Codice Fiscale o verifica l'anagrafica.`,
                      autoHealable: true,
                      data: { rowIdx, cf, nome, cognome, currentSex: sesso, expectedSex: decoded.sesso }
                    });
                    summary.anagraficaConflicts++;
                  }
                }
              } catch (cfErr) { }
            }
          }
        } else if (cf.length !== 16) {
          issues.push({
            id: `CF_LENGTH_${rowIdx}_${cf}`,
            type: "ANAGRAFICA_CONFLICT",
            severity: "WARNING",
            title: `Lunghezza Codice Fiscale anomala (${cf.length} caratteri)`,
            description: `${nome} ${cognome} ha un CF di ${cf.length} caratteri invece dei 16 alfanumerici previsti.`,
            suggestedFix: `Verifica e correggi il Codice Fiscale.`,
            autoHealable: false,
            data: { rowIdx, cf, nome, cognome }
          });
          summary.anagraficaConflicts++;
        }
      }
    }

    // 4. Analisi Aggregata A: Doppi Intestatari per Nucleo
    for (const [idNuc, intestatari] of nucleiIntestatariMap.entries()) {
      if (intestatari.length > 1) {
        const nomiList = intestatari.map(b => `${b.nome} ${b.cognome} (riga ${b.rowIdx})`).join(", ");
        issues.push({
          id: `DUPLICATE_INTESTATARI_${idNuc}`,
          type: "DUPLICATE_INTESTATARI",
          severity: "ERROR",
          title: `Nucleo #${idNuc} ha ${intestatari.length} Intestatari (violazione unicità)`,
          description: `Nel Nucleo #${idNuc} risultano censiti contemporaneamente ${intestatari.length} intestatari: ${nomiList}. Un nucleo deve avere esattamente un solo intestatario.`,
          suggestedFix: `Mantieni il primo come 'Intestatario' e imposta gli altri come 'Componente' (o seleziona il caponucleo corretto).`,
          autoHealable: true,
          data: {
            idNucleo: idNuc,
            intestatari: intestatari.map(b => ({ rowIdx: b.rowIdx, cf: b.cf, nome: b.nome, cognome: b.cognome }))
          }
        });
        summary.duplicateIntestatari++;
      }
    }

    // 5. Analisi Aggregata D: Cartelle Drive Duplicate (Collisioni)
    for (const [idFold, beneficiari] of folderToBeneficiariMap.entries()) {
      if (beneficiari.length > 1) {
        const nomiList = beneficiari.map(b => `${b.nome} ${b.cognome} (CF: ${b.cf || 'N/D'})`).join(", ");
        issues.push({
          id: `DUPLICATE_FOLDER_${idFold}`,
          type: "DUPLICATE_FOLDER",
          severity: "ERROR",
          title: `Stessa Cartella Drive personale condivisa tra ${beneficiari.length} beneficiari distinti`,
          description: `La cartella Drive '${idFold}' è associata a più persone differenti: ${nomiList}. Ciascun componente deve possedere la propria cartella personale univoca.`,
          suggestedFix: `Mantieni la cartella per il primo beneficiario e genera nuove cartelle separate per gli altri.`,
          autoHealable: true,
          data: {
            idCartella: idFold,
            beneficiari: beneficiari.map(b => ({ rowIdx: b.rowIdx, cf: b.cf, nome: b.nome, cognome: b.cognome }))
          }
        });
        summary.duplicateFolders++;
      }
    }

    // 6. Analisi Aggregata E: Stesso Codice Fiscale con Nomi Differenti
    for (const [cfVal, beneficiari] of cfToBeneficiariMap.entries()) {
      if (beneficiari.length > 1) {
        // Verifica se hanno nomi o cognomi differenti
        const firstNom = `${beneficiari[0].nome} ${beneficiari[0].cognome}`.toLowerCase().trim();
        const hasNameMismatch = beneficiari.some(b => `${b.nome} ${b.cognome}`.toLowerCase().trim() !== firstNom);
        if (hasNameMismatch) {
          const distinctNames = beneficiari.map(b => `${b.nome} ${b.cognome} (riga ${b.rowIdx})`).join(" vs ");
          issues.push({
            id: `CF_CONFLICT_${cfVal}`,
            type: "ANAGRAFICA_CONFLICT",
            severity: "ERROR",
            title: `Stesso Codice Fiscale (${cfVal}) attribuito a persone diverse`,
            description: `Il codice fiscale ${cfVal} compare associato a nominativi differenti: ${distinctNames}.`,
            suggestedFix: `Verifica il documento di identità e correggi il Codice Fiscale errato.`,
            autoHealable: false,
            data: { cf: cfVal, beneficiari: beneficiari.map(b => ({ rowIdx: b.rowIdx, nome: b.nome, cognome: b.cognome })) }
          });
          summary.anagraficaConflicts++;
        }
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalChecked,
      totalIssues: issues.length,
      issues,
      summary
    };
  }

  /**
   * Applica l'Auto-Healing automatico per un elenco di anomalie risolvibili.
   * 
   * @param {Array<string>} [selectedIssueIds] - Lista facoltativa degli ID anomalie da sanare. Se omessa, sana tutte quelle auto-risolvibili.
   * @param {Object} [options]
   * @return {{
   *   success: boolean;
   *   healedCount: number;
   *   errorsCount: number;
   *   details: Array<{ issueId: string; action: string; success: boolean; message: string }>;
   * }}
   */
  static autoHeal(selectedIssueIds = null, options = {}) {
    const auditRes = DataIntegrityService.auditBeneficiari(options);
    const targetIssues = auditRes.issues.filter(issue => {
      if (!issue.autoHealable) return false;
      if (selectedIssueIds && Array.isArray(selectedIssueIds)) {
        return selectedIssueIds.includes(issue.id);
      }
      return true;
    });

    const results = [];
    let healedCount = 0;
    let errorsCount = 0;

    const ss = typeof SpreadsheetApp !== "undefined" ? SpreadsheetApp.getActiveSpreadsheet() : null;
    let sheet = null;
    let benHeaders = [];
    let benIdx = {};

    if (ss) {
      sheet = ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : 'Beneficiari')
        || ss.getSheetByName('Beneficiari') || ss.getSheetByName('Beneficiario');
      if (sheet) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        benHeaders = headers.map(h => (h || "").toString().trim().toLowerCase());
        benIdx = DataIntegrityService._getBenColIndexes(benHeaders);
      }
    }

    for (const issue of targetIssues) {
      try {
        let fixApplied = false;
        let actionMsg = "";

        switch (issue.type) {
          case "DUPLICATE_INTESTATARI":
            // Risoluzione: mantieni il primo intestatario, degrada tutti i successivi a "Altro componente"
            if (sheet && benIdx.rapportoIntestatario >= 0) {
              const intestatari = issue.data.intestatari;
              // Il primo resta Intestatario, dal secondo in poi vengono corretti
              for (let k = 1; k < intestatari.length; k++) {
                const rowNum = intestatari[k].rowIdx;
                sheet.getRange(rowNum, benIdx.rapportoIntestatario + 1).setValue("Altro componente");
              }
              fixApplied = true;
              actionMsg = `Nucleo #${issue.data.idNucleo}: mantenuto '${intestatari[0].nome} ${intestatari[0].cognome}' come Intestatario, declassati ${intestatari.length - 1} a 'Altro componente'.`;
            } else {
              actionMsg = "Foglio o colonna rapporto intestatario non accessibile.";
            }
            break;

          case "CF_MISMATCH_SEX":
            // Risoluzione: aggiorna il sesso nel foglio con quello codificato nel Codice Fiscale
            if (sheet && benIdx.sesso >= 0 && issue.data.rowIdx && issue.data.expectedSex) {
              sheet.getRange(issue.data.rowIdx, benIdx.sesso + 1).setValue(issue.data.expectedSex);
              fixApplied = true;
              actionMsg = `Aggiornato sesso a '${issue.data.expectedSex}' per ${issue.data.nome} ${issue.data.cognome} in base al CF.`;
            }
            break;

          case "MISSING_FOLDER":
            // Risoluzione: crea la sottocartella personale su Drive e aggiorna l'idCartella
            if (sheet && benIdx.idCartella >= 0 && issue.data.rowIdx) {
              if (typeof DriveApp !== "undefined") {
                const folderName = `${issue.data.nome} ${issue.data.cognome}`.trim();
                let parentFolder = null;

                // Tenta di trovare la cartella del nucleo genitore
                if (issue.data.idNucleo && typeof NucleoFamiliare !== "undefined") {
                  try {
                    const allN = NucleoFamiliare.getAll();
                    const targetN = allN.find(n => String(n.id) === String(issue.data.idNucleo));
                    if (targetN && targetN.idCartella) {
                      parentFolder = DriveApp.getFolderById(targetN.idCartella);
                    }
                  } catch (e) { }
                }

                if (!parentFolder && typeof CONFIG !== "undefined" && CONFIG.FOLDER_BENEFICIARI_ROOT) {
                  parentFolder = CONFIG.FOLDER_BENEFICIARI_ROOT;
                }

                if (parentFolder) {
                  const newFolder = parentFolder.createFolder(folderName);
                  sheet.getRange(issue.data.rowIdx, benIdx.idCartella + 1).setValue(newFolder.getId());
                  fixApplied = true;
                  actionMsg = `Creata cartella Drive '${folderName}' (${newFolder.getId()}) e salvata nel foglio.`;
                } else {
                  actionMsg = "Cartella radice o nucleo non trovata su Drive.";
                }
              } else {
                actionMsg = "Ambiente offline: DriveApp non disponibile.";
              }
            }
            break;

          case "DUPLICATE_FOLDER":
            // Risoluzione: crea una nuova cartella per i beneficiari successivi al primo
            if (sheet && benIdx.idCartella >= 0 && typeof DriveApp !== "undefined") {
              const beneficiari = issue.data.beneficiari;
              for (let k = 1; k < beneficiari.length; k++) {
                const b = beneficiari[k];
                const folderName = `${b.nome} ${b.cognome}`.trim();
                let parentFolder = (typeof CONFIG !== "undefined" && CONFIG.FOLDER_BENEFICIARI_ROOT) ? CONFIG.FOLDER_BENEFICIARI_ROOT : null;
                if (parentFolder) {
                  const newFolder = parentFolder.createFolder(folderName);
                  sheet.getRange(b.rowIdx, benIdx.idCartella + 1).setValue(newFolder.getId());
                }
              }
              fixApplied = true;
              actionMsg = `Generate nuove cartelle separate per ${beneficiari.length - 1} beneficiari in collisione.`;
            }
            break;

          default:
            actionMsg = `Tipo anomalia '${issue.type}' non configurato per Auto-Healing automatico.`;
            break;
        }

        if (fixApplied) {
          healedCount++;
          results.push({ issueId: issue.id, action: issue.type, success: true, message: actionMsg });
        } else {
          errorsCount++;
          results.push({ issueId: issue.id, action: issue.type, success: false, message: actionMsg || "Impossibile applicare fix automatico." });
        }
      } catch (err) {
        errorsCount++;
        results.push({
          issueId: issue.id,
          action: issue.type,
          success: false,
          message: "Errore durante l'applicazione del fix: " + (err instanceof Error ? err.message : String(err))
        });
      }
    }

    if (typeof SpreadsheetApp !== "undefined") {
      try {
        SpreadsheetApp.flush();
      } catch (e) { }
    }

    return {
      success: errorsCount === 0,
      healedCount,
      errorsCount,
      details: results
    };
  }

  /**
   * Mappa gli indici delle colonne della tabella Beneficiari.
   * @private
   */
  static _getBenColIndexes(headers) {
    const findIdx = typeof findHeaderIndex === "function"
      ? findHeaderIndex
      : (hdrs, keys) => hdrs.findIndex(h => keys.some(k => h.includes(k)));

    return {
      nome: findIdx(headers, ["nome"]),
      cognome: findIdx(headers, ["cognome"]),
      cf: findIdx(headers, ["codice fiscale", "cf"]),
      sesso: findIdx(headers, ["sesso", "genere"]),
      dataNascita: findIdx(headers, ["data di nascita", "data nascita"]),
      luogoNascita: findIdx(headers, ["luogo di nascita", "luogo nascita"]),
      idNucleo: findIdx(headers, ["nucleo familiare", "id nucleo", "nucleo", "id_nucleo", "id nucleo familiare", "famiglia"]),
      rapportoIntestatario: findIdx(headers, ["rapporto con intestatario del nucleo familiare", "rapporto intestatario", "rapporto", "ruolo nucleo", "ruolo"]),
      idCartella: findIdx(headers, ["id cartella drive", "id cartella", "cartella drive", "cartella", "id_cartella"])
    };
  }
}
