/**
 * @file DriveManager.js
 * @description Servizio applicativo per la gestione dell'integrazione con Google Drive.
 * Implementa l'architettura ibrida per l'associazione automatica delle cartelle dei Nuclei Familiari
 * e dei Beneficiari, la scansione documentale on-demand, e il salvataggio ad alta risoluzione
 * delle firme autografe dei beneficiari.
 * @module Service/GDrive/DriveManager
 */

class DriveManager {

  /**
   * Recupera o crea la cartella Google Drive per uno specifico Nucleo Familiare.
   * Utilizza il modello ibrido:
   * 1. Fast-path: legge l'ID salvato nel foglio 'Nuclei Familiari' (O(1)).
   * 2. Fallback ricerca: cerca nella cartella radice usando regex tollerante per l'ID (^\s*<id>[\s\-–—]|$).
   * 3. Fallback creazione: crea la cartella `<id> - <Intestatario>` e memorizza l'ID nel foglio.
   * 
   * @param {string|number} nucleoId - L'identificativo numerico del nucleo.
   * @param {string} [intestatarioNome=""] - Nominativo dell'intestatario per la nomenclatura.
   * @return {{ id: string; url: string; name: string }}
   */
  static getOrCreateNucleoFolder(nucleoId, intestatarioNome = "") {
    if (!nucleoId && nucleoId !== 0) {
      throw new Error("ID nucleo non specificato.");
    }
    const cleanId = String(nucleoId).trim();

    // 1. Verifica se l'ID cartella è già censito nel foglio
    const nuclei = NucleoFamiliare.getAll();
    const nucleo = nuclei.find(n => String(n.id).trim() === cleanId);
    let cachedFolderId = nucleo && nucleo.idCartella ? String(nucleo.idCartella).trim() : "";
    let intestatario = intestatarioNome || (nucleo ? nucleo.intestatario : "");

    if (cachedFolderId) {
      try {
        const folder = DriveApp.getFolderById(cachedFolderId);
        if (folder && !folder.isTrashed()) {
          return { id: folder.getId(), url: folder.getUrl(), name: folder.getName() };
        }
      } catch (err) {
        Logger.log("Cartella nucleo ID " + cachedFolderId + " non accessibile o eliminata. Procedo con ricerca.");
      }
    }

    // 2. Ricerca tollerante all'interno della cartella radice Beneficiari
    let rootFolder = null;
    try {
      rootFolder = CONFIG.FOLDER_BENEFICIARI_ROOT;
    } catch (e) {
      Logger.log("Avviso accesso CONFIG.FOLDER_BENEFICIARI_ROOT: " + e.message);
    }
    if (!rootFolder && typeof CONFIG !== 'undefined' && CONFIG.FOLDER_BENEFICIARI_ROOT_ID) {
      try {
        rootFolder = DriveApp.getFolderById(CONFIG.FOLDER_BENEFICIARI_ROOT_ID);
      } catch (rootErr) {
        Logger.log("Errore DriveApp.getFolderById root: " + rootErr.message);
      }
    }
    if (!rootFolder) {
      throw new Error("Cartella radice beneficiari non accessibile su Google Drive (ID: " + (CONFIG.FOLDER_BENEFICIARI_ROOT_ID || 'non specificato') + ").");
    }

    // Regex tollerante: inizia per <id> seguito da spazio o trattino o fine stringa
    const tolerantRegex = new RegExp("^\\s*" + cleanId + "([\\s\\-–—]|$)");
    const subfolders = rootFolder.getFolders();
    let foundFolder = null;

    while (subfolders.hasNext()) {
      const f = subfolders.next();
      if (!f.isTrashed() && tolerantRegex.test(f.getName())) {
        foundFolder = f;
        break;
      }
    }

    // 3. Creazione automatica se non esiste
    if (!foundFolder) {
      const folderName = intestatario ? `${cleanId} - ${intestatario.trim()}` : `${cleanId} - Nucleo`;
      foundFolder = rootFolder.createFolder(folderName);
      Logger.log("Creata nuova cartella nucleo: " + folderName + " (ID: " + foundFolder.getId() + ")");
    }

    // Salva l'ID nel foglio Nuclei Familiari per i futuri accessi O(1)
    try {
      NucleoFamiliare.updateDriveInfo(cleanId, { idCartella: foundFolder.getId() });
    } catch (saveErr) {
      Logger.log("Impossibile salvare idCartella nucleo nel foglio: " + saveErr.message);
    }

    return { id: foundFolder.getId(), url: foundFolder.getUrl(), name: foundFolder.getName() };
  }

