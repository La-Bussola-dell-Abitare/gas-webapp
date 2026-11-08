/**
 * @file DriveReconciler.js
 * @description Motore di audit, diagnostica e riconciliazione automatica tra Google Drive e Fogli Google.
 * Risolve il disallineamento derivante da caricamenti manuali non presidiati:
 * individua cartelle mancanti dei componenti, file personali finiti nella radice del nucleo,
 * file con nomi non conformi e documenti non censiti nel foglio 'Documenti',
 * eseguendo la bonifica automatica (creazione cartelle, spostamento, ridenominazione standard e registrazione).
 * @module Service/GDrive/DriveReconciler
 */

/**
 * @typedef {Object} ReconcileIssue
 * @property {"MISPLACED_FILE" | "MISSING_MEMBER_FOLDER" | "NON_STANDARD_FILENAME" | "UNTRACKED_FILE" | "EXPIRED_DOCUMENT"} type
 * @property {"warning" | "danger" | "info"} severity
 * @property {string} message
 * @property {string} [fileId]
 * @property {string} [fileName]
 * @property {string} [targetMemberCF]
 * @property {string} [targetMemberName]
 * @property {string} [suggestedNewName]
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
 * @property {{ totalFiles: number; misplacedFiles: number; missingFolders: number; untrackedFiles: number; expiredDocs: number }} stats
 */

/**
 * Motore per la bonifica e riconciliazione del file system Google Drive.
 */
