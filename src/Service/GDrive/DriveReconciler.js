/**
 * @file DriveReconciler.js
 * @description Motore avanzato di audit, diagnostica e riconciliazione automatica e interattiva
 * tra Google Drive, i Fogli Google ('Documenti', 'Beneficiari', 'Nuclei Familiari') e il modello IA Google Gemini Flash.
 * 
 * Risolve in modo sistematico:
 * 1. Analisi semantica e OCR dei documenti su Drive tramite Google Gemini Flash (DocumentIntelligence);
 * 2. Standardizzazione della nomenclatura di file e cartelle (buildDocumentFileName, analyzeFolderName);
 * 3. Rilevamento duplicati esatti (hash MD5/dimensione) e semantici con gestione interattiva (cestina/archivia/mantieni);
 * 4. Fuzzy matching e correzione di cartelle invertite (Cognome Nome vs Nome Cognome), refusi e nomi parziali;
 * 5. Riposizionamento topologico di file fuori posto (radice nucleo <-> sottocartelle personali membri);
 * 6. Censimento automatico nel foglio 'Documenti' di file presenti su Drive ma non tracciati;
 * 7. Rilevamento e rimozione selettiva di righe orfane nel foglio 'Documenti' (file eliminati da Drive);
 * 8. Riconciliazione dei dati anagrafici (Beneficiari/Nuclei) con i dati estratti dai documenti con tabella diff.
 * 
 * @module Service/GDrive/DriveReconciler
 */

/**
 * @typedef {Object} ReconcileIssue
 * @property {"FOLDER_NAME_MISMATCH" | "MISSING_MEMBER_FOLDER" | "MISPLACED_FILE" | "NON_STANDARD_FILENAME" | "DUPLICATE_FILE" | "UNTRACKED_FILE" | "ORPHAN_SHEET_ROW" | "ANAGRAFICA_DIFF" | "EXPIRED_DOCUMENT" | "FRAGMENTED_DOCUMENT"} type
 * @property {"warning" | "danger" | "info"} severity
 * @property {string} message
 * @property {string} [fileId]
 * @property {string} [fileName]
 * @property {string} [folderId]
 * @property {string} [currentName]
 * @property {string} [suggestedNewName]
 * @property {string} [targetFolderId]
 * @property {string} [targetFolderName]
 * @property {string} [targetMemberCF]
 * @property {string} [targetMemberName]
 * @property {Object} [extra]
 */

/**
 * @typedef {Object} NucleoAuditReport
 * @property {string} nucleoId
 * @property {string} intestatario
 * @property {string} folderId
 * @property {string} folderUrl
 * @property {"HEALTHY" | "WARNING" | "CRITICAL"} status
 * @property {boolean} hasIssues
 * @property {ReconcileIssue[]} issues
 * @property {{
 *   totalFiles: number;
 *   misplacedFiles: number;
 *   missingFolders: number;
 *   untrackedFiles: number;
 *   duplicateFiles: number;
 *   nonStandardNames: number;
 *   folderMismatches: number;
 *   orphanRows: number;
 *   anagraficaDiffs: number;
 *   expiredDocs: number;
 *   fragmentedDocs: number;
 * }} stats
 * @property {Array<{ id: string; name: string; cf: string; folderId: string; folderName: string }>} members
 * @property {Array<any>} duplicateGroups
 * @property {Array<any>} untrackedList
 * @property {Array<any>} orphanList
 * @property {Array<any>} diffList
 */

class DriveReconciler {

  /**
   * Recupera i metadati di un file da Google Drive API v3 senza scaricare il contenuto del file.
   * Utilizza UrlFetchApp con il token OAuth nativo di ScriptApp ed effettua il caching in memoria.
   * Restituisce null in caso di errore, file non trovato o in ambienti di test privi dei servizi GAS.
   * 
   * @param {string} fileId - ID univoco del file in Google Drive.
   * @param {Map<string, Object>} [cache] - Cache in memoria opzionale per la durata dell'audit.
   * @return {{ id: string, name: string, size: number|null, md5Checksum: string|null, mimeType: string }|null}
   */
  static getDriveFileMetadata(fileId, cache = null) {
    if (!fileId) return null;
    if (cache && typeof cache.get === "function" && cache.has(fileId)) {
      return cache.get(fileId);
    }

    // In ambienti privi di UrlFetchApp o ScriptApp (es. Node.js unit tests offline), ritorna graceful null
    if (typeof UrlFetchApp === "undefined" || typeof ScriptApp === "undefined") {
      return null;
    }

    try {
      const url = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "?fields=id,name,size,md5Checksum,mimeType";
      const response = UrlFetchApp.fetch(url, {
        method: "get",
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });

      if (response && response.getResponseCode && response.getResponseCode() === 200) {
        const meta = JSON.parse(response.getContentText());
        const result = {
          id: meta.id || fileId,
          name: meta.name || "",
          size: meta.size ? Number(meta.size) : null,
          md5Checksum: meta.md5Checksum || null,
          mimeType: meta.mimeType || ""
        };
        if (cache && typeof cache.set === "function") {
          cache.set(fileId, result);
        }
        return result;
      } else if (response && response.getResponseCode && typeof Logger !== "undefined") {
        Logger.log("[DriveReconciler.getDriveFileMetadata] Risposta HTTP " + response.getResponseCode() + " per fileId " + fileId + ": " + response.getContentText());
      }
    } catch (e) {
      if (typeof Logger !== "undefined") {
        Logger.log("[DriveReconciler.getDriveFileMetadata] Errore richiesta metadati per fileId " + fileId + ": " + e.message);
      }
    }

    return null;
  }