  /**
   * Recupera o crea la sottocartella personale del Beneficiario all'interno della cartella del suo Nucleo.
   * La cartella è denominata `<Nome Cognome>`.
   * 
   * @param {string} cf - Codice fiscale del beneficiario.
   * @return {{ id: string; url: string; name: string }}
   */
  static getOrCreateBeneficiarioFolder(cf) {
    if (!cf) throw new Error("Codice Fiscale obbligatorio.");
    const targetCF = cf.toUpperCase().trim();

    const beneficiari = BeneficiarioRepository.getAll();
    const ben = beneficiari.find(b => (b.cf || "").toUpperCase().trim() === targetCF);
    if (!ben) {
      throw new Error("Beneficiario con Codice Fiscale '" + targetCF + "' non trovato.");
    }

    // 1. Fast path: verifica se l'ID della cartella personale è già nel foglio
    if (ben.idCartella) {
      try {
        const folder = DriveApp.getFolderById(ben.idCartella.trim());
        if (folder && !folder.isTrashed()) {
          return { id: folder.getId(), url: folder.getUrl(), name: folder.getName() };
        }
      } catch (err) {
        Logger.log("Cartella beneficiario ID " + ben.idCartella + " non accessibile. Procedo con ricerca.");
      }
    }

    // 2. Recupera la cartella del nucleo di appartenenza
    const idNucleo = ben.idNucleo ? String(ben.idNucleo).trim() : "";
    if (!idNucleo) {
      throw new Error("Il beneficiario non è ancora associato a un Nucleo Familiare (ID Nucleo mancante).");
    }

    const nucleoFolderInfo = DriveManager.getOrCreateNucleoFolder(idNucleo);
    const nucleoFolder = DriveApp.getFolderById(nucleoFolderInfo.id);

    // 3. Ricerca della sottocartella personale con Nome Cognome all'interno della cartella nucleo
    const nome = (ben.nome || ben.name || "").trim();
    const cognome = (ben.cognome || ben.surname || "").trim();
    const expectedName = `${nome} ${cognome}`.trim().toLowerCase();
    const invertedName = `${cognome} ${nome}`.trim().toLowerCase();

    const subfolders = nucleoFolder.getFolders();
    let memberFolder = null;

    while (subfolders.hasNext()) {
      const f = subfolders.next();
      if (!f.isTrashed()) {
        const currentName = f.getName().trim().toLowerCase();
        if (currentName === expectedName || currentName === invertedName || (expectedName && currentName.includes(expectedName))) {
          memberFolder = f;
          break;
        }
      }
    }

    // 4. Se non esiste, crea la sottocartella personale
    if (!memberFolder) {
      const newFolderName = `${nome} ${cognome}`.trim() || `Beneficiario ${targetCF}`;
      memberFolder = nucleoFolder.createFolder(newFolderName);
      Logger.log("Creata sottocartella membro beneficiario: " + newFolderName + " (ID: " + memberFolder.getId() + ")");
    }

    // Salva l'ID nel foglio Beneficiari per i futuri accessi O(1)
    try {
      BeneficiarioRepository.updateDriveInfo(targetCF, { idCartella: memberFolder.getId() });
    } catch (saveErr) {
      Logger.log("Impossibile salvare idCartella beneficiario nel foglio: " + saveErr.message);
    }

    return { id: memberFolder.getId(), url: memberFolder.getUrl(), name: memberFolder.getName() };
  }