class DriveReconciler {
  /**
   * Esegue l'audit diagnostico completo per un singolo nucleo familiare.
   * 
   * @param {string|number} nucleoId - Identificativo del nucleo familiare.
   * @return {NucleoAuditReport}
   */
  static auditNucleo(nucleoId) {
    const idStr = String(nucleoId).trim();
    const issues = [];
    let folder = null;
    let folderUrl = "";
    let folderId = "";

    // 1. Recupera i dati del nucleo e dei relativi componenti
    const allBeneficiari = (typeof BeneficiarioRepository !== "undefined") ? BeneficiarioRepository.getAll() : [];
    const members = allBeneficiari.filter(b => String(b.idNucleo).trim() === idStr);
    const intestatario = members.find(b => (b.rapportoIntestatario || "").toLowerCase() === "intestatario") || members[0];
    const intestatarioNome = intestatario ? `${intestatario.name || intestatario.nome || ""} ${intestatario.surname || intestatario.cognome || ""}`.trim() : "";

    // 2. Localizza la cartella del nucleo su Drive
    try {
      const folderInfo = DriveManager.getOrCreateNucleoFolder(idStr, intestatarioNome);
      folderId = folderInfo.id;
      folderUrl = folderInfo.url;
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      issues.push({
        type: "MISSING_MEMBER_FOLDER",
        severity: "danger",
        message: "Cartella radice del nucleo #" + idStr + " non accessibile: " + e.message
      });
      return {
        nucleoId: idStr,
        intestatario: intestatarioNome,
        folderId: "",
        folderUrl: "",
        status: "CRITICAL",
        hasIssues: true,
        issues: issues,
        stats: { totalFiles: 0, misplacedFiles: 0, missingFolders: 1, untrackedFiles: 0, expiredDocs: 0 }
      };
    }

    // 3. Mappa le sottocartelle esistenti nella cartella nucleo
    const existingSubfolders = {};
    const subfolderIter = folder.getFolders();
    while (subfolderIter.hasNext()) {
      const sf = subfolderIter.next();
      if (!sf.isTrashed()) {
        existingSubfolders[sf.getName().trim().toLowerCase()] = sf;
      }
    }

    // 4. Verifica esistenza sottocartella per ciascun componente censito
    let missingFoldersCount = 0;
    for (let m = 0; m < members.length; m++) {
      const mem = members[m];
      const memFullName = `${mem.name || mem.nome || ""} ${mem.surname || mem.cognome || ""}`.trim();
      const lowerName = memFullName.toLowerCase();

      if (!existingSubfolders[lowerName]) {
        missingFoldersCount++;
        issues.push({
          type: "MISSING_MEMBER_FOLDER",
          severity: "warning",
          targetMemberCF: mem.cf,
          targetMemberName: memFullName,
          message: `Manca la sottocartella personale per il componente '${memFullName}'.`
        });
      }
    }

    // 5. Scansiona i file situati direttamente nella cartella del nucleo (radice nucleo)
    let totalFiles = 0;
    let misplacedFilesCount = 0;
    let untrackedCount = 0;

    const rootFilesIter = folder.getFiles();
    const existingTrackedDocs = (typeof DocumentoRepository !== "undefined") ? DocumentoRepository.getAll() : [];
    const trackedDriveIds = new Set(existingTrackedDocs.map(d => d.idDrive).filter(Boolean));

    while (rootFilesIter.hasNext()) {
      const file = rootFilesIter.next();
      if (file.isTrashed()) continue;
      totalFiles++;

      const fName = file.getName();
      const fId = file.getId();
      const docRecord = (typeof findDocumentType === "function") ? findDocumentType(fName) : null;

      // Cerca se il file appartiene palesemente a uno specifico componente del nucleo
      let targetMem = null;
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

      // Se il tipo di documento è a scope persona (es. Carta Identità, Patente, Firma, PdS)
      // oppure se ha un match con un membro, è un file fuori posto nella radice
      if (targetMem || (docRecord && docRecord.scope === "persona")) {
        const memAssigned = targetMem || (members.length === 1 ? members[0] : intestatario);
        const memAssignedName = memAssigned ? `${memAssigned.name || memAssigned.nome || ""} ${memAssigned.surname || memAssigned.cognome || ""}`.trim() : "";
        const memAssignedCF = memAssigned ? memAssigned.cf : "";

        misplacedFilesCount++;
        issues.push({
          type: "MISPLACED_FILE",
          severity: "warning",
          fileId: fId,
          fileName: fName,
          targetMemberCF: memAssignedCF,
          targetMemberName: memAssignedName,
          message: `Il file '${fName}' si trova nella radice del nucleo invece che nella cartella di '${memAssignedName}'.`
        });
      }

      // Verifica se il file è tracciato nel foglio 'Documenti'
      if (!trackedDriveIds.has(fId)) {
        untrackedCount++;
        issues.push({
          type: "UNTRACKED_FILE",
          severity: "info",
          fileId: fId,
          fileName: fName,
          message: `Il file '${fName}' non è ancora registrato nel foglio 'Documenti'.`
        });
      }
    }

    // 6. Verifica scadenze dei documenti per i membri di questo nucleo
    let expiredCount = 0;
    for (let m = 0; m < members.length; m++) {
      const mem = members[m];
      const memDocs = existingTrackedDocs.filter(d => d.intestatario === (mem.cf || "").toUpperCase());
      for (let d = 0; d < memDocs.length; d++) {
        const doc = memDocs[d];
        const stato = doc.getStatoScadenza();
        if (stato === "SCADUTO") {
          expiredCount++;
          issues.push({
            type: "EXPIRED_DOCUMENT",
            severity: "danger",
            targetMemberCF: mem.cf,
            targetMemberName: `${mem.name || mem.nome || ""} ${mem.surname || mem.cognome || ""}`.trim(),
            message: `Documento '${doc.tipo}' di ${mem.name || mem.nome} è SCADUTO (scad. ${doc.dataScadenza}).`
          });
        } else if (stato === "IN_SCADENZA") {
          issues.push({
            type: "EXPIRED_DOCUMENT",
            severity: "warning",
            targetMemberCF: mem.cf,
            targetMemberName: `${mem.name || mem.nome || ""} ${mem.surname || mem.cognome || ""}`.trim(),
            message: `Documento '${doc.tipo}' di ${mem.name || mem.nome} è in scadenza (${doc.getGiorniAllaScadenza()} gg rimasti).`
          });
        }
      }
    }

    // 7. Calcola status complessivo
    let overallStatus = "HEALTHY";
    if (issues.some(i => i.severity === "danger")) {
      overallStatus = "CRITICAL";
    } else if (issues.length > 0) {
      overallStatus = "WARNING";
    }

    return {
      nucleoId: idStr,
      intestatario: intestatarioNome,
      folderId: folderId,
      folderUrl: folderUrl,
      status: overallStatus,
      hasIssues: issues.length > 0,
      issues: issues,
      stats: {
        totalFiles: totalFiles,
        misplacedFiles: misplacedFilesCount,
        missingFolders: missingFoldersCount,
        untrackedFiles: untrackedCount,
        expiredDocs: expiredCount
      }
    };
  }

