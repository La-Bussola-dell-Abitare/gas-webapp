/**
 * @file DriveDiscoveryService.js
 * @description Servizio per la discovery e l'importazione automatica/interattiva
 * dei nuclei familiari e beneficiari fisicamente presenti su Google Drive ma non ancora
 * catalogati nei fogli Google ('Nuclei Familiari', 'Beneficiari' e 'Documenti').
 * Implementa la logica inversa Drive -> Sheets con scansione della cartella radice,
 * analisi delle sottocartelle, estrazione documenti e persistenza atomica transazionale.
 * @module Service/GDrive/DriveDiscoveryService
 */

class DriveDiscoveryService {
  /**
   * Scansiona la cartella radice Google Drive (CONFIG.FOLDER_BENEFICIARI_ROOT_ID)
   * e rileva le cartelle dei nuclei non ancora presenti nei fogli di calcolo.
   * 
   * @param {Object} [options={}]
   * @param {boolean} [options.deepAIScan=false] - Se true, analizza i documenti di identità con Gemini Flash per estrarre anagrafica e CF.
   * @param {number} [options.limit=150] - Limite massimo di cartelle da analizzare per prevenire timeout GAS.
   * @return {{
   *   success: boolean;
   *   totalDriveFolders: number;
   *   catalogedFolders: number;
   *   uncatalogedNuclei: Array<{
   *     folderId: string;
   *     folderName: string;
   *     folderUrl: string;
   *     detectedId: string|null;
   *     suggestedId: string;
   *     intestatarioName: string;
   *     members: Array<{
   *       name: string;
   *       cf: string;
   *       folderId: string;
   *       folderName: string;
   *       isIntestatario: boolean;
   *       docCount: number;
   *       documents: Array<{ fileId: string; fileName: string; tipo: string; categoria: string }>;
   *     }>;
   *     rootDocuments: Array<{ fileId: string; fileName: string; tipo: string; categoria: string }>;
   *     totalFiles: number;
   *     suggestedData: {
   *       id: string;
   *       intestatario: string;
   *       nome: string;
   *       cognome: string;
   *       cf: string;
   *       idCartella: string;
   *       residenza: string;
   *       domicilio: string;
   *       isee: number|null;
   *     };
   *   }>;
   *   errors: string[];
   * }}
   */
  static getUncatalogedDriveNuclei(options = {}) {
    const deepAIScan = !!options.deepAIScan;
    const limit = options.limit || 150;
    const errors = [];

    // 1. Localizzazione cartella radice Beneficiari
    let rootFolder = null;
    try {
      if (typeof CONFIG !== "undefined" && CONFIG.FOLDER_BENEFICIARI_ROOT) {
        rootFolder = CONFIG.FOLDER_BENEFICIARI_ROOT;
      }
    } catch (eR) {
      Logger.log("Accesso CONFIG.FOLDER_BENEFICIARI_ROOT: " + eR.message);
    }

    if (!rootFolder && typeof CONFIG !== "undefined" && CONFIG.FOLDER_BENEFICIARI_ROOT_ID && typeof DriveApp !== "undefined") {
      try {
        rootFolder = DriveApp.getFolderById(CONFIG.FOLDER_BENEFICIARI_ROOT_ID);
      } catch (errRoot) {
        errors.push("Impossibile accedere alla cartella radice di Google Drive (ID: " + CONFIG.FOLDER_BENEFICIARI_ROOT_ID + "): " + errRoot.message);
      }
    }

    if (!rootFolder) {
      return {
        success: false,
        totalDriveFolders: 0,
        catalogedFolders: 0,
        uncatalogedNuclei: [],
        errors: errors.length > 0 ? errors : ["Cartella radice Google Drive non accessibile."]
      };
    }

    // 2. Censimento dei nuclei e beneficiari attualmente a foglio
    const allNuclei = (typeof NucleoFamiliare !== "undefined" && typeof NucleoFamiliare.getAll === "function")
      ? NucleoFamiliare.getAll()
      : [];
    const allBeneficiari = (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.getAll === "function")
      ? BeneficiarioRepository.getAll()
      : [];

    const knownNucleoIds = new Set();
    const knownFolderIds = new Set();
    let maxId = 0;

    allNuclei.forEach(n => {
      if (n.id) {
        const idStr = String(n.id).trim();
        knownNucleoIds.add(idStr);
        const num = parseInt(idStr, 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
      if (n.idCartella) knownFolderIds.add(String(n.idCartella).trim());
    });

    allBeneficiari.forEach(b => {
      if (b.idCartella) knownFolderIds.add(String(b.idCartella).trim());
    });

    // 3. Scansione delle cartelle fisiche di Google Drive
    const uncatalogedNuclei = [];
    let totalDriveFolders = 0;
    let catalogedFolders = 0;

    try {
      const folderIter = rootFolder.getFolders();

      while (folderIter.hasNext() && totalDriveFolders < limit) {
        const f = folderIter.next();
        if (f.isTrashed()) continue;

        totalDriveFolders++;
        const fId = f.getId();
        const fName = f.getName().trim();

        // Esclusione cartelle di sistema o di servizio
        if (/^(_archivio|_template|_temp|trash|cestino|bozze)$/i.test(fName)) {
          continue;
        }

        // Verifica match ID nel nome cartella (es. "12 - Mario Rossi", "3 - Lorenzo Mazza")
        const idMatch = fName.match(/^\s*(\d+)\s*[-–—]?\s*(.*)$/);
        const detectedId = idMatch ? idMatch[1].trim() : null;
        let rawIntestatario = idMatch ? idMatch[2].trim() : fName;
        if (/^nucleo$/i.test(rawIntestatario)) rawIntestatario = "";

        // Se la cartella è già censita (per ID cartella o per ID nucleo a inizio nome)
        if (knownFolderIds.has(fId) || (detectedId && knownNucleoIds.has(detectedId))) {
          catalogedFolders++;
          continue;
        }

        // Cartella NON catalogata: procediamo con l'analisi della cartella
        maxId++;
        const suggestedId = detectedId || String(maxId);

        // 3a. Scansione file nella radice del nucleo
        const rootDocuments = [];
        try {
          const rootFilesIter = f.getFiles();
          while (rootFilesIter.hasNext()) {
            const rf = rootFilesIter.next();
            if (rf.isTrashed()) continue;
            const rfName = rf.getName();
            const docRec = (typeof findDocumentType === "function") ? findDocumentType(rfName) : null;
            rootDocuments.push({
              fileId: rf.getId(),
              fileName: rfName,
              tipo: docRec ? docRec.name : "Altro Documento",
              categoria: docRec ? docRec.categoria : "Altro",
              size: rf.getSize()
            });
          }
        } catch (eRF) {
          Logger.log("Errore lettura file radice cartella " + fName + ": " + eRF.message);
        }

        // 3b. Scansione sottocartelle componenti
        const members = [];
        try {
          const subFolderIter = f.getFolders();
          while (subFolderIter.hasNext()) {
            const sf = subFolderIter.next();
            if (sf.isTrashed()) continue;
            const sfName = sf.getName().trim();
            if (/^(_archivio|_template|_temp)$/i.test(sfName)) continue;

            const memDocs = [];
            let detectedCF = "";
            let aiExtractedData = null;

            try {
              const memFilesIter = sf.getFiles();
              while (memFilesIter.hasNext()) {
                const mf = memFilesIter.next();
                if (mf.isTrashed()) continue;
                const mfName = mf.getName();
                const mDocRec = (typeof findDocumentType === "function") ? findDocumentType(mfName) : null;

                // Ricerca Codice Fiscale nel nome del file
                const cfMatch = mfName.match(/\b([A-Za-z]{6}[0-9LMNPQRSTUV]{2}[A-Za-z][0-9LMNPQRSTUV]{2}[A-Za-z][0-9LMNPQRSTUV]{3}[A-Za-z])\b/);
                if (cfMatch && !detectedCF) {
                  detectedCF = cfMatch[1].toUpperCase();
                }

                // Deep AI Scan se richiesto
                if (deepAIScan && !detectedCF && typeof DocumentIntelligence !== "undefined" && DocumentIntelligence.isAvailable()) {
                  if (/carta.*identit|codice.*fiscale|tessera.*sanitaria|ci\./i.test(mfName)) {
                    try {
                      const aiRes = DocumentIntelligence.analyzeBlobs([mf.getBlob()]);
                      if (aiRes && aiRes.success && aiRes.data && aiRes.data.datiPersona) {
                        aiExtractedData = aiRes.data;
                        if (aiExtractedData.datiPersona.codiceFiscale) {
                          detectedCF = aiExtractedData.datiPersona.codiceFiscale.toUpperCase();
                        }
                      }
                    } catch (eAI) {
                      Logger.log("AI Scan errore per " + mfName + ": " + eAI.message);
                    }
                  }
                }

                memDocs.push({
                  fileId: mf.getId(),
                  fileName: mfName,
                  tipo: mDocRec ? mDocRec.name : "Altro Documento",
                  categoria: mDocRec ? mDocRec.categoria : "Altro"
                });
              }
            } catch (eMF) {
              Logger.log("Errore lettura file sottocartella " + sfName + ": " + eMF.message);
            }

            members.push({
              name: sfName,
              cf: detectedCF,
              folderId: sf.getId(),
              folderName: sfName,
              isIntestatario: false, // impostato dopo
              docCount: memDocs.length,
              documents: memDocs
            });
          }
        } catch (eSF) {
          Logger.log("Errore lettura sottocartelle " + fName + ": " + eSF.message);
        }

        // 3c. Deduzione dell'intestatario
        // Se ci sono sottocartelle componenti, cerchiamo quella corrispondente a rawIntestatario
        let intestatarioMember = null;
        if (members.length > 0) {
          if (rawIntestatario) {
            const rawLower = rawIntestatario.toLowerCase();
            intestatarioMember = members.find(m => m.name.toLowerCase().includes(rawLower) || rawLower.includes(m.name.toLowerCase())) || null;
          }
          if (!intestatarioMember) {
            intestatarioMember = members[0];
          }
          intestatarioMember.isIntestatario = true;
        }

        // Separazione nome e cognome intestatario
        const fullIntestName = intestatarioMember ? intestatarioMember.name : (rawIntestatario || "Sconosciuto");
        let intestNome = "";
        let intestCognome = "";
        const nameTokens = fullIntestName.trim().split(/\s+/);
        if (nameTokens.length > 1) {
          intestCognome = nameTokens.pop();
          intestNome = nameTokens.join(" ");
        } else {
          intestNome = fullIntestName;
          intestCognome = "";
        }

        const intestCF = (intestatarioMember && intestatarioMember.cf) ? intestatarioMember.cf : "";

        const totalFiles = rootDocuments.length + members.reduce((sum, m) => sum + m.docCount, 0);

        uncatalogedNuclei.push({
          folderId: fId,
          folderName: fName,
          folderUrl: f.getUrl(),
          detectedId: detectedId,
          suggestedId: suggestedId,
          intestatarioName: fullIntestName,
          members: members,
          rootDocuments: rootDocuments,
          totalFiles: totalFiles,
          suggestedData: {
            id: suggestedId,
            intestatario: intestCF || fullIntestName,
            nome: intestNome,
            cognome: intestCognome,
            cf: intestCF,
            idCartella: fId,
            residenza: "",
            domicilio: "",
            isee: null
          }
        });
      }
    } catch (eIter) {
      errors.push("Errore durante la scansione delle cartelle di Google Drive: " + eIter.message);
    }

    return {
      success: errors.length === 0,
      totalDriveFolders: totalDriveFolders,
      catalogedFolders: catalogedFolders,
      uncatalogedNuclei: uncatalogedNuclei,
      errors: errors
    };
  }

  /**
   * Importa transazionalmente i nuclei selezionati e approvati dall'operatore.
   * Scrive le righe nei fogli 'Nuclei Familiari', 'Beneficiari' e 'Documenti',
   * e normalizza facoltativamente il nome della cartella su Google Drive.
   * 
   * @param {Array<Object>} approvedList - Elenco dei nuclei da importare
   * @return {{
   *   success: boolean;
   *   importedNucleiCount: number;
   *   importedBeneficiariCount: number;
   *   importedDocumentsCount: number;
   *   actionsApplied: string[];
   *   errors: string[];
   * }}
   */
  static importNuclei(approvedList) {
    if (!Array.isArray(approvedList) || approvedList.length === 0) {
      return {
        success: false,
        importedNucleiCount: 0,
        importedBeneficiariCount: 0,
        importedDocumentsCount: 0,
        actionsApplied: [],
        errors: ["Nessun nucleo familiare selezionato per l'importazione."]
      };
    }

    const lock = (typeof LockService !== "undefined") ? LockService.getScriptLock() : null;
    if (lock) {
      try {
        lock.waitLock(30000);
      } catch (eL) {
        return {
          success: false,
          importedNucleiCount: 0,
          importedBeneficiariCount: 0,
          importedDocumentsCount: 0,
          actionsApplied: [],
          errors: ["Sistema occupato da un'altra operazione di scrittura. Riprovare tra qualche secondo."]
        };
      }
    }

    const actionsApplied = [];
    const errors = [];
    let importedNucleiCount = 0;
    let importedBeneficiariCount = 0;
    let importedDocumentsCount = 0;

    try {
      for (let i = 0; i < approvedList.length; i++) {
        const item = approvedList[i];
        if (!item) continue;

        try {
          const sug = item.suggestedData || item;
          const folderId = item.folderId || sug.idCartella || "";

          // 1. Assegnazione o validazione ID Nucleo
          let targetNucleoId = sug.id ? String(sug.id).trim() : "";
          if (!targetNucleoId && typeof NucleoFamiliare !== "undefined" && typeof NucleoFamiliare.generateNextId === "function") {
            targetNucleoId = NucleoFamiliare.generateNextId();
          }

          // 2. Registrazione nel foglio 'Nuclei Familiari'
          const intestatarioRef = (sug.cf || sug.intestatario || (sug.nome + " " + sug.cognome)).trim().toUpperCase();
          if (typeof NucleoFamiliare !== "undefined" && typeof NucleoFamiliare.save === "function") {
            NucleoFamiliare.save({
              id: targetNucleoId,
              intestatario: intestatarioRef,
              isee: sug.isee || null,
              residenza: sug.residenza || "",
              domicilio: sug.domicilio || "",
              idCartella: folderId
            });
            importedNucleiCount++;
            actionsApplied.push(`Creato Nucleo #${targetNucleoId} con intestatario '${intestatarioRef}'.`);
          }

          // 3. Registrazione nel foglio 'Beneficiari'
          const membersToImport = item.members || [];
          if (membersToImport.length > 0) {
            membersToImport.forEach(m => {
              try {
                let mNome = "";
                let mCognome = "";
                const parts = (m.name || "").trim().split(/\s+/);
                if (parts.length > 1) {
                  mCognome = parts.pop();
                  mNome = parts.join(" ");
                } else {
                  mNome = m.name || "";
                  mCognome = "";
                }

                if (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.add === "function") {
                  BeneficiarioRepository.add({
                    nome: mNome,
                    cognome: mCognome,
                    cf: m.cf ? m.cf.toUpperCase().trim() : "",
                    idNucleo: targetNucleoId,
                    rapportoIntestatario: m.isIntestatario ? "Intestatario" : "Convivente",
                    idCartella: m.folderId || ""
                  });
                  importedBeneficiariCount++;
                  actionsApplied.push(`Registrato beneficiario '${mNome} ${mCognome}' (Nucleo #${targetNucleoId}).`);
                }
              } catch (eBen) {
                errors.push(`Errore censimento beneficiario '${m.name}': ${eBen.message}`);
              }
            });
          } else if (sug.nome || sug.cognome) {
            // Se non ci sono sottocartelle, creiamo l'intestatario unico
            try {
              if (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.add === "function") {
                BeneficiarioRepository.add({
                  nome: sug.nome || "",
                  cognome: sug.cognome || "",
                  cf: sug.cf ? sug.cf.toUpperCase().trim() : "",
                  idNucleo: targetNucleoId,
                  rapportoIntestatario: "Intestatario",
                  idCartella: folderId
                });
                importedBeneficiariCount++;
                actionsApplied.push(`Registrato beneficiario '${sug.nome} ${sug.cognome}' (Nucleo #${targetNucleoId}).`);
              }
            } catch (eIntest) {
              errors.push(`Errore censimento intestatario '${sug.nome} ${sug.cognome}': ${eIntest.message}`);
            }
          }

          // 4. Registrazione nel foglio 'Documenti'
          const allDocs = [];
          if (Array.isArray(item.rootDocuments)) allDocs.push(...item.rootDocuments);
          if (Array.isArray(item.members)) {
            item.members.forEach(m => {
              if (Array.isArray(m.documents)) {
                m.documents.forEach(doc => {
                  allDocs.push(Object.assign({}, doc, { memberCF: m.cf || intestatarioRef }));
                });
              }
            });
          }

          if (allDocs.length > 0 && typeof DocumentoRepository !== "undefined" && typeof DocumentoRepository.add === "function") {
            allDocs.forEach(doc => {
              try {
                if (doc.fileId) {
                  DocumentoRepository.add({
                    intestatario: doc.memberCF || intestatarioRef,
                    tipo: doc.tipo || "Altro Documento",
                    categoria: doc.categoria || "Altro",
                    idDrive: doc.fileId,
                    note: "Censito da Discovery Drive"
                  });
                  importedDocumentsCount++;
                }
              } catch (eDoc) {
                errors.push(`Errore censimento documento '${doc.fileName}': ${eDoc.message}`);
              }
            });
          }

          // 5. Normalizzazione canonica della cartella Google Drive ('<ID> - <Nome>')
          if (folderId && typeof DriveApp !== "undefined") {
            try {
              const folder = DriveApp.getFolderById(folderId);
              const currentName = folder.getName().trim();
              const intestLabel = (sug.nome && sug.cognome) ? `${sug.nome} ${sug.cognome}`.trim() : (item.intestatarioName || "Nucleo");
              const canonicalName = `${targetNucleoId} - ${intestLabel}`;
              if (currentName !== canonicalName) {
                folder.setName(canonicalName);
                actionsApplied.push(`Rinominata cartella Drive: '${currentName}' -> '${canonicalName}'.`);
              }
            } catch (eRen) {
              Logger.log("Avviso ridenominazione cartella " + folderId + ": " + eRen.message);
            }
          }
        } catch (eItem) {
          errors.push(`Errore importazione nucleo (cartella '${item.folderName || item.folderId}'): ${eItem.message}`);
        }
      }
    } finally {
      if (lock) {
        lock.releaseLock();
      }
    }

    return {
      success: errors.length === 0,
      importedNucleiCount: importedNucleiCount,
      importedBeneficiariCount: importedBeneficiariCount,
      importedDocumentsCount: importedDocumentsCount,
      actionsApplied: actionsApplied,
      errors: errors
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DriveDiscoveryService };
}