  /**
   * Esegue l'audit diagnostico completo per un singolo nucleo familiare.
   * Scansiona la cartella radice del nucleo e tutte le relative sottocartelle personali dei membri,
   * incrociando i file con il foglio 'Documenti' e l'anagrafica.
   * 
   * @param {string|number} nucleoId - Identificativo del nucleo familiare.
   * @param {Object} [options] - Opzioni dell'audit.
   * @param {boolean} [options.deepAIScan=false] - Se true, attiva l'ispezione con Gemini Flash per estrarre metadati e verificare anagrafica.
   * @param {number} [options.maxAIFiles=5] - Limite massimo di file da ispezionare con IA per sessione (evita timeout Apps Script).
   * @return {NucleoAuditReport}
   */
  static auditNucleo(nucleoId, options = {}) {
    const idStr = String(nucleoId).trim();
    const deepAIScan = !!options.deepAIScan;
    const maxAIFiles = options.maxAIFiles || 5;

    const issues = [];
    const duplicateGroups = [];
    const untrackedList = [];
    const orphanList = [];
    const diffList = [];

    let folder = null;
    let folderUrl = "";
    let folderId = "";

    // 1. Dati anagrafici del nucleo e dei membri
    const allBeneficiari = (typeof BeneficiarioRepository !== "undefined") ? BeneficiarioRepository.getAll() : [];
    const members = allBeneficiari.filter(b => String(b.idNucleo).trim() === idStr);
    let intestatario = members.find(b => (b.rapportoIntestatario || "").toLowerCase() === "intestatario") || members[0];

    let nucleoObj = null;
    try {
      const allNuclei = (typeof NucleoFamiliare !== "undefined") ? NucleoFamiliare.getAll() : [];
      nucleoObj = allNuclei.find(n => String(n.id).trim() === idStr) || null;
    } catch (eN) {}

    // Fallback: se l'intestatario non è nei membri con idNucleo ma è specificato nel nucleo, cercalo per CF
    if (!intestatario && nucleoObj && nucleoObj.intestatario) {
      const cleanCF = String(nucleoObj.intestatario).toUpperCase().trim();
      intestatario = allBeneficiari.find(b => (b.cf || "").toUpperCase().trim() === cleanCF) || null;
      if (intestatario && !members.some(m => (m.cf || "").toUpperCase().trim() === cleanCF)) {
        members.push(intestatario);
      }
    }

    let intestatarioNome = intestatario
      ? `${intestatario.name || intestatario.nome || ""} ${intestatario.surname || intestatario.cognome || ""}`.trim()
      : "";

    // 2. Localizzazione cartella radice del nucleo
    try {
      const folderInfo = DriveManager.getOrCreateNucleoFolder(idStr, intestatarioNome);
      folderId = folderInfo.id;
      folderUrl = folderInfo.url;
      folder = DriveApp.getFolderById(folderId);

      // Se non abbiamo ancora il nome dell'intestatario, tentiamo di dedurlo dal nome della cartella Drive
      if (!intestatarioNome && folder) {
        const folderNameRaw = folder.getName().trim();
        const match = folderNameRaw.match(/^\s*\d+\s*[-–—]?\s*(.+)$/);
        if (match && match[1] && !/^nucleo$/i.test(match[1].trim())) {
          intestatarioNome = match[1].trim();
        }
      }
    } catch (e) {
      issues.push({
        type: "MISSING_MEMBER_FOLDER",
        severity: "danger",
        message: "Cartella radice del nucleo #" + idStr + " non accessibile: " + e.message
      });
      return JSON.parse(JSON.stringify({
        nucleoId: idStr,
        intestatario: intestatarioNome,
        folderId: "",
        folderUrl: "",
        status: "CRITICAL",
        hasIssues: true,
        issues: issues,
        stats: {
          totalFiles: 0,
          misplacedFiles: 0,
          missingFolders: 1,
          untrackedFiles: 0,
          duplicateFiles: 0,
          nonStandardNames: 0,
          folderMismatches: 0,
          orphanRows: 0,
          anagraficaDiffs: 0,
          expiredDocs: 0
        },
        members: [],
        duplicateGroups: [],
        untrackedList: [],
        orphanList: [],
        diffList: []
      }));
    }

    // 3. Verifica denominazione conforme della cartella radice nucleo
    if (intestatario) {
      const nucAnalysis = (typeof analyzeFolderName === "function")
        ? analyzeFolderName(folder.getName(), intestatario.name || intestatario.nome, intestatario.surname || intestatario.cognome, idStr)
        : { isMismatch: false };

      if (nucAnalysis.isMismatch) {
        issues.push({
          type: "FOLDER_NAME_MISMATCH",
          severity: "warning",
          folderId: folderId,
          currentName: folder.getName(),
          suggestedNewName: nucAnalysis.canonicalName,
          extra: { isNucleoFolder: true },
          message: `Nome cartella nucleo non conforme: '${folder.getName()}'. Suggerito: '${nucAnalysis.canonicalName}' (${nucAnalysis.reason}).`
        });
      }
    }

    // 4. Mappatura sottocartelle esistenti nella cartella nucleo
    const existingSubfolders = [];
    const subfolderIter = folder.getFolders();
    while (subfolderIter.hasNext()) {
      const sf = subfolderIter.next();
      if (!sf.isTrashed()) {
        existingSubfolders.push({
          id: sf.getId(),
          name: sf.getName().trim(),
          folderObj: sf
        });
      }
    }

    // 5. Verifica corrispondenza sottocartelle per ciascun membro censito
    const memberFolderMap = {}; // cf -> { folderId, folderName }
    const mappedMemberFolderIds = new Set();
    let missingFoldersCount = 0;

    for (let m = 0; m < members.length; m++) {
      const mem = members[m];
      const memFirst = (mem.name || mem.nome || "").trim();
      const memLast = (mem.surname || mem.cognome || "").trim();
      const memFullName = `${memFirst} ${memLast}`.trim();
      const memCF = (mem.cf || "").toUpperCase().trim();

      // Cerca la sottocartella tramite analisi fuzzy
      let matchedFolder = null;
      let bestAnalysis = null;

      for (let s = 0; s < existingSubfolders.length; s++) {
        const sf = existingSubfolders[s];
        const analysis = (typeof analyzeFolderName === "function")
          ? analyzeFolderName(sf.name, memFirst, memLast)
          : { isMismatch: sf.name.toLowerCase() !== memFullName.toLowerCase(), canonicalName: memFullName };

        if (analysis.status === "EXACT") {
          matchedFolder = sf;
          bestAnalysis = analysis;
          break;
        } else if (["INVERTED", "TYPO", "PARTIAL"].includes(analysis.status) && (!bestAnalysis || analysis.similarity > (bestAnalysis.similarity || 0))) {
          matchedFolder = sf;
          bestAnalysis = analysis;
        } else if (memCF && sf.name.toUpperCase().includes(memCF)) {
          matchedFolder = sf;
          bestAnalysis = analysis;
        }
      }

      if (matchedFolder) {
        memberFolderMap[memCF] = { folderId: matchedFolder.id, folderName: matchedFolder.name };
        mappedMemberFolderIds.add(matchedFolder.id);

        if (bestAnalysis && bestAnalysis.isMismatch) {
          issues.push({
            type: "FOLDER_NAME_MISMATCH",
            severity: "warning",
            folderId: matchedFolder.id,
            currentName: matchedFolder.name,
            suggestedNewName: bestAnalysis.canonicalName,
            targetMemberCF: memCF,
            targetMemberName: memFullName,
            extra: { isNucleoFolder: false },
            message: `Sottocartella di '${memFullName}' ha nome non conforme: '${matchedFolder.name}' -> Proposta: '${bestAnalysis.canonicalName}' (${bestAnalysis.reason}).`
          });
        }
      } else {
        missingFoldersCount++;
        issues.push({
          type: "MISSING_MEMBER_FOLDER",
          severity: "warning",
          targetMemberCF: memCF,
          targetMemberName: memFullName,
          message: `Manca la sottocartella personale per il componente '${memFullName}'.`
        });
      }
    }

    // 6. Censimento di tutti i file (radice nucleo + sottocartelle)
    const existingTrackedDocs = (typeof DocumentoRepository !== "undefined") ? DocumentoRepository.getAll() : [];
    const trackedDriveIds = new Set(existingTrackedDocs.map(d => d.idDrive).filter(Boolean));
    const allScannedFiles = []; // { file, fileId, fileName, folderId, folderName, isRoot, memberCF, size, lastUpdated }

    // 6a. File nella radice del nucleo
    const rootFilesIter = folder.getFiles();
    while (rootFilesIter.hasNext()) {
      const f = rootFilesIter.next();
      if (!f.isTrashed()) {
        allScannedFiles.push({
          file: f,
          fileId: f.getId(),
          fileName: f.getName(),
          folderId: folderId,
          folderName: folder.getName(),
          isRoot: true,
          memberCF: "",
          size: f.getSize(),
          mimeType: f.getMimeType(),
          lastUpdated: f.getLastUpdated()
        });
      }
    }

    // 6b. File nelle sottocartelle dei membri
    for (let s = 0; s < existingSubfolders.length; s++) {
      const sf = existingSubfolders[s];
      // Individua a quale membro appartiene questa cartella
      let folderMemberCF = "";
      for (const [cf, fInfo] of Object.entries(memberFolderMap)) {
        if (fInfo.folderId === sf.id) {
          folderMemberCF = cf;
          break;
        }
      }

      const sFilesIter = sf.folderObj.getFiles();
      while (sFilesIter.hasNext()) {
        const sfFile = sFilesIter.next();
        if (!sfFile.isTrashed()) {
          allScannedFiles.push({
            file: sfFile,
            fileId: sfFile.getId(),
            fileName: sfFile.getName(),
            folderId: sf.id,
            folderName: sf.name,
            isRoot: false,
            memberCF: folderMemberCF,
            size: sfFile.getSize(),
            mimeType: sfFile.getMimeType(),
            lastUpdated: sfFile.getLastUpdated()
          });
        }
      }
    }

    const formatSafeDate = (d) => {
      if (!d) return "";
      if (d instanceof Date) {
        return !isNaN(d.getTime()) ? d.toISOString() : "";
      }
      return String(d);
    };

    // 7. Rilevamento duplicati (Two-Tier: Tier 1 Byte Size -> Tier 2 Drive API md5Checksum & Semantici)
    const sizeMap = {};
    const semanticMap = {};
    const flaggedDuplicateIds = new Set();
    const md5MetadataCache = new Map();

    for (let i = 0; i < allScannedFiles.length; i++) {
      const item = allScannedFiles[i];
      const docRec = (typeof findDocumentType === "function") ? findDocumentType(item.fileName) : null;
      const docTipo = docRec ? docRec.name : "Altro";

      // Match preliminare su dimensione file (byte)
      if (item.size > 0) {
        if (!sizeMap[item.size]) {
          sizeMap[item.size] = [item];
        } else {
          sizeMap[item.size].push(item);
        }
      }

      // Match semantico: per documenti annuali, periodici o con scadenza (stesso intestatario o nucleo + stesso tipo documento)
      // ESCLUDIAMO categoricamente i documenti generici non classificati ("Altro Documento" / "ALTRO") per evitare falsi positivi
      const isGeneric = !docRec || docRec.id === "ALTRO" || docRec.name === "Altro" || docRec.name === "Altro Documento";
      if (!isGeneric) {
        const yearMatch = item.fileName.match(/\b(20\d{2})\b/);
        const yearKey = yearMatch ? yearMatch[1] : "N_A";
        const semKey = `${item.memberCF || "NUCLEO"}_${docRec.id || docRec.name}_${yearKey}`;

        if (!semanticMap[semKey]) {
          semanticMap[semKey] = [item];
        } else {
          semanticMap[semKey].push(item);
        }
      }
    }

    // Processa duplicati esatti (Strategia a 2 Livelli: solo i file con la medesima dimensione interrogano l'MD5)
    for (const [sizeVal, fileList] of Object.entries(sizeMap)) {
      if (fileList.length > 1) {
        const md5Groups = {};
        const noMd5List = [];

        for (let fIdx = 0; fIdx < fileList.length; fIdx++) {
          const item = fileList[fIdx];
          const meta = DriveReconciler.getDriveFileMetadata(item.fileId, md5MetadataCache);
          const checksum = meta ? meta.md5Checksum : null;
          if (checksum) {
            if (!md5Groups[checksum]) {
              md5Groups[checksum] = [item];
            } else {
              md5Groups[checksum].push(item);
            }
          } else {
            noMd5List.push(item);
          }
        }

        // 7a. Duplicati con Hash MD5 identico (Certezza matematica 100% clone bit-a-bit)
        for (const [md5Hash, hashGroup] of Object.entries(md5Groups)) {
          if (hashGroup.length > 1) {
            const primary = hashGroup[0];
            for (let k = 1; k < hashGroup.length; k++) {
              const dup = hashGroup[k];
              if (!flaggedDuplicateIds.has(dup.fileId)) {
                flaggedDuplicateIds.add(dup.fileId);
                const dupInfo = {
                  type: "EXACT_HASH",
                  reason: `Hash MD5 identico (${md5Hash.slice(0, 8)}...) - ${sizeVal} B`,
                  certainty: 1.0,
                  md5: md5Hash,
                  primary: {
                    id: primary.fileId,
                    name: primary.fileName,
                    folderName: primary.folderName,
                    lastUpdated: formatSafeDate(primary.lastUpdated),
                    size: primary.size,
                    md5: md5Hash
                  },
                  duplicate: {
                    id: dup.fileId,
                    name: dup.fileName,
                    folderName: dup.folderName,
                    lastUpdated: formatSafeDate(dup.lastUpdated),
                    size: dup.size,
                    md5: md5Hash
                  }
                };
                duplicateGroups.push(dupInfo);
                issues.push({
                  type: "DUPLICATE_FILE",
                  severity: "warning",
                  fileId: dup.fileId,
                  fileName: dup.fileName,
                  message: `File duplicato confermato (MD5 identico ${md5Hash.slice(0, 8)}...): '${dup.fileName}' è un clone esatto di '${primary.fileName}'.`,
                  extra: Object.assign({}, dupInfo)
                });
              }
            }
          }
        }

        // 7b. File senza MD5 (Google Docs nativi, file speciali o ambiente offline senza API Drive)
        if (noMd5List.length > 1) {
          const isOffline = (typeof UrlFetchApp === "undefined");
          const nameMap = {};

          for (let noIdx = 0; noIdx < noMd5List.length; noIdx++) {
            const item = noMd5List[noIdx];
            const key = isOffline ? "SAME_SIZE" : (item.fileName || "").trim().toLowerCase();
            if (!nameMap[key]) {
              nameMap[key] = [item];
            } else {
              nameMap[key].push(item);
            }
          }

          for (const [groupKey, nGroup] of Object.entries(nameMap)) {
            if (nGroup.length > 1) {
              const primary = nGroup[0];
              for (let k = 1; k < nGroup.length; k++) {
                const dup = nGroup[k];
                if (!flaggedDuplicateIds.has(dup.fileId)) {
                  flaggedDuplicateIds.add(dup.fileId);
                  const reasonStr = isOffline 
                    ? `Stessa dimensione in byte (${sizeVal} B)`
                    : `Stessa dimensione (${sizeVal} B) e stesso nome file`;
                  const dupInfo = {
                    type: "EXACT",
                    reason: reasonStr,
                    certainty: isOffline ? 0.7 : 0.9,
                    md5: null,
                    primary: {
                      id: primary.fileId,
                      name: primary.fileName,
                      folderName: primary.folderName,
                      lastUpdated: formatSafeDate(primary.lastUpdated),
                      size: primary.size,
                      md5: null
                    },
                    duplicate: {
                      id: dup.fileId,
                      name: dup.fileName,
                      folderName: dup.folderName,
                      lastUpdated: formatSafeDate(dup.lastUpdated),
                      size: dup.size,
                      md5: null
                    }
                  };
                  duplicateGroups.push(dupInfo);
                  issues.push({
                    type: "DUPLICATE_FILE",
                    severity: "warning",
                    fileId: dup.fileId,
                    fileName: dup.fileName,
                    message: `Possibile file duplicato: '${dup.fileName}' ha identica dimensione (${sizeVal} B) di '${primary.fileName}'.`,
                    extra: Object.assign({}, dupInfo)
                  });
                }
              }
            }
          }
        }
      }
    }

    // Processa duplicati semantici (se non già flaggati come esatti)
    for (const [semKey, fileList] of Object.entries(semanticMap)) {
      if (fileList.length > 1) {
        const primary = fileList[0];
        for (let k = 1; k < fileList.length; k++) {
          const dup = fileList[k];
          if (!flaggedDuplicateIds.has(dup.fileId)) {
            flaggedDuplicateIds.add(dup.fileId);
            const dupInfo = {
              type: "SEMANTIC",
              reason: `Stesso documento e periodo per lo stesso soggetto (${semKey})`,
              primary: { id: primary.fileId, name: primary.fileName, folderName: primary.folderName, lastUpdated: formatSafeDate(primary.lastUpdated), size: primary.size },
              duplicate: { id: dup.fileId, name: dup.fileName, folderName: dup.folderName, lastUpdated: formatSafeDate(dup.lastUpdated), size: dup.size }
            };
            duplicateGroups.push(dupInfo);
            issues.push({
              type: "DUPLICATE_FILE",
              severity: "warning",
              fileId: dup.fileId,
              fileName: dup.fileName,
              message: `Doppione semantico rilevato: '${dup.fileName}' riguarda lo stesso documento/periodo di '${primary.fileName}'.`,
              extra: Object.assign({}, dupInfo)
            });
          }
        }
      }
    }

    // 8. Analisi topologica, classificazione e nomenclatura di ciascun file
    let aiScansCount = 0;

    for (let fIdx = 0; fIdx < allScannedFiles.length; fIdx++) {
      const item = allScannedFiles[fIdx];
      const fName = item.fileName;
      const fId = item.fileId;
      let docRec = (typeof findDocumentType === "function") ? findDocumentType(fName) : null;

      // Se il file è già censito nel foglio 'Documenti' con un tipo standard valido, usiamolo come fonte di verità
      const trackedDoc = existingTrackedDocs.find(d => d.idDrive === fId);
      if ((!docRec || docRec.id === "ALTRO" || docRec.name === "Altro" || docRec.name === "Altro Documento") && trackedDoc && trackedDoc.tipo) {
        const fromSheet = (typeof findDocumentType === "function") ? findDocumentType(trackedDoc.tipo) : null;
        if (fromSheet && fromSheet.id !== "ALTRO") {
          docRec = fromSheet;
        }
      }

      // Se deep scan IA è attivo e il documento è non classificato o richiesto
      let aiExtracted = null;
      if (deepAIScan && aiScansCount < maxAIFiles && (!docRec || docRec.id === "ALTRO" || docRec.name === "Altro" || docRec.name === "Altro Documento" || /scansione|allegato|img|doc|nuovo/i.test(fName))) {
        try {
          if (typeof DocumentIntelligence !== "undefined" && DocumentIntelligence.isAvailable()) {
            const aiRes = DocumentIntelligence.analyzeBlobs([item.file.getBlob()]);
            if (aiRes && aiRes.success && aiRes.data) {
              aiExtracted = aiRes.data;
              aiScansCount++;
              if (aiExtracted.tipoDocumento && aiExtracted.tipoDocumento !== "Altro" && aiExtracted.tipoDocumento !== "Altro Documento") {
                const fromAI = (typeof findDocumentType === "function") ? findDocumentType(aiExtracted.tipoDocumento) : null;
                if (fromAI && fromAI.id !== "ALTRO") {
                  docRec = fromAI;
                }
              }
            }
          }
        } catch (aiErr) {
          Logger.log("Errore Deep AI Scan file " + fName + ": " + aiErr.message);
        }
      }

      // Determina se il documento è sconosciuto / generico non classificato
      const isDocUnknown = !docRec || docRec.id === "ALTRO" || docRec.name === "Altro" || docRec.name === "Altro Documento";

      // Identifica l'appartenenza a un membro specifico
      let targetMem = null;
      if (aiExtracted && aiExtracted.datiPersona && aiExtracted.datiPersona.codiceFiscale) {
        targetMem = members.find(m => (m.cf || "").toUpperCase().trim() === aiExtracted.datiPersona.codiceFiscale.toUpperCase().trim());
      }
      if (!targetMem && item.memberCF) {
        targetMem = members.find(m => (m.cf || "").toUpperCase().trim() === item.memberCF);
      }
      if (!targetMem) {
        for (let m = 0; m < members.length; m++) {
          const mem = members[m];
          const n = (mem.name || mem.nome || "").toLowerCase().trim();
          const c = (mem.surname || mem.cognome || "").toLowerCase().trim();
          const cf = (mem.cf || "").toLowerCase().trim();
          const lowerFName = fName.toLowerCase();
          if ((n && c && lowerFName.includes(n) && lowerFName.includes(c)) || (cf && lowerFName.includes(cf))) {
            targetMem = mem;
            break;
          }
        }
      }

      const assignedMem = targetMem || (members.length === 1 ? members[0] : intestatario);
      const assignedMemName = assignedMem ? `${assignedMem.name || assignedMem.nome || ""} ${assignedMem.surname || assignedMem.cognome || ""}`.trim() : "";
      const assignedMemCF = assignedMem ? (assignedMem.cf || "").toUpperCase() : "";

      // 8a. Controllo file fuori posto (MISPLACED_FILE)
      const docScope = (isDocUnknown || !docRec) ? "entrambi" : (docRec.scope || "persona");
      let isMisplaced = false;
      let targetFolderId = "";
      let targetFolderName = "";
      let moveReason = "";

      if (docScope === "persona") {
        const destFolderInfo = memberFolderMap[assignedMemCF];
        if (item.isRoot && destFolderInfo) {
          isMisplaced = true;
          targetFolderId = destFolderInfo.folderId;
          targetFolderName = destFolderInfo.folderName;
          moveReason = `Documento personale trovato nella radice del nucleo; deve risiedere nella cartella di '${assignedMemName}'.`;
        } else if (!item.isRoot && item.memberCF && assignedMemCF && item.memberCF !== assignedMemCF) {
          const correctFolder = memberFolderMap[assignedMemCF];
          if (correctFolder) {
            isMisplaced = true;
            targetFolderId = correctFolder.folderId;
            targetFolderName = correctFolder.folderName;
            moveReason = `Documento di '${assignedMemName}' archiviato per errore nella cartella di un altro componente.`;
          }
        }
      } else if (docScope === "nucleo") {
        if (!item.isRoot) {
          isMisplaced = true;
          targetFolderId = folderId;
          targetFolderName = folder.getName();
          moveReason = `Documento di pertinenza del nucleo ('${docRec ? docRec.name : fName}') archiviato nella cartella di un componente anziché nella radice del nucleo.`;
        }
      }

      if (isMisplaced) {
        issues.push({
          type: "MISPLACED_FILE",
          severity: "warning",
          fileId: fId,
          fileName: fName,
          folderId: item.folderId,
          currentName: item.folderName,
          targetFolderId: targetFolderId,
          targetFolderName: targetFolderName,
          targetMemberCF: assignedMemCF,
          targetMemberName: assignedMemName,
          message: moveReason,
          extra: { fileId: fId, targetFolderId: targetFolderId, targetFolderName: targetFolderName }
        });
      }

      // 8b. Controllo ridenominazione standard (NON_STANDARD_FILENAME)
      // REQUISITO: Se non sappiamo con certezza che tipo di documento sia (documento sconosciuto / ALTRO / "Altro Documento"),
      // NON dobbiamo rinominarlo in "Altro Documento - ...", ma lasciarlo esattamente com'è con il suo nome originale.
      let expectedFileName = fName;

      if (!isDocUnknown && typeof buildDocumentFileName === "function") {
        const extMatch = fName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : "pdf";
        const docOpt = {
          tipo: docRec.name,
          dataScadenza: (aiExtracted && aiExtracted.datiDocumento && aiExtracted.datiDocumento.dataScadenza) || (trackedDoc && trackedDoc.dataScadenza) || "",
          originalName: fName
        };
        expectedFileName = buildDocumentFileName(
          docOpt,
          docScope === "nucleo" ? (intestatarioNome ? `Nucleo ${intestatarioNome}` : "") : assignedMemName,
          ext
        );
      }

      if (expectedFileName && expectedFileName !== fName) {
        issues.push({
          type: "NON_STANDARD_FILENAME",
          severity: "info",
          fileId: fId,
          fileName: fName,
          currentName: fName,
          suggestedNewName: expectedFileName,
          targetMemberCF: assignedMemCF,
          targetMemberName: assignedMemName,
          message: `Nome file non conforme agli standard: '${fName}' -> Suggerito: '${expectedFileName}'.`,
          extra: { fileId: fId, suggestedNewName: expectedFileName }
        });
      }

      // 8c. Controllo registrazione nel foglio 'Documenti' (UNTRACKED_FILE)
      if (!trackedDriveIds.has(fId)) {
        const untrackedItem = {
          fileId: fId,
          fileName: fName,
          folderName: item.folderName,
          suggestedData: {
            intestatario: assignedMemCF || (intestatario ? intestatario.cf : ""),
            tipo: docRec ? docRec.name : "Altro",
            categoria: docRec ? docRec.categoria : "Altro",
            valore: (aiExtracted && (aiExtracted.valoreISEE || (aiExtracted.datiDocumento && aiExtracted.datiDocumento.valore))) || null,
            dataScadenza: (aiExtracted && aiExtracted.datiDocumento && aiExtracted.datiDocumento.dataScadenza) || "",
            dataEmissione: (aiExtracted && aiExtracted.datiDocumento && aiExtracted.datiDocumento.dataEmissione) || "",
            idDrive: fId,
            note: "Censito da riconciliazione Drive"
          }
        };
        untrackedList.push(untrackedItem);
        issues.push({
          type: "UNTRACKED_FILE",
          severity: "info",
          fileId: fId,
          fileName: fName,
          message: `Il file '${fName}' non è ancora registrato nel foglio 'Documenti'.`,
          extra: Object.assign({}, untrackedItem)
        });
      }

      // 8d. Riconciliazione Anagrafica da dati estratti con IA (ANAGRAFICA_DIFF)
      if (aiExtracted && assignedMem) {
        const p = aiExtracted.datiPersona || {};

        // Confronto Codice Fiscale
        if (p.codiceFiscale && p.codiceFiscale.length === 16) {
          const currentCF = (assignedMem.cf || "").toUpperCase().trim();
          if (currentCF !== p.codiceFiscale) {
            const diff = {
              entityType: "BENEFICIARIO",
              entityId: currentCF || p.codiceFiscale,
              entityLabel: `${assignedMemName} (${currentCF})`,
              fieldName: "cf",
              fieldLabel: "Codice Fiscale",
              currentValue: currentCF,
              extractedValue: p.codiceFiscale,
              suggestedValue: p.codiceFiscale,
              sourceDocName: fName,
              sourceDocFileId: fId
            };
            diffList.push(diff);
            issues.push({
              type: "ANAGRAFICA_DIFF",
              severity: "warning",
              message: `Discrepanza Codice Fiscale per ${assignedMemName}: nel foglio '${currentCF}', nel documento '${p.codiceFiscale}'.`,
              extra: diff
            });
          }
        }

        // Confronto Luogo di Nascita
        if (p.luogoNascita) {
          const currentLuogo = (assignedMem.luogoNascita || "").trim();
          const normLuogo = (typeof normalizeCity === "function") ? normalizeCity(p.luogoNascita) : p.luogoNascita;
          if (currentLuogo.toLowerCase() !== normLuogo.toLowerCase()) {
            const diff = {
              entityType: "BENEFICIARIO",
              entityId: assignedMem.cf,
              entityLabel: `${assignedMemName} (${assignedMem.cf})`,
              fieldName: "luogoNascita",
              fieldLabel: "Luogo di Nascita",
              currentValue: currentLuogo,
              extractedValue: p.luogoNascita,
              suggestedValue: normLuogo,
              sourceDocName: fName,
              sourceDocFileId: fId
            };
            diffList.push(diff);
            issues.push({
              type: "ANAGRAFICA_DIFF",
              severity: "info",
              message: `Aggiornamento Luogo di Nascita per ${assignedMemName}: da '${currentLuogo || "(vuoto)"}' a '${normLuogo}'.`,
              extra: diff
            });
          }
        }

        // Confronto Residenza
        if (p.residenza && (!assignedMem.residenza || assignedMem.residenza.length < 5)) {
          const normRes = (typeof normalizeAddress === "function") ? normalizeAddress(p.residenza) : p.residenza;
          const diff = {
            entityType: "BENEFICIARIO",
            entityId: assignedMem.cf,
            entityLabel: `${assignedMemName} (${assignedMem.cf})`,
            fieldName: "residenza",
            fieldLabel: "Residenza",
            currentValue: assignedMem.residenza || "",
            extractedValue: p.residenza,
            suggestedValue: normRes,
            sourceDocName: fName,
            sourceDocFileId: fId
          };
          diffList.push(diff);
          issues.push({
            type: "ANAGRAFICA_DIFF",
            severity: "info",
            message: `Proposta residenza per ${assignedMemName}: '${normRes}' (da ${fName}).`,
            extra: diff
          });
        }

        // Confronto Valore ISEE per il Nucleo
        if (aiExtracted.valoreISEE !== null && aiExtracted.valoreISEE !== undefined && nucleoObj) {
          const currentISEE = (nucleoObj.isee !== null && nucleoObj.isee !== undefined) ? Number(nucleoObj.isee) : null;
          const extractedISEE = Number(aiExtracted.valoreISEE);
          if (currentISEE === null || Math.abs(currentISEE - extractedISEE) > 0.01) {
            const diff = {
              entityType: "NUCLEO",
              entityId: idStr,
              entityLabel: `Nucleo #${idStr} (${intestatarioNome})`,
              fieldName: "isee",
              fieldLabel: "Valore ISEE (€)",
              currentValue: currentISEE !== null ? `${currentISEE.toFixed(2)} €` : "(non censito)",
              extractedValue: `${extractedISEE.toFixed(2)} €`,
              suggestedValue: extractedISEE,
              sourceDocName: fName,
              sourceDocFileId: fId
            };
            diffList.push(diff);
            issues.push({
              type: "ANAGRAFICA_DIFF",
              severity: "warning",
              message: `Valore ISEE disallineato per Nucleo #${idStr}: nel foglio '${currentISEE || "(vuoto)"}', nell'attestazione '${extractedISEE.toFixed(2)} €'.`,
              extra: diff
            });
          }
        }
      }
    }

    // 8e. Rilevamento documenti frammentati (Fronte e Retro separati per tessere a due facce)
    const memberFilesMap = {};
    for (let fIdx = 0; fIdx < allScannedFiles.length; fIdx++) {
      const item = allScannedFiles[fIdx];
      const mCF = item.memberCF || (members.length === 1 ? (members[0].cf || "").toUpperCase() : "");
      if (mCF) {
        if (!memberFilesMap[mCF]) memberFilesMap[mCF] = [];
        memberFilesMap[mCF].push(item);
      }
    }

    const cardTypes = ["CARTA_IDENTITA", "TESSERA_SANITARIA", "PATENTE", "PERMESSO_SOGGIORNO"];
    const isFront = (name) => /\b(fronte|front|lato[_\s-]?1|recto|f\.)\b/i.test(name) || /_fronte|_front/i.test(name);
    const isBack = (name) => /\b(retro|back|lato[_\s-]?2|verso|r\.)\b/i.test(name) || /_retro|_back/i.test(name);

    for (const [mCF, mFiles] of Object.entries(memberFilesMap)) {
      const targetMem = members.find(m => (m.cf || "").toUpperCase().trim() === mCF);
      const mName = targetMem ? `${targetMem.name || targetMem.nome || ""} ${targetMem.surname || targetMem.cognome || ""}`.trim() : mCF;

      for (let c = 0; c < cardTypes.length; c++) {
        const cType = cardTypes[c];
        const matchingFiles = mFiles.filter(f => {
          const docRec = (typeof findDocumentType === "function") ? findDocumentType(f.fileName) : null;
          return docRec && docRec.id === cType;
        });

        const frontFile = matchingFiles.find(f => isFront(f.fileName));
        const backFile = matchingFiles.find(f => isBack(f.fileName));

        if (frontFile && backFile && frontFile.fileId !== backFile.fileId) {
          const docRec = (typeof findDocumentType === "function") ? findDocumentType(frontFile.fileName) : null;
          const tipoLabel = docRec ? docRec.name : "Documento di Riconoscimento";
          issues.push({
            type: "FRAGMENTED_DOCUMENT",
            severity: "warning",
            fileId: frontFile.fileId,
            fileName: frontFile.fileName,
            targetMemberCF: mCF,
            targetMemberName: mName,
            message: `Documento frammentato: '${frontFile.fileName}' e '${backFile.fileName}' contengono fronte e retro separati per ${mName}. Si consiglia l'unione su pagina singola (🟢 OTTIMALE).`,
            extra: {
              frontFileId: frontFile.fileId,
              frontFileName: frontFile.fileName,
              backFileId: backFile.fileId,
              backFileName: backFile.fileName,
              targetMemberCF: mCF,
              targetMemberName: mName,
              tipoDocumento: tipoLabel
            }
          });
        }
      }
    }

    // 9. Individuazione righe orfane nel foglio 'Documenti' (file eliminati o inaccessibili su Drive)
    const memberCFSet = new Set(members.map(m => (m.cf || "").toUpperCase().trim()).filter(Boolean));
    const nucleoSheetDocs = existingTrackedDocs.filter(d => memberCFSet.has((d.intestatario || "").toUpperCase().trim()));

    for (let d = 0; d < nucleoSheetDocs.length; d++) {
      const sheetDoc = nucleoSheetDocs[d];
      if (sheetDoc.idDrive) {
        let isOrphan = false;
        try {
          const driveFile = DriveApp.getFileById(sheetDoc.idDrive);
          if (!driveFile || driveFile.isTrashed()) {
            isOrphan = true;
          }
        } catch (eDrive) {
          isOrphan = true;
        }

        if (isOrphan) {
          const orphanItem = {
            docId: sheetDoc.id,
            idDrive: sheetDoc.idDrive,
            intestatario: sheetDoc.intestatario,
            tipo: sheetDoc.tipo,
            categoria: sheetDoc.categoria
          };
          orphanList.push(orphanItem);
          issues.push({
            type: "ORPHAN_SHEET_ROW",
            severity: "danger",
            fileId: sheetDoc.idDrive,
            message: `Riga orfana nel foglio Documenti (ID ${sheetDoc.id}, ${sheetDoc.tipo}): il file Drive collegato è inesistente o nel cestino.`,
            extra: Object.assign({}, orphanItem)
          });
        }
      }
    }

    // 10. Verifica scadenze documenti per i membri di questo nucleo
    let expiredDocsCount = 0;
    for (let d = 0; d < nucleoSheetDocs.length; d++) {
      const sDoc = nucleoSheetDocs[d];
      if (typeof sDoc.getStatoScadenza === "function") {
        const stato = sDoc.getStatoScadenza();
        if (stato === "SCADUTO") {
          expiredDocsCount++;
          issues.push({
            type: "EXPIRED_DOCUMENT",
            severity: "danger",
            targetMemberCF: sDoc.intestatario,
            message: `Documento '${sDoc.tipo}' (${sDoc.intestatario}) è SCADUTO (scad. ${sDoc.dataScadenza}).`
          });
        } else if (stato === "IN_SCADENZA") {
          issues.push({
            type: "EXPIRED_DOCUMENT",
            severity: "warning",
            targetMemberCF: sDoc.intestatario,
            message: `Documento '${sDoc.tipo}' (${sDoc.intestatario}) è in scadenza (${sDoc.getGiorniAllaScadenza()} gg rimasti).`
          });
        }
      }
    }

    // 11. Calcolo status complessivo
    let overallStatus = "HEALTHY";
    if (issues.some(i => i.severity === "danger")) {
      overallStatus = "CRITICAL";
    } else if (issues.length > 0) {
      overallStatus = "WARNING";
    }

    const reportMembers = members.map(m => {
      const memCF = (m.cf || "").toUpperCase().trim();
      const fInfo = memberFolderMap[memCF] || { folderId: "", folderName: "" };
      return {
        id: m.id || "",
        name: `${m.name || m.nome || ""} ${m.surname || m.cognome || ""}`.trim(),
        cf: memCF,
        folderId: fInfo.folderId,
        folderName: fInfo.folderName
      };
    });

    const reportObj = {
      nucleoId: idStr,
      intestatario: intestatarioNome,
      folderId: folderId,
      folderUrl: folderUrl,
      status: overallStatus,
      hasIssues: issues.length > 0,
      issues: issues,
      stats: {
        totalFiles: allScannedFiles.length,
        misplacedFiles: issues.filter(i => i.type === "MISPLACED_FILE").length,
        missingFolders: missingFoldersCount,
        untrackedFiles: untrackedList.length,
        duplicateFiles: duplicateGroups.length,
        nonStandardNames: issues.filter(i => i.type === "NON_STANDARD_FILENAME").length,
        folderMismatches: issues.filter(i => i.type === "FOLDER_NAME_MISMATCH").length,
        orphanRows: orphanList.length,
        anagraficaDiffs: diffList.length,
        expiredDocs: expiredDocsCount,
        fragmentedDocs: issues.filter(i => i.type === "FRAGMENTED_DOCUMENT").length
      },
      members: reportMembers,
      duplicateGroups: duplicateGroups,
      untrackedList: untrackedList,
      orphanList: orphanList,
      diffList: diffList
    };

    return JSON.parse(JSON.stringify(reportObj));
  }