  /**
   * Esegue la bonifica e riconciliazione automatica per un nucleo familiare.
   * Risolve:
   * - Creazione cartelle mancanti
   * - Spostamento file sparsi dalla radice alle cartelle personali dei membri
   * - Normalizzazione del nome file con la convenzione ufficiale (buildDocumentFileName)
   * - Registrazione dei file non tracciati nel foglio 'Documenti'
   * 
   * @param {string|number} nucleoId - Identificativo del nucleo.
   * @param {Object} [options] - Opzioni opzionali (es. useAI: boolean).
   * @return {{ success: boolean; actionsApplied: string[]; errors: string[] }}
   */
  static reconcileNucleo(nucleoId, options = {}) {
    const idStr = String(nucleoId).trim();
    const actions = [];
    const errors = [];

    try {
      const audit = DriveReconciler.auditNucleo(idStr);
      if (!audit.hasIssues) {
        return {
          success: true,
          actionsApplied: ["Nessuna anomalia riscontrata: la cartella del nucleo è già conforme."],
          errors: []
        };
      }

      const nucleoFolder = DriveApp.getFolderById(audit.folderId);
      const allBeneficiari = BeneficiarioRepository.getAll();
      const members = allBeneficiari.filter(b => String(b.idNucleo).trim() === idStr);

      // Cache delle cartelle dei membri
      const memberFolderMap = {}; // cf -> Folder

      // 1. Risolvi MISSING_MEMBER_FOLDER
      for (let m = 0; m < members.length; m++) {
        const mem = members[m];
        try {
          const fInfo = DriveManager.getOrCreateBeneficiarioFolder(mem.cf);
          memberFolderMap[mem.cf.toUpperCase()] = DriveApp.getFolderById(fInfo.id);
          actions.push(`Cartella verificata/creata per '${mem.name || mem.nome} ${mem.surname || mem.cognome}' (${fInfo.name}).`);
        } catch (fErr) {
          errors.push(`Impossibile creare cartella per ${mem.cf}: ${fErr.message}`);
        }
      }

      // 2. Risolvi MISPLACED_FILE e UNTRACKED_FILE
      for (let i = 0; i < audit.issues.length; i++) {
        const issue = audit.issues[i];

        if (issue.type === "MISPLACED_FILE" && issue.fileId) {
          try {
            const file = DriveApp.getFileById(issue.fileId);
            const targetCF = (issue.targetMemberCF || "").toUpperCase();
            const targetFolder = memberFolderMap[targetCF] || (members[0] && memberFolderMap[members[0].cf.toUpperCase()]);

            if (!targetFolder) {
              errors.push(`Cartella di destinazione non trovata per file '${issue.fileName}'.`);
              continue;
            }

            // Sposta il file nella sottocartella personale del membro
            if (typeof file.moveTo === "function") {
              file.moveTo(targetFolder);
            } else {
              targetFolder.addFile(file);
              nucleoFolder.removeFile(file);
            }

            // Rinomina il file secondo lo standard
            const extMatch = issue.fileName.match(/\.([a-zA-Z0-9]+)$/);
            const ext = extMatch ? extMatch[1] : "pdf";
            const memObj = members.find(m => (m.cf || "").toUpperCase() === targetCF) || members[0];
            const docRec = (typeof findDocumentType === "function") ? findDocumentType(issue.fileName) : null;

            let newName = issue.fileName;
            if (typeof buildDocumentFileName === "function") {
              newName = buildDocumentFileName(
                { tipo: docRec ? docRec.name : "Documento" },
                memObj ? `${memObj.name || memObj.nome} ${memObj.surname || memObj.cognome}` : "",
                ext
              );
            }

            if (newName && newName !== issue.fileName) {
              file.setName(newName);
              actions.push(`Spostato e rinominato '${issue.fileName}' -> '${newName}' in cartella '${targetFolder.getName()}'.`);
            } else {
              actions.push(`Spostato '${issue.fileName}' in cartella '${targetFolder.getName()}'.`);
            }

            // Registra nel foglio 'Documenti' se non presente
            if (typeof DocumentoRepository !== "undefined") {
              const existingByDrive = DocumentoRepository.getAll().find(d => d.idDrive === issue.fileId);
              if (!existingByDrive) {
                DocumentoRepository.add({
                  intestatario: targetCF || (memObj && memObj.cf) || "",
                  tipo: docRec ? docRec.name : "Altro",
                  categoria: docRec ? docRec.categoria : "Altro",
                  idDrive: issue.fileId,
                  note: "Riconciliato automaticamente da radice nucleo"
                });
                actions.push(`Registrato documento '${docRec ? docRec.name : newName}' nel foglio 'Documenti'.`);
              }
            }

          } catch (mErr) {
            errors.push(`Errore spostamento file '${issue.fileName}': ${mErr.message}`);
          }
        } else if (issue.type === "UNTRACKED_FILE" && issue.fileId) {
          try {
            const docRec = (typeof findDocumentType === "function") ? findDocumentType(issue.fileName) : null;
            const intestatarioCF = (members[0] && members[0].cf) || "";

            if (typeof DocumentoRepository !== "undefined") {
              DocumentoRepository.add({
                intestatario: intestatarioCF,
                tipo: docRec ? docRec.name : "Altro",
                categoria: docRec ? docRec.categoria : "Altro",
                idDrive: issue.fileId,
                note: "Catalogato automaticamente da cartella nucleo"
              });
              actions.push(`Registrato file orfano '${issue.fileName}' nel foglio 'Documenti'.`);
            }
          } catch (uErr) {
            errors.push(`Errore tracciamento file '${issue.fileName}': ${uErr.message}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        actionsApplied: actions,
        errors: errors
      };

    } catch (e) {
      Logger.log("DriveReconciler.reconcileNucleo errore: " + e.message);
      return {
        success: false,
        actionsApplied: actions,
        errors: [...errors, e.message]
      };
    }
  }

  /**
   * Esegue l'audit diagnostico su tutti i nuclei familiari censiti nell'archivio.
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
        const rep = DriveReconciler.auditNucleo(nuc.id);
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