  /**
   * Salva la firma autografa acquisita (Canvas o upload) nella cartella personale del beneficiario.
   * Il file viene denominato `Firma <Nome> <Cognome>.png`.
   * L'ID del file viene salvato nella colonna 'Firma' del foglio Beneficiari.
   * 
   * @param {string} cf - Codice Fiscale del firmatario.
   * @param {string} base64Data - Immagine PNG codificata in Base64 (con o senza prefisso data URI).
   * @return {{ success: boolean; fileId: string; fileUrl: string; message: string }}
   */
  static saveBeneficiarySignature(cf, base64Data) {
    if (!cf) throw new Error("Codice Fiscale obbligatorio per il salvataggio della firma.");
    if (!base64Data) throw new Error("Dati immagine della firma mancanti.");

    const targetCF = cf.toUpperCase().trim();
    const beneficiari = BeneficiarioRepository.getAll();
    const ben = beneficiari.find(b => (b.cf || "").toUpperCase().trim() === targetCF);
    if (!ben) {
      throw new Error("Beneficiario con Codice Fiscale '" + targetCF + "' non trovato.");
    }

    // 1. Recupera o crea la cartella personale del beneficiario
    const folderInfo = DriveManager.getOrCreateBeneficiarioFolder(targetCF);
    const folder = DriveApp.getFolderById(folderInfo.id);

    // 2. Decodifica Base64 e crea il Blob immagine trasparente
    const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const nome = (ben.nome || ben.name || "").trim();
    const cognome = (ben.cognome || ben.surname || "").trim();
    const fileName = `Firma ${nome} ${cognome}.png`.trim();
    const blob = Utilities.newBlob(decodedBytes, "image/png", fileName);

    // 3. Rimuove eventuali firme precedenti per evitare file duplicati
    const existingFiles = folder.getFiles();
    while (existingFiles.hasNext()) {
      const f = existingFiles.next();
      if (!f.isTrashed() && /^firma/i.test(f.getName())) {
        f.setTrashed(true);
      }
    }

    // 4. Salva il nuovo file immagine
    const file = folder.createFile(blob);
    const fileId = file.getId();
    const fileUrl = file.getUrl();

    // 5. Memorizza l'ID file nella colonna 'Firma' del foglio Beneficiari
    BeneficiarioRepository.updateDriveInfo(targetCF, { firma: fileId });

    // 6. Sincronizza il documento nel foglio 'Documenti'
    try {
      if (typeof DocumentoRepository !== "undefined") {
        const existingDocs = DocumentoRepository.getByCF(targetCF);
        const existingFirma = existingDocs.find(d => d.tipo === "Firma Autografa" || d.tipo === "Firma");
        DocumentoRepository.add({
          id: existingFirma ? existingFirma.id : undefined,
          intestatario: targetCF,
          tipo: "Firma Autografa",
          categoria: "Anagrafica",
          idDrive: fileId,
          note: "Firma acquisita digitalmente"
        });
      }
    } catch (docRepoErr) {
      Logger.log("saveBeneficiarySignature - registrazione Documenti: " + (docRepoErr instanceof Error ? docRepoErr.message : String(docRepoErr)));
    }

    return {
      success: true,
      fileId: fileId,
      fileUrl: fileUrl,
      message: "Firma autografa salvata con successo."
    };
  }