  /**
   * Esegue l'ispezione on-demand di un singolo file su Drive tramite Google Gemini Flash.
   * Utilizzato dal frontend quando l'utente clicca 'Ispeziona con IA' su un file specifico.
   * 
   * @param {string} fileId - ID del file Google Drive da analizzare.
   * @return {{ success: boolean; data?: any; message?: string }}
   */
  static inspectFileWithAI(fileId) {
    try {
      if (!fileId) return { success: false, message: "ID file non specificato." };
      if (typeof DocumentIntelligence === "undefined" || !DocumentIntelligence.isAvailable()) {
        return { success: false, message: "Servizio Google Gemini Flash non configurato o chiave API assente." };
      }

      const file = DriveApp.getFileById(fileId);
      if (!file || file.isTrashed()) {
        return { success: false, message: "File non accessibile o eliminato su Google Drive." };
      }

      const blob = file.getBlob();
      const result = DocumentIntelligence.analyzeBlobs([blob]);
      return result;
    } catch (e) {
      Logger.log("DriveReconciler.inspectFileWithAI errore: " + e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * Esegue il piano di riconciliazione approvato dall'operatore.
   * Applica in modo granulare e controllato le sole azioni selezionate nel frontend.
   * 
   * @param {string|number} nucleoId - Identificativo del nucleo familiare.
   * @param {Object} approvedPlan - Il piano di azioni selezionate dall'utente.
   * @param {Array<{ folderId: string; newName: string }>} [approvedPlan.folderRenames]
   * @param {Array<{ fileId: string; newName: string }>} [approvedPlan.fileRenames]
   * @param {Array<{ fileId: string; targetFolderId: string }>} [approvedPlan.fileMoves]
   * @param {Array<{ fileId: string; action: "trash"|"keep"|"archive"; archiveFolderId?: string }>} [approvedPlan.duplicates]
   * @param {Array<any>} [approvedPlan.documentRegistrations]
   * @param {Array<{ docId?: number|string; idDrive?: string }>} [approvedPlan.orphanDeletions]
   * @param {Array<{ entityType: "BENEFICIARIO"|"NUCLEO"; entityId: string; updates: Record<string, any> }>} [approvedPlan.anagraficaUpdates]
   * @param {Array<{ targetMemberCF: string }>} [approvedPlan.missingFolderCreations]
   * @return {{ success: boolean; actionsApplied: string[]; errors: string[] }}
   */
  static executeApprovedPlan(nucleoId, approvedPlan = {}) {
    const actions = [];
    const errors = [];
    const idStr = String(nucleoId).trim();

    try {
      // 1. Creazione cartelle personali mancanti
      const folderCreations = approvedPlan.missingFolderCreations || [];
      for (let c = 0; c < folderCreations.length; c++) {
        const item = folderCreations[c];
        try {
          if (item.targetMemberCF) {
            const fInfo = DriveManager.getOrCreateBeneficiarioFolder(item.targetMemberCF);
            actions.push(`Creata/verificata sottocartella per CF ${item.targetMemberCF} ('${fInfo.name}').`);
          }
        } catch (eC) {
          errors.push(`Errore creazione cartella CF ${item.targetMemberCF}: ${eC.message}`);
        }
      }

      // 2. Ridenominazione cartelle
      const folderRenames = approvedPlan.folderRenames || [];
      for (let r = 0; r < folderRenames.length; r++) {
        const item = folderRenames[r];
        try {
          if (item.folderId && item.newName) {
            const f = DriveApp.getFolderById(item.folderId);
            const oldName = f.getName();
            if (oldName !== item.newName) {
              f.setName(item.newName);
              actions.push(`Cartella rinominata: '${oldName}' -> '${item.newName}'.`);
            }
          }
        } catch (eR) {
          errors.push(`Errore ridenominazione cartella ID ${item.folderId}: ${eR.message}`);
        }
      }

      // 3. Spostamento file fuori posto
      const fileMoves = approvedPlan.fileMoves || [];
      for (let m = 0; m < fileMoves.length; m++) {
        const item = fileMoves[m];
        try {
          if (item.fileId && item.targetFolderId) {
            const file = DriveApp.getFileById(item.fileId);
            const targetFolder = DriveApp.getFolderById(item.targetFolderId);
            if (typeof file.moveTo === "function") {
              file.moveTo(targetFolder);
            } else {
              targetFolder.addFile(file);
              const parents = file.getParents();
              while (parents.hasNext()) {
                parents.next().removeFile(file);
              }
            }
            actions.push(`File '${file.getName()}' spostato in cartella '${targetFolder.getName()}'.`);
          }
        } catch (eM) {
          errors.push(`Errore spostamento file ID ${item.fileId}: ${eM.message}`);
        }
      }

      // 4. Ridenominazione file standard
      const fileRenames = approvedPlan.fileRenames || [];
      for (let fr = 0; fr < fileRenames.length; fr++) {
        const item = fileRenames[fr];
        try {
          if (item.fileId && item.newName) {
            const file = DriveApp.getFileById(item.fileId);
            const oldName = file.getName();
            if (oldName !== item.newName) {
              file.setName(item.newName);
              actions.push(`File rinominato: '${oldName}' -> '${item.newName}'.`);
            }
          }
        } catch (eFR) {
          errors.push(`Errore ridenominazione file ID ${item.fileId}: ${eFR.message}`);
        }
      }

      // 5. Gestione duplicati (cestina, archivia, mantieni)
      const duplicates = approvedPlan.duplicates || [];
      for (let d = 0; d < duplicates.length; d++) {
        const item = duplicates[d];
        try {
          if (item.fileId) {
            const file = DriveApp.getFileById(item.fileId);
            if (item.action === "trash") {
              file.setTrashed(true);
              if (typeof DocumentoRepository !== "undefined") {
                DocumentoRepository.removeByDriveId(item.fileId);
              }
              actions.push(`File duplicato '${file.getName()}' spostato nel cestino di Google Drive.`);
            } else if (item.action === "archive") {
              // Sposta in sottocartella _Archivio del nucleo
              const nucleoFolderInfo = DriveManager.getOrCreateNucleoFolder(idStr);
              const nucFolder = DriveApp.getFolderById(nucleoFolderInfo.id);
              let archiveFolder = null;
              const subIter = nucFolder.getFolders();
              while (subIter.hasNext()) {
                const sf = subIter.next();
                if (sf.getName().toLowerCase() === "_archivio") {
                  archiveFolder = sf;
                  break;
                }
              }
              if (!archiveFolder) {
                archiveFolder = nucFolder.createFolder("_Archivio");
              }
              file.moveTo(archiveFolder);
              actions.push(`File duplicato '${file.getName()}' archiviato nella cartella '_Archivio'.`);
            }
          }
        } catch (eD) {
          errors.push(`Errore gestione duplicato ID ${item.fileId}: ${eD.message}`);
        }
      }

      // 6. Censimento nuovi documenti nel foglio 'Documenti'
      const registrations = approvedPlan.documentRegistrations || [];
      for (let reg = 0; reg < registrations.length; reg++) {
        const item = registrations[reg];
        try {
          if (typeof DocumentoRepository !== "undefined" && item.idDrive && item.intestatario) {
            const addRes = DocumentoRepository.add({
              intestatario: item.intestatario,
              tipo: item.tipo || "Altro",
              categoria: item.categoria || "Altro",
              valore: item.valore,
              dataScadenza: item.dataScadenza,
              dataEmissione: item.dataEmissione,
              idDrive: item.idDrive,
              note: item.note || "Censito da riconciliazione Drive"
            });
            if (addRes && addRes.success) {
              actions.push(`Registrato documento '${item.tipo}' (${item.intestatario}) nel foglio 'Documenti'.`);
            } else {
              errors.push(`Errore censimento documento ID Drive ${item.idDrive}: ${addRes.message}`);
            }
          }
        } catch (eReg) {
          errors.push(`Errore registrazione documento: ${eReg.message}`);
        }
      }

      // 7. Cancellazione righe orfane dal foglio 'Documenti'
      const orphanDeletions = approvedPlan.orphanDeletions || [];
      for (let od = 0; od < orphanDeletions.length; od++) {
        const item = orphanDeletions[od];
        try {
          if (typeof DocumentoRepository !== "undefined") {
            if (item.docId) {
              DocumentoRepository.removeById(item.docId);
              actions.push(`Rimossa riga orfana ID ${item.docId} dal foglio 'Documenti'.`);
            } else if (item.idDrive) {
              DocumentoRepository.removeByDriveId(item.idDrive);
              actions.push(`Rimossa riga orfana per ID Drive ${item.idDrive} dal foglio 'Documenti'.`);
            }
          }
        } catch (eOD) {
          errors.push(`Errore eliminazione riga orfana: ${eOD.message}`);
        }
      }

      // 8. Allineamento dati anagrafici (Beneficiari / Nucleo)
      const anagraficaUpdates = approvedPlan.anagraficaUpdates || [];
      for (let au = 0; au < anagraficaUpdates.length; au++) {
        const item = anagraficaUpdates[au];
        try {
          if (item.entityType === "BENEFICIARIO" && item.entityId && item.updates) {
            if (typeof BeneficiarioRepository !== "undefined") {
              BeneficiarioRepository.updateDriveInfo(item.entityId, item.updates);
              actions.push(`Aggiornati dati anagrafici beneficiario CF ${item.entityId} (${Object.keys(item.updates).join(", ")}).`);
            }
          } else if (item.entityType === "NUCLEO" && item.entityId && item.updates) {
            if (typeof NucleoFamiliare !== "undefined") {
              NucleoFamiliare.updateDriveInfo(item.entityId, item.updates);
              actions.push(`Aggiornati dati anagrafici Nucleo #${item.entityId} (${Object.keys(item.updates).join(", ")}).`);
            }
          }
        } catch (eAU) {
          errors.push(`Errore aggiornamento anagrafica ${item.entityType} ${item.entityId}: ${eAU.message}`);
        }
      }

      // 9. Unione documenti frammentati approvati
      const mergedDocs = approvedPlan.mergedDocuments || [];
      for (let md = 0; md < mergedDocs.length; md++) {
        const item = mergedDocs[md];
        try {
          if (item.targetMemberCF && item.tipoDocumento && item.base64Data && typeof DriveManager !== "undefined") {
            const mRes = DriveManager.saveMergedDocument(
              item.targetMemberCF,
              item.tipoDocumento,
              item.base64Data,
              item.oldFileIds || [],
              item.metadata || {}
            );
            if (mRes && mRes.success) {
              actions.push(`Documento unificato '${mRes.fileName}' registrato con successo (qualità 🟢 OTTIMALE).`);
            } else {
              errors.push(`Errore unione documento per CF ${item.targetMemberCF}: ${mRes.message}`);
            }
          }
        } catch (eMD) {
          errors.push(`Errore unione documento: ${eMD.message}`);
        }
      }

      try {
        SpreadsheetApp.flush();
      } catch (fErr) {}

      return {
        success: errors.length === 0,
        actionsApplied: actions,
        errors: errors
      };

    } catch (eTotal) {
      Logger.log("DriveReconciler.executeApprovedPlan errore fatale: " + eTotal.message);
      return {
        success: false,
        actionsApplied: actions,
        errors: [...errors, eTotal.message]
      };
    }
  }

  /**
   * Wrapper di retrocompatibilità: esegue l'audit e applica automaticamente le azioni consigliate di base.
   * Se viene passato un piano esplicito in options.approvedPlan, invoca executeApprovedPlan.
   * 
   * @param {string|number} nucleoId - Identificativo del nucleo.
   * @param {Object} [options] - Opzioni o piano approvato.
   * @return {{ success: boolean; actionsApplied: string[]; errors: string[] }}
   */
  static reconcileNucleo(nucleoId, options = {}) {
    if (options && options.approvedPlan) {
      return DriveReconciler.executeApprovedPlan(nucleoId, options.approvedPlan);
    }

    // Default fast-reconcile
    const audit = DriveReconciler.auditNucleo(nucleoId, options);
    if (!audit.hasIssues) {
      return {
        success: true,
        actionsApplied: ["Nessuna anomalia riscontrata: la cartella del nucleo è già conforme."],
        errors: []
      };
    }

    const defaultPlan = {
      missingFolderCreations: audit.issues.filter(i => i.type === "MISSING_MEMBER_FOLDER").map(i => ({ targetMemberCF: i.targetMemberCF })),
      folderRenames: audit.issues.filter(i => i.type === "FOLDER_NAME_MISMATCH").map(i => ({ folderId: i.folderId, newName: i.suggestedNewName })),
      fileMoves: audit.issues.filter(i => i.type === "MISPLACED_FILE").map(i => ({ fileId: i.fileId, targetFolderId: i.targetFolderId })),
      fileRenames: audit.issues.filter(i => i.type === "NON_STANDARD_FILENAME").map(i => ({ fileId: i.fileId, newName: i.suggestedNewName })),
      documentRegistrations: audit.untrackedList.map(u => u.suggestedData)
    };

    return DriveReconciler.executeApprovedPlan(nucleoId, defaultPlan);
  }

  /**
   * Esegue l'audit diagnostico sintetico su tutti i nuclei familiari censiti nell'archivio.
   * @return {{
   *   totalNuclei: number;
   *   healthyNuclei: number;
   *   warningNuclei: number;
   *   criticalNuclei: number;
   *   reports: NucleoAuditReport[];
   * }}
   */
  static auditArchive() {
    const allNuclei = (typeof NucleoFamiliare !== "undefined" && typeof NucleoFamiliare.getAll === "function") 
      ? NucleoFamiliare.getAll() 
      : [];
    
    const reports = [];
    let healthy = 0;
    let warning = 0;
    let critical = 0;

    for (let n = 0; n < allNuclei.length; n++) {
      const nuc = allNuclei[n];
      if (!nuc.id) continue;
      try {
        const rep = DriveReconciler.auditNucleo(nuc.id, { deepAIScan: false });
        reports.push(rep);
        if (rep.status === "HEALTHY") healthy++;
        else if (rep.status === "WARNING") warning++;
        else if (rep.status === "CRITICAL") critical++;
      } catch (e) {
        critical++;
      }
    }

    return {
      totalNuclei: allNuclei.length,
      healthyNuclei: healthy,
      warningNuclei: warning,
      criticalNuclei: critical,
      reports: reports
    };
  }
}
