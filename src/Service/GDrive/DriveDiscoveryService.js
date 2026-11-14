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
        let rootExtractedPerson = null;
        let detectedISEE = null;

        try {
          const rootFilesIter = f.getFiles();
          while (rootFilesIter.hasNext()) {
            const rf = rootFilesIter.next();
            if (rf.isTrashed()) continue;
            const rfName = rf.getName();
            const docRec = (typeof findDocumentType === "function") ? findDocumentType(rfName) : null;

            let rfEmission = "";
            let rfScadenza = "";
            let rfValore = null;
            let rfNumero = "";

            // Deep AI Scan su file radice se richiesto
            if (deepAIScan && typeof DocumentIntelligence !== "undefined" && DocumentIntelligence.isAvailable()) {
              if (/carta.*identit|codice.*fiscale|tessera.*sanitaria|passaporto|patente|permesso.*soggiorno|isee|ci\.|cf\.|ts\./i.test(rfName)) {
                try {
                  const aiRes = DocumentIntelligence.analyzeBlobs([rf.getBlob()]);
                  if (aiRes && aiRes.success && aiRes.data) {
                    if (aiRes.data.datiPersona) {
                      rootExtractedPerson = Object.assign(rootExtractedPerson || {}, aiRes.data.datiPersona);
                    }
                    if (aiRes.data.datiDocumento) {
                      rfEmission = aiRes.data.datiDocumento.dataEmissione || "";
                      rfScadenza = aiRes.data.datiDocumento.dataScadenza || "";
                      rfValore = aiRes.data.datiDocumento.valore != null ? aiRes.data.datiDocumento.valore : null;
                      rfNumero = aiRes.data.datiDocumento.numeroDocumento || "";
                    }
                    if (aiRes.data.valoreISEE != null) {
                      detectedISEE = aiRes.data.valoreISEE;
                    }
                  }
                } catch (eAIRoot) {
                  Logger.log("AI Scan radice errore per " + rfName + ": " + eAIRoot.message);
                }
              }
            }

            rootDocuments.push({
              fileId: rf.getId(),
              fileName: rfName,
              tipo: docRec ? docRec.name : "Altro Documento",
              categoria: docRec ? docRec.categoria : "Altro",
              size: rf.getSize(),
              dataEmissione: rfEmission,
              dataScadenza: rfScadenza,
              valore: rfValore,
              numeroDocumento: rfNumero
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
            let memberPersonData = null;

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

                let mfEmission = "";
                let mfScadenza = "";
                let mfValore = null;
                let mfNumero = "";

                // Deep AI Scan se richiesto
                if (deepAIScan && typeof DocumentIntelligence !== "undefined" && DocumentIntelligence.isAvailable()) {
                  if (/carta.*identit|codice.*fiscale|tessera.*sanitaria|passaporto|patente|permesso.*soggiorno|ci\.|cf\.|ts\./i.test(mfName)) {
                    try {
                      const aiRes = DocumentIntelligence.analyzeBlobs([mf.getBlob()]);
                      if (aiRes && aiRes.success && aiRes.data) {
                        if (aiRes.data.datiPersona) {
                          memberPersonData = Object.assign(memberPersonData || {}, aiRes.data.datiPersona);
                          if (aiRes.data.datiPersona.codiceFiscale) {
                            detectedCF = aiRes.data.datiPersona.codiceFiscale.toUpperCase();
                          }
                        }
                        if (aiRes.data.datiDocumento) {
                          mfEmission = aiRes.data.datiDocumento.dataEmissione || "";
                          mfScadenza = aiRes.data.datiDocumento.dataScadenza || "";
                          mfValore = aiRes.data.datiDocumento.valore != null ? aiRes.data.datiDocumento.valore : null;
                          mfNumero = aiRes.data.datiDocumento.numeroDocumento || "";
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
                  categoria: mDocRec ? mDocRec.categoria : "Altro",
                  dataEmissione: mfEmission,
                  dataScadenza: mfScadenza,
                  valore: mfValore,
                  numeroDocumento: mfNumero
                });
              }
            } catch (eMF) {
              Logger.log("Errore lettura file sottocartella " + sfName + ": " + eMF.message);
            }

            const cleanMemberName = (typeof normalizeProperCase === "function") ? normalizeProperCase(sfName) : sfName;
            let mNome = memberPersonData && memberPersonData.nome ? memberPersonData.nome : "";
            let mCognome = memberPersonData && memberPersonData.cognome ? memberPersonData.cognome : "";
            if (!mNome && !mCognome) {
              const parts = cleanMemberName.split(/\s+/);
              if (parts.length > 1) {
                mCognome = parts.pop();
                mNome = parts.join(" ");
              } else {
                mNome = cleanMemberName;
                mCognome = "";
              }
            }
            if (typeof normalizeProperCase === "function") {
              mNome = normalizeProperCase(mNome);
              mCognome = normalizeProperCase(mCognome);
            }

            members.push({
              name: `${mNome} ${mCognome}`.trim() || cleanMemberName,
              nome: mNome,
              cognome: mCognome,
              cf: (typeof normalizeFiscalCode === "function" && detectedCF) ? normalizeFiscalCode(detectedCF) : detectedCF,
              dataNascita: memberPersonData?.dataNascita || "",
              luogoNascita: (typeof normalizeCity === "function" && memberPersonData?.luogoNascita) ? normalizeCity(memberPersonData.luogoNascita) : (memberPersonData?.luogoNascita || ""),
              cittadinanza: (typeof normalizeProperCase === "function" && memberPersonData?.cittadinanza) ? normalizeProperCase(memberPersonData.cittadinanza) : (memberPersonData?.cittadinanza || "Italia"),
              residenza: (typeof normalizeAddress === "function" && memberPersonData?.residenza) ? normalizeAddress(memberPersonData.residenza) : (memberPersonData?.residenza || ""),
              domicilio: (typeof normalizeAddress === "function" && memberPersonData?.domicilio) ? normalizeAddress(memberPersonData.domicilio) : (memberPersonData?.domicilio || ""),
              sesso: memberPersonData?.sesso || "",
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

        // Calcolo dati anagrafici intestatario: unisce AI radice, AI membro e fallback su cartella
        let intestNome = "";
        let intestCognome = "";
        let intestCF = "";
        let intestDataNascita = "";
        let intestLuogoNascita = "";
        let intestCittadinanza = "Italia";
        let intestResidenza = "";
        let intestDomicilio = "";
        let intestSesso = "";

        if (rootExtractedPerson) {
          if (rootExtractedPerson.nome) intestNome = rootExtractedPerson.nome;
          if (rootExtractedPerson.cognome) intestCognome = rootExtractedPerson.cognome;
          if (rootExtractedPerson.codiceFiscale) intestCF = rootExtractedPerson.codiceFiscale;
          if (rootExtractedPerson.dataNascita) intestDataNascita = rootExtractedPerson.dataNascita;
          if (rootExtractedPerson.luogoNascita) intestLuogoNascita = rootExtractedPerson.luogoNascita;
          if (rootExtractedPerson.cittadinanza) intestCittadinanza = rootExtractedPerson.cittadinanza;
          if (rootExtractedPerson.residenza) intestResidenza = rootExtractedPerson.residenza;
          if (rootExtractedPerson.domicilio) intestDomicilio = rootExtractedPerson.domicilio;
          if (rootExtractedPerson.sesso) intestSesso = rootExtractedPerson.sesso;
        }

        if (intestatarioMember) {
          if (!intestNome && intestatarioMember.nome) intestNome = intestatarioMember.nome;
          if (!intestCognome && intestatarioMember.cognome) intestCognome = intestatarioMember.cognome;
          if (!intestCF && intestatarioMember.cf) intestCF = intestatarioMember.cf;
          if (!intestDataNascita && intestatarioMember.dataNascita) intestDataNascita = intestatarioMember.dataNascita;
          if (!intestLuogoNascita && intestatarioMember.luogoNascita) intestLuogoNascita = intestatarioMember.luogoNascita;
          if (!intestCittadinanza && intestatarioMember.cittadinanza) intestCittadinanza = intestatarioMember.cittadinanza;
          if (!intestResidenza && intestatarioMember.residenza) intestResidenza = intestatarioMember.residenza;
          if (!intestDomicilio && intestatarioMember.domicilio) intestDomicilio = intestatarioMember.domicilio;
          if (!intestSesso && intestatarioMember.sesso) intestSesso = intestatarioMember.sesso;
        }

        // Fallback da nome cartella o membro se nome e cognome non estratti da IA
        if (!intestNome && !intestCognome) {
          const fallbackName = (rawIntestatario || (intestatarioMember ? intestatarioMember.name : "Sconosciuto")).trim();
          const tokens = fallbackName.split(/\s+/);
          if (tokens.length > 1) {
            intestCognome = tokens.pop();
            intestNome = tokens.join(" ");
          } else {
            intestNome = fallbackName;
            intestCognome = "";
          }
        }

        // Normalizzazione Proper Case garantita su tutti i dati dell'intestatario
        if (typeof normalizeProperCase === "function") {
          intestNome = normalizeProperCase(intestNome);
          intestCognome = normalizeProperCase(intestCognome);
          intestCittadinanza = normalizeProperCase(intestCittadinanza || "Italia");
        }
        if (typeof normalizeCity === "function" && intestLuogoNascita) {
          intestLuogoNascita = normalizeCity(intestLuogoNascita);
        }
        if (typeof normalizeAddress === "function") {
          if (intestResidenza) intestResidenza = normalizeAddress(intestResidenza);
          if (intestDomicilio) intestDomicilio = normalizeAddress(intestDomicilio);
        }
        if (typeof normalizeFiscalCode === "function" && intestCF) {
          intestCF = normalizeFiscalCode(intestCF);
        }

        const fullIntestLabel = `${intestNome} ${intestCognome}`.trim() || (rawIntestatario || "Sconosciuto");
        const totalFiles = rootDocuments.length + members.reduce((sum, m) => sum + m.docCount, 0);

        uncatalogedNuclei.push({
          folderId: fId,
          folderName: fName,
          folderUrl: f.getUrl(),
          detectedId: detectedId,
          suggestedId: suggestedId,
          intestatarioName: fullIntestLabel,
          members: members,
          rootDocuments: rootDocuments,
          totalFiles: totalFiles,
          suggestedData: {
            id: suggestedId,
            intestatario: intestCF || fullIntestLabel,
            nome: intestNome,
            cognome: intestCognome,
            cf: intestCF,
            dataNascita: intestDataNascita,
            luogoNascita: intestLuogoNascita,
            cittadinanza: intestCittadinanza,
            residenza: intestResidenza,
            domicilio: intestDomicilio || intestResidenza,
            sesso: intestSesso,
            idCartella: fId,
            isee: detectedISEE || null
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

    // Cache preesistente per deduplicazione e recupero orfani
    const existingBeneficiari = (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.getAll === "function")
      ? BeneficiarioRepository.getAll()
      : [];
    const existingDocs = (typeof DocumentoRepository !== "undefined" && typeof DocumentoRepository.getAll === "function")
      ? DocumentoRepository.getAll()
      : [];
    const existingDocDriveIds = new Set(existingDocs.map(d => String(d.idDrive || "").trim()).filter(Boolean));

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
          const intestatarioRef = (sug.cf || sug.intestatario || (sug.nome + " " + (sug.cognome || ""))).trim().toUpperCase();
          const addNucleoFn = (typeof NucleoFamiliare !== "undefined") && (NucleoFamiliare.save || NucleoFamiliare.add);
          if (typeof addNucleoFn === "function") {
            const nucRes = addNucleoFn.call(NucleoFamiliare, {
              id: targetNucleoId,
              intestatario: intestatarioRef,
              isee: sug.isee || null,
              residenza: sug.residenza || "",
              domicilio: sug.domicilio || "",
              idCartella: folderId
            });
            if (nucRes && nucRes.id) {
              targetNucleoId = String(nucRes.id).trim();
            }
            importedNucleiCount++;
            actionsApplied.push(`Creato/aggiornato Nucleo #${targetNucleoId} con intestatario '${intestatarioRef}'.`);
          } else {
            errors.push(`Impossibile registrare il Nucleo #${targetNucleoId}: metodo NucleoFamiliare.save/add non disponibile.`);
          }

          // 3. Registrazione nel foglio 'Beneficiari' (con deduplicazione e linking orfani)
          const membersToImport = item.members || [];
          if (membersToImport.length > 0) {
            membersToImport.forEach(m => {
              try {
                let mNome = m.nome || "";
                let mCognome = m.cognome || "";
                if (!mNome && !mCognome) {
                  const parts = (m.name || "").trim().split(/\s+/);
                  if (parts.length > 1) {
                    mCognome = parts.pop();
                    mNome = parts.join(" ");
                  } else {
                    mNome = m.name || "";
                    mCognome = "";
                  }
                }

                if (typeof normalizeProperCase === "function") {
                  mNome = normalizeProperCase(mNome);
                  mCognome = normalizeProperCase(mCognome);
                }

                const targetCF = (typeof normalizeFiscalCode === "function" && m.cf) ? normalizeFiscalCode(m.cf) : (m.cf ? m.cf.toUpperCase().trim() : "");
                const targetFullName = (mNome + " " + mCognome).toLowerCase().trim();

                const mDataNascita = m.dataNascita || (m.isIntestatario ? sug.dataNascita : "") || "";
                const mLuogoNascita = (typeof normalizeCity === "function" && (m.luogoNascita || (m.isIntestatario ? sug.luogoNascita : "")))
                  ? normalizeCity(m.luogoNascita || (m.isIntestatario ? sug.luogoNascita : ""))
                  : (m.luogoNascita || (m.isIntestatario ? sug.luogoNascita : "") || "");
                const mCittadinanza = (typeof normalizeProperCase === "function")
                  ? normalizeProperCase(m.cittadinanza || sug.cittadinanza || "Italia")
                  : (m.cittadinanza || sug.cittadinanza || "Italia");
                const mResidenza = (typeof normalizeAddress === "function" && (m.residenza || sug.residenza))
                  ? normalizeAddress(m.residenza || sug.residenza)
                  : (m.residenza || sug.residenza || "");
                const mDomicilio = (typeof normalizeAddress === "function" && (m.domicilio || sug.domicilio))
                  ? normalizeAddress(m.domicilio || sug.domicilio)
                  : (m.domicilio || sug.domicilio || "");

                // Verifica se già presente nel foglio Beneficiari
                const existingBen = existingBeneficiari.find(b => {
                  const bCF = (b.cf || "").toUpperCase().trim();
                  const bFullName = `${b.nome || ""} ${b.cognome || ""}`.toLowerCase().trim();
                  return (targetCF && bCF && bCF === targetCF) || (targetFullName && bFullName && bFullName === targetFullName);
                });

                if (existingBen) {
                  // Beneficiario già esistente: aggiorna legame con il nucleo, cartella e anagrafica mancante
                  if (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.add === "function") {
                    BeneficiarioRepository.add({
                      isUpdate: true,
                      originalCF: existingBen.cf,
                      nome: existingBen.nome || mNome,
                      cognome: existingBen.cognome || mCognome,
                      cf: existingBen.cf || targetCF,
                      dataNascita: existingBen.dataNascita || mDataNascita,
                      luogoNascita: existingBen.luogoNascita || mLuogoNascita,
                      cittadinanza: existingBen.cittadinanza || mCittadinanza,
                      residenza: existingBen.residenza || mResidenza,
                      domicilio: existingBen.domicilio || mDomicilio,
                      idNucleo: targetNucleoId,
                      rapportoIntestatario: m.isIntestatario ? "Intestatario" : (existingBen.rapportoIntestatario || "Convivente"),
                      idCartella: m.folderId || existingBen.idCartella || ""
                    });
                    actionsApplied.push(`Aggiornato beneficiario '${mNome} ${mCognome}' (Nucleo #${targetNucleoId}).`);
                  }
                } else if (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.add === "function") {
                  BeneficiarioRepository.add({
                    nome: mNome,
                    cognome: mCognome,
                    cf: targetCF,
                    dataNascita: mDataNascita,
                    luogoNascita: mLuogoNascita,
                    cittadinanza: mCittadinanza,
                    residenza: mResidenza,
                    domicilio: mDomicilio,
                    idNucleo: targetNucleoId,
                    rapportoIntestatario: m.isIntestatario ? "Intestatario" : "Convivente",
                    idCartella: m.folderId || ""
                  });
                  existingBeneficiari.push({
                    nome: mNome,
                    cognome: mCognome,
                    cf: targetCF,
                    dataNascita: mDataNascita,
                    luogoNascita: mLuogoNascita,
                    cittadinanza: mCittadinanza,
                    residenza: mResidenza,
                    domicilio: mDomicilio,
                    idNucleo: targetNucleoId,
                    idCartella: m.folderId || ""
                  });
                  importedBeneficiariCount++;
                  actionsApplied.push(`Registrato beneficiario '${mNome} ${mCognome}' (Nucleo #${targetNucleoId}).`);
                }
              } catch (eBen) {
                errors.push(`Errore censimento beneficiario '${m.name}': ${eBen.message}`);
              }
            });
          } else if (sug.nome || sug.cognome || intestatarioRef) {
            // Se non ci sono sottocartelle componenti, creiamo/colleghiamo l'intestatario unico
            try {
              let targetNome = sug.nome || (sug.cognome ? "" : intestatarioRef);
              let targetCognome = sug.cognome || "";
              if (typeof normalizeProperCase === "function") {
                targetNome = normalizeProperCase(targetNome);
                targetCognome = normalizeProperCase(targetCognome);
              }

              const targetCF = (typeof normalizeFiscalCode === "function" && sug.cf) ? normalizeFiscalCode(sug.cf) : (sug.cf ? sug.cf.toUpperCase().trim() : "");
              const targetFullName = `${targetNome} ${targetCognome}`.toLowerCase().trim();

              const targetDataNascita = sug.dataNascita || "";
              const targetLuogoNascita = (typeof normalizeCity === "function" && sug.luogoNascita) ? normalizeCity(sug.luogoNascita) : (sug.luogoNascita || "");
              const targetCittadinanza = (typeof normalizeProperCase === "function") ? normalizeProperCase(sug.cittadinanza || "Italia") : (sug.cittadinanza || "Italia");
              const targetResidenza = (typeof normalizeAddress === "function" && sug.residenza) ? normalizeAddress(sug.residenza) : (sug.residenza || "");
              const targetDomicilio = (typeof normalizeAddress === "function" && sug.domicilio) ? normalizeAddress(sug.domicilio) : (sug.domicilio || targetResidenza);

              const existingBen = existingBeneficiari.find(b => {
                const bCF = (b.cf || "").toUpperCase().trim();
                const bFullName = `${b.nome || ""} ${b.cognome || ""}`.toLowerCase().trim();
                return (targetCF && bCF && bCF === targetCF) || (targetFullName && bFullName && bFullName === targetFullName);
              });

              if (existingBen) {
                if (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.add === "function") {
                  BeneficiarioRepository.add({
                    isUpdate: true,
                    originalCF: existingBen.cf,
                    nome: existingBen.nome || targetNome,
                    cognome: existingBen.cognome || targetCognome,
                    cf: existingBen.cf || targetCF,
                    dataNascita: existingBen.dataNascita || targetDataNascita,
                    luogoNascita: existingBen.luogoNascita || targetLuogoNascita,
                    cittadinanza: existingBen.cittadinanza || targetCittadinanza,
                    residenza: existingBen.residenza || targetResidenza,
                    domicilio: existingBen.domicilio || targetDomicilio,
                    idNucleo: targetNucleoId,
                    rapportoIntestatario: "Intestatario",
                    idCartella: folderId || existingBen.idCartella || ""
                  });
                  actionsApplied.push(`Aggiornato intestatario '${existingBen.nome} ${existingBen.cognome}' (Nucleo #${targetNucleoId}).`);
                }
              } else if (typeof BeneficiarioRepository !== "undefined" && typeof BeneficiarioRepository.add === "function") {
                BeneficiarioRepository.add({
                  nome: targetNome,
                  cognome: targetCognome,
                  cf: targetCF,
                  dataNascita: targetDataNascita,
                  luogoNascita: targetLuogoNascita,
                  cittadinanza: targetCittadinanza,
                  residenza: targetResidenza,
                  domicilio: targetDomicilio,
                  idNucleo: targetNucleoId,
                  rapportoIntestatario: "Intestatario",
                  idCartella: folderId
                });
                existingBeneficiari.push({
                  nome: targetNome,
                  cognome: targetCognome,
                  cf: targetCF,
                  dataNascita: targetDataNascita,
                  luogoNascita: targetLuogoNascita,
                  cittadinanza: targetCittadinanza,
                  residenza: targetResidenza,
                  domicilio: targetDomicilio,
                  idNucleo: targetNucleoId,
                  idCartella: folderId
                });
                importedBeneficiariCount++;
                actionsApplied.push(`Registrato beneficiario intestatario '${targetNome} ${targetCognome}' (Nucleo #${targetNucleoId}).`);
              }
            } catch (eIntest) {
              errors.push(`Errore censimento intestatario: ${eIntest.message}`);
            }
          }

          // 4. Registrazione nel foglio 'Documenti' (con deduplicazione per ID Drive)
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
                  const cleanFileId = String(doc.fileId).trim();
                  if (existingDocDriveIds.has(cleanFileId)) {
                    // Documento già archiviato con questo ID Drive, evitiamo righe duplicate
                    return;
                  }
                  DocumentoRepository.add({
                    intestatario: doc.memberCF || intestatarioRef,
                    tipo: doc.tipo || "Altro Documento",
                    categoria: doc.categoria || "Altro",
                    valore: doc.valore !== undefined ? doc.valore : null,
                    dataEmissione: doc.dataEmissione || "",
                    dataScadenza: doc.dataScadenza || "",
                    idDrive: cleanFileId,
                    note: doc.numeroDocumento ? `Doc n. ${doc.numeroDocumento}` : "Censito da Discovery Drive"
                  });
                  existingDocDriveIds.add(cleanFileId);
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