  /**
   * Salva un file documento (Base64) nella corretta cartella Google Drive (cartella nucleo o sottocartella personale)
   * e registra contestualmente il record nel foglio relazionale 'Documenti'.
   * 
   * @param {string} cf - Codice Fiscale del beneficiario firmatario o titolare.
   * @param {{
   *   base64Data: string;
   *   mimeType?: string;
   *   fileName?: string;
   *   tipoDocumento?: string;
   *   categoria?: string;
   *   valore?: number | null;
   *   dataScadenza?: string;
   *   dataEmissione?: string;
   *   note?: string;
   * }} docPayload - Metadati e contenuto del file.
   * @param {string|number} [nucleoId] - ID del nucleo familiare (per documenti di pertinenza del nucleo, es. ISEE).
   * @return {{ success: boolean; fileId: string; fileUrl: string; docId?: number|string; fileName: string; message: string }}
   */
  static saveDocumentFile(cf, docPayload, nucleoId) {
    if (!cf) throw new Error("Codice Fiscale obbligatorio per l'archiviazione del documento.");
    if (!docPayload || !docPayload.base64Data) throw new Error("Dati del file documento mancanti.");

    const targetCF = cf.toUpperCase().trim();
    const beneficiari = (typeof BeneficiarioRepository !== "undefined") ? BeneficiarioRepository.getAll() : [];
    const ben = beneficiari.find(b => (b.cf || "").toUpperCase().trim() === targetCF);

    const nomePersona = ben ? ((ben.nome || "") + " " + (ben.cognome || "")).trim() : targetCF;
    const nId = nucleoId || (ben ? ben.idNucleo : "");

    // 1. Identifica tipologia e catalogo SSOT
    let tipo = docPayload.tipoDocumento || "Altro";
    let categoria = docPayload.categoria || "Altro";
    let docRecord = null;
    if (typeof findDocumentType === "function") {
      docRecord = findDocumentType(tipo);
      if (docRecord) {
        tipo = docRecord.name;
        categoria = docRecord.categoria;
      }
    }

    // 2. Determina la cartella di destinazione:
    // Se lo scope è "nucleo" (es. ISEE, Contratto Locazione), salva nella cartella del nucleo.
    // Altrimenti (documento personale), salva nella sottocartella personale del beneficiario.
    let targetFolder = null;
    const isNucleoScope = docRecord && docRecord.scope === "nucleo";
    if (isNucleoScope && nId) {
      const nucInfo = DriveManager.getOrCreateNucleoFolder(nId, nomePersona);
      targetFolder = DriveApp.getFolderById(nucInfo.id);
    } else {
      const benInfo = DriveManager.getOrCreateBeneficiarioFolder(targetCF);
      targetFolder = DriveApp.getFolderById(benInfo.id);
    }

    // 3. Calcola il nome formale standard del file tramite buildDocumentFileName
    let standardName = docPayload.fileName || docPayload.name || "documento.pdf";
    if (typeof buildDocumentFileName === "function") {
      standardName = buildDocumentFileName(tipo, nomePersona, {
        dataScadenza: docPayload.dataScadenza,
        dataEmissione: docPayload.dataEmissione,
        originalName: docPayload.fileName || docPayload.name
      });
    }

    // 4. Decodifica e crea il file in Drive
    let cleanBase64 = docPayload.base64Data;
    let detectedMime = docPayload.mimeType || "application/pdf";
    const dataUriMatch = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1];
      cleanBase64 = dataUriMatch[2];
    }
    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodedBytes, detectedMime, standardName);
    const file = targetFolder.createFile(blob);
    const fileId = file.getId();
    const fileUrl = file.getUrl();

    // 5. Registra nel foglio relazionale 'Documenti'
    let docId = "";
    if (typeof DocumentoRepository !== "undefined") {
      const addRes = DocumentoRepository.add({
        intestatario: targetCF,
        tipo: tipo,
        categoria: categoria,
        valore: (docPayload.valore !== undefined && docPayload.valore !== null && !isNaN(Number(docPayload.valore))) ? Number(docPayload.valore) : null,
        dataEmissione: docPayload.dataEmissione || "",
        dataScadenza: docPayload.dataScadenza || "",
        idDrive: fileId,
        note: docPayload.note || `Caricato da interfaccia Web App (${standardName})`
      });
      if (addRes && addRes.success && addRes.data) {
        docId = addRes.data.id;
      }
    }

    return {
      success: true,
      fileId: fileId,
      fileUrl: fileUrl,
      docId: docId,
      fileName: standardName,
      message: `Documento '${standardName}' archiviato con successo.`
    };
  }

  /**
   * Scansiona i documenti presenti nella cartella di un Beneficiario,
   * categorizzandoli tramite regex intelligente e aggiornando il foglio se necessario.
   * 
   * @param {string} cf - Codice Fiscale del beneficiario.
   * @return {{
   *   folder: { id: string; url: string; name: string };
   *   documents: Record<string, { id: string; name: string; url: string; lastUpdated: string }>;
   *   otherFiles: Array<{ id: string; name: string; url: string; mimeType: string }>;
   * }}
   */
  static scanBeneficiarioDocuments(cf) {
    if (!cf) throw new Error("Codice Fiscale obbligatorio.");
    const targetCF = cf.toUpperCase().trim();
    const folderInfo = DriveManager.getOrCreateBeneficiarioFolder(targetCF);
    const folder = DriveApp.getFolderById(folderInfo.id);

    const patterns = {
      firma: /(firma|signature|sig)/i,
      patente: /(patente|guida|driving)/i,
      cartaIdentita: /(carta.*identit|c[\._\s-]?i\b|doc.*identit)/i,
      permessoSoggiorno: /(permesso.*sogg|pds\b|titolo.*sogg)/i,
      tesseraSanitaria: /(tessera.*sanit|cns\b|codice.*fisc|cf\b)/i,
      passaporto: /(passaporto|passport)/i
    };

    const documents = {};
    const otherFiles = [];
    const updatesToSave = {};

    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed()) continue;

      const fName = file.getName();
      let matchedType = null;
      let docRecord = null;

      if (typeof findDocumentType === "function") {
        const found = findDocumentType(fName);
        if (found && found.id !== "ALTRO" && found.scope !== "nucleo") {
          matchedType = found.id.toLowerCase();
          docRecord = found;
        }
      }

      if (!matchedType) {
        for (const [typeKey, regex] of Object.entries(patterns)) {
          if (!documents[typeKey] && regex.test(fName)) {
            matchedType = typeKey;
            break;
          }
        }
      }

      const fileObj = {
        id: file.getId(),
        name: fName,
        url: file.getUrl(),
        lastUpdated: file.getLastUpdated().toISOString(),
        mimeType: file.getMimeType(),
        tipo: docRecord ? docRecord.name : (matchedType || "Altro"),
        categoria: docRecord ? docRecord.categoria : "Altro",
        archetipo: docRecord ? docRecord.archetipo : "UNICO",
        icona: docRecord ? docRecord.icona : "bi-file-earmark",
        emoji: docRecord ? docRecord.emoji : "📄",
        hasValue: docRecord ? docRecord.hasValue : false,
        hasExpiration: docRecord ? docRecord.hasExpiration : false
      };

      if (matchedType) {
        documents[matchedType] = fileObj;
        updatesToSave[matchedType] = file.getId();
      } else {
        otherFiles.push(fileObj);
      }
    }

    // Aggiorna il foglio con gli ID trovati
    if (Object.keys(updatesToSave).length > 0) {
      try {
        BeneficiarioRepository.updateDriveInfo(targetCF, updatesToSave);
      } catch (err) {
        Logger.log("Errore aggiornamento colonne documenti da scansione: " + err.message);
      }
    }

    return {
      folder: folderInfo,
      documents: documents,
      otherFiles: otherFiles
    };
  }

  /**
   * Scansiona i documenti a livello di Nucleo Familiare (Contratto, ISEE, ecc.).
   * 
   * @param {string|number} nucleoId - Identificativo del nucleo.
   * @return {{
   *   folder: { id: string; url: string; name: string };
   *   documents: Record<string, { id: string; name: string; url: string }>;
   *   otherFiles: Array<{ id: string; name: string; url: string }>;
   * }}
   */
  static scanNucleoDocuments(nucleoId) {
    if (!nucleoId && nucleoId !== 0) throw new Error("ID nucleo obbligatorio.");
    const folderInfo = DriveManager.getOrCreateNucleoFolder(nucleoId);
    const folder = DriveApp.getFolderById(folderInfo.id);

    const patterns = {
      contrattoLocazione: /(contratt.*locaz|locazione|affitto)/i,
      isee: /(isee|dsu)/i,
      schedaSegnalazione: /(scheda.*segnalazione|segnalazione)/i
    };

    const documents = {};
    const otherFiles = [];

    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed()) continue;

      const fName = file.getName();
      let matchedType = null;
      let docRecord = null;

      if (typeof findDocumentType === "function") {
        const found = findDocumentType(fName);
        if (found && found.id !== "ALTRO" && (found.scope === "nucleo" || found.scope === "entrambi")) {
          matchedType = found.id.toLowerCase();
          docRecord = found;
        }
      }

      if (!matchedType) {
        for (const [typeKey, regex] of Object.entries(patterns)) {
          if (!documents[typeKey] && regex.test(fName)) {
            matchedType = typeKey;
            break;
          }
        }
      }

      const fileObj = {
        id: file.getId(),
        name: fName,
        url: file.getUrl(),
        mimeType: file.getMimeType(),
        tipo: docRecord ? docRecord.name : (matchedType || "Altro"),
        categoria: docRecord ? docRecord.categoria : "Altro",
        archetipo: docRecord ? docRecord.archetipo : "UNICO",
        icona: docRecord ? docRecord.icona : "bi-file-earmark",
        emoji: docRecord ? docRecord.emoji : "📄",
        hasValue: docRecord ? docRecord.hasValue : false,
        hasExpiration: docRecord ? docRecord.hasExpiration : false
      };

      if (matchedType) {
        documents[matchedType] = fileObj;
      } else {
        otherFiles.push(fileObj);
      }
    }

    return {
      folder: folderInfo,
      documents: documents,
      otherFiles: otherFiles
    };
  }
}
