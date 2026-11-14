/**
 * @file DocumentIntelligence.js
 * @description Servizio di Document Intelligence e Computer Vision basato su Google Gemini Flash.
 * Esegue l'analisi multimodale di scansioni (PDF) e immagini (JPEG/PNG) di documenti di identità,
 * permessi di soggiorno, attestazioni ISEE, patenti e buste paga, estraendo dati strutturati (JSON)
 * per l'autocompilazione rapida dei form e la catalogazione automatica.
 * Supporta analisi multi-file simultanea (es. fronte/retro CIE o CIE + ISEE) e normalizzazione Title Case.
 * @module Service/Document/DocumentIntelligence
 */

/**
 * Servizio per l'analisi intelligente dei documenti tramite IA.
 */
class DocumentIntelligence {
  /**
   * Verifica se il servizio Gemini è configurato e operativo con una chiave API valida.
   * @return {boolean}
   */
  static isAvailable() {
    try {
      if (typeof CONFIG === "undefined" || !CONFIG.GEMINI || !CONFIG.GEMINI.getApiKey) {
        return false;
      }
      const key = CONFIG.GEMINI.getApiKey();
      return typeof key === "string" && key.trim().length > 10;
    } catch (e) {
      return false;
    }
  }

  /**
   * Analizza uno o più Blob (immagini o PDF) contemporaneamente tramite Google Gemini Flash.
   * Estrae i dati anagrafici consolidati e l'elenco dei documenti riconosciuti.
   * 
   * @param {GoogleAppsScript.Base.Blob|GoogleAppsScript.Base.Blob[]} blobs - Blob singolo o array di Blob.
   * @return {{
   *   success: boolean;
   *   data?: {
   *     tipoDocumento: string;
   *     categoria: string;
   *     datiPersona: {
   *       nome: string;
   *       cognome: string;
   *       codiceFiscale: string;
   *       dataNascita: string;
   *       luogoNascita: string;
   *       sesso: string;
   *       cittadinanza: string;
   *       residenza: string;
   *     };
   *     datiDocumento: {
   *       numeroDocumento: string;
   *       dataEmissione: string;
   *       dataScadenza: string;
   *       valore: number | null;
   *       enteRilascio: string;
   *       note: string;
   *     };
   *     documenti: Array<{
   *       tipoDocumento: string;
   *       categoria: string;
   *       numeroDocumento: string;
   *       dataEmissione: string;
   *       dataScadenza: string;
   *       valore: number | null;
   *       enteRilascio: string;
   *       note: string;
   *     }>;
   *     valoreISEE?: number | null;
   *   };
   *   message?: string;
   * }}
   */
  static analyzeBlobs(blobs) {
    const blobList = Array.isArray(blobs) ? blobs.filter(b => !!b) : (blobs ? [blobs] : []);
    if (blobList.length === 0) {
      return { success: false, message: "Nessun blob valido fornito per l'analisi." };
    }

    if (!DocumentIntelligence.isAvailable()) {
      return {
        success: false,
        message: "Chiave Google Gemini API non configurata. Inserisci la proprietà 'GEMINI_API_KEY' nelle Proprietà dello Script."
      };
    }

    const apiKey = CONFIG.GEMINI.getApiKey();
    const primaryModel = (CONFIG.GEMINI && CONFIG.GEMINI.getModel) ? CONFIG.GEMINI.getModel() : ((CONFIG.GEMINI && CONFIG.GEMINI.MODEL) || "gemini-flash-latest");

    // Cascata di modelli resilienti per tier generici (Flash -> Flash-Lite -> Pro)
    const candidateModels = [
      primaryModel,
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-pro-latest"
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    const promptText = `
Sei l'assistente ufficiale di Document Intelligence dello sportello sociale "La Bussola dell'Abitare" (Municipio XI di Roma Capitale).
Analizza attentamente i documenti forniti (immagini o PDF). I file possono rappresentare:
- Più pagine dello stesso documento (es. fronte e retro di una Carta d'Identità o Tessera Sanitaria);
- Documenti differenti della stessa persona/nucleo (es. Carta d'Identità + Attestazione ISEE + Permesso di Soggiorno).

Devi estrarre e consolidare tutte le informazioni leggibili in un unico oggetto JSON conforme alla seguente struttura esatta:
{
  "datiPersona": {
    "nome": "stringa o vuota",
    "cognome": "stringa o vuota",
    "codiceFiscale": "stringa 16 caratteri MAIUSCOLI o vuota",
    "dataNascita": "YYYY-MM-DD o vuota",
    "luogoNascita": "stringa o vuota",
    "sesso": "M" | "F" | "",
    "cittadinanza": "stringa o vuota",
    "residenza": "stringa indirizzo o vuota",
    "fotoVisoBox": [ymin, xmin, ymax, xmax] o null
  },
  "documenti": [
    {
      "tipoDocumento": "Carta d'Identità" | "Permesso di Soggiorno" | "Patente di Guida" | "Passaporto" | "Attestazione ISEE" | "Tessera Sanitaria" | "Codice Fiscale" | "Contratto di Locazione" | "Busta Paga" | "Firma Autografa" | "Altro",
      "numeroDocumento": "stringa o vuota",
      "dataEmissione": "YYYY-MM-DD o vuota",
      "dataScadenza": "YYYY-MM-DD o vuota",
      "valore": number o null,
      "enteRilascio": "stringa o vuota",
      "note": "breve sintesi del documento"
    }
  ],
  "entitaGeometriche": [
    {
      "tipoDocumento": "stringa",
      "lato": "FRONTE" | "RETRO" | "UNICO",
      "numeroDocumento": "stringa o vuota",
      "codiceFiscale": "stringa o vuota",
      "angoli": [
        {"x": number, "y": number},
        {"x": number, "y": number},
        {"x": number, "y": number},
        {"x": number, "y": number}
      ],
      "rotazioneGradi": 0 | 90 | 180 | 270,
      "qualitaRilevata": "🟢 OTTIMALE" | "🟡 FOTO GREZZA" | "⚠️ DA UNIFICARE" | "🔴 MULTIPLO / DA SEPARARE"
    }
  ],
  "valoreISEE": number o null
}

REGOLE TASSATIVE DI FORMATTAZIONE, RITAGLIO E GEOMETRIA:
1. "nome" e "cognome": Usa SEMPRE la prima lettera maiuscola e le successive minuscole (Title Case, es: 'Mario', 'Rossi', 'De Luca', 'D'Angelo'). NON LASCIARE MAI TUTTO MAIUSCOLO.
2. "luogoNascita": Usa Title Case per il comune, con la sigla della provincia di 2 lettere obbligatoriamente MAIUSCOLA tra parentesi (es: 'Reggio nell'Emilia (RE)', 'Roma (RM)', 'San Donato Milanese (MI)').
3. "residenza": Usa Title Case per indirizzo e comune (es: 'Via dei Mille 10, 00185 Roma (RM)').
4. "codiceFiscale": Estrai il Codice Fiscale italiano esatto a 16 caratteri alfanumerici MAIUSCOLI.
5. "valoreISEE": Se tra i documenti è presente un'Attestazione ISEE, estrai il valore dell'ISEE ordinario o corrente (numero decimale in € senza simboli di valuta, es. 8450.50).
6. "dataEmissione" e "dataScadenza": Converti sempre le date nel formato standard YYYY-MM-DD.
7. "fotoVisoBox": Se è presente un documento di riconoscimento con fototessera (CIE, patente, passaporto, permesso di soggiorno), indica le coordinate normalizzate 0-1000 del box del viso [ymin, xmin, ymax, xmax]. Altrimenti null.
8. "entitaGeometriche": Se l'immagine contiene una o più tessere o fogli (es. CIE fronte, retro, tessera sanitaria appoggiati sul tavolo o inclinati), per ciascuna entità individua i 4 vertici [alto-sx, alto-dx, basso-dx, basso-sx] in scala 0-1000, specificando se è FRONTE o RETRO e la rotazione (0, 90, 180, 270 gradi) necessaria per la lettura orizzontale. Se la foto ha sfondi inutili (tavolo, dita), segnala qualitaRilevata come '🟡 FOTO GREZZA' o '🔴 MULTIPLO / DA SEPARARE'.
9. In caso di campi illeggibili, parzialmente coperti o non presenti nei documenti, lascia stringa vuota "" (o null per valore), NON inventare MAI informazioni.
`;

    // Costruisce l'array delle parti multimodali
    const parts = [{ text: promptText }];
    blobList.forEach(blob => {
      const mimeType = blob.getContentType() || "application/pdf";
      const base64Content = Utilities.base64Encode(blob.getBytes());
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Content
        }
      });
    });

    const requestPayload = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    };

    let lastErrorMsg = "";
    let lastStatusCode = 0;

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const currentModel = candidateModels[mIdx];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const options = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(requestPayload),
            muteHttpExceptions: true
          };

          const response = UrlFetchApp.fetch(endpoint, options);
          const code = response.getResponseCode();
          const responseText = response.getContentText();

          if (code === 200) {
            const jsonResp = JSON.parse(responseText);
            const candidates = jsonResp.candidates;
            if (!candidates || candidates.length === 0) {
              lastErrorMsg = `Nessuna risposta generata dal modello IA (${currentModel}).`;
              break;
            }

            const rawText = candidates[0].content && candidates[0].content.parts && candidates[0].content.parts[0] && candidates[0].content.parts[0].text;
            if (!rawText) {
              lastErrorMsg = `Risposta testuale assente dal modello IA (${currentModel}).`;
              break;
            }

            const parsedData = JSON.parse(rawText);

            // Normalizzazione Title Case deterministica sui dati persona
            const p = parsedData.datiPersona || {};
            if (typeof normalizeProperCase === "function") {
              if (p.nome) p.nome = normalizeProperCase(p.nome);
              if (p.cognome) p.cognome = normalizeProperCase(p.cognome);
            }
            if (typeof normalizeCity === "function" && p.luogoNascita) {
              p.luogoNascita = normalizeCity(p.luogoNascita);
            }
            if (typeof normalizeAddress === "function" && p.residenza) {
              p.residenza = normalizeAddress(p.residenza);
            }
            if (typeof normalizeFiscalCode === "function" && p.codiceFiscale) {
              p.codiceFiscale = normalizeFiscalCode(p.codiceFiscale);
            } else if (p.codiceFiscale) {
              p.codiceFiscale = String(p.codiceFiscale).toUpperCase().trim();
            }

            // Normalizzazione elenco documenti e risoluzione categorie dal catalogo SSOT
            const rawDocs = Array.isArray(parsedData.documenti) ? parsedData.documenti : (parsedData.datiDocumento ? [parsedData.datiDocumento] : []);
            const normalizedDocs = rawDocs.map(doc => {
              let tipo = doc.tipoDocumento || parsedData.tipoDocumento || "Altro";
              let categoria = "Altro";
              if (typeof findDocumentType === "function") {
                const docRecord = findDocumentType(tipo);
                if (docRecord) {
                  tipo = docRecord.name;
                  categoria = docRecord.categoria;
                }
              }
              return {
                tipoDocumento: tipo,
                categoria: categoria,
                numeroDocumento: doc.numeroDocumento || "",
                dataEmissione: doc.dataEmissione || "",
                dataScadenza: doc.dataScadenza || "",
                valore: (doc.valore !== undefined && doc.valore !== null && !isNaN(Number(doc.valore))) ? Number(doc.valore) : null,
                enteRilascio: doc.enteRilascio || "",
                note: doc.note || ""
              };
            });

            // Se non ci sono documenti specifici ma è stato riconosciuto un tipo primario
            if (normalizedDocs.length === 0 && parsedData.tipoDocumento) {
              let tipo = parsedData.tipoDocumento;
              let categoria = "Altro";
              if (typeof findDocumentType === "function") {
                const docRecord = findDocumentType(tipo);
                if (docRecord) {
                  tipo = docRecord.name;
                  categoria = docRecord.categoria;
                }
              }
              normalizedDocs.push({
                tipoDocumento: tipo,
                categoria: categoria,
                numeroDocumento: "",
                dataEmissione: "",
                dataScadenza: "",
                valore: null,
                enteRilascio: "",
                note: ""
              });
            }

            const primaryDoc = normalizedDocs.length > 0 ? normalizedDocs[0] : {
              tipoDocumento: "Altro",
              categoria: "Altro",
              numeroDocumento: "",
              dataEmissione: "",
              dataScadenza: "",
              valore: null,
              enteRilascio: "",
              note: ""
            };

            // Individua eventuale valore ISEE tra i documenti o nei campi principali
            let iseeVal = parsedData.valoreISEE || null;
            if (iseeVal === null) {
              const iseeDoc = normalizedDocs.find(d => /isee/i.test(d.tipoDocumento) && d.valore !== null);
              if (iseeDoc) iseeVal = iseeDoc.valore;
            }

            const fotoBox = Array.isArray(p.fotoVisoBox) ? p.fotoVisoBox : (Array.isArray(parsedData.fotoVisoBox) ? parsedData.fotoVisoBox : null);
            const geometricEntities = Array.isArray(parsedData.entitaGeometriche) ? parsedData.entitaGeometriche : [];

            return {
              success: true,
              data: {
                tipoDocumento: primaryDoc.tipoDocumento,
                categoria: primaryDoc.categoria,
                datiPersona: p,
                datiDocumento: primaryDoc,
                documenti: normalizedDocs,
                valoreISEE: iseeVal,
                entitaGeometriche: geometricEntities,
                fotoVisoBox: fotoBox
              },
              modelUsed: currentModel
            };
          }

          lastStatusCode = code;
          if (code === 503 || code === 429) {
            Logger.log(`DocumentIntelligence: modello ${currentModel} sovraccarico (HTTP ${code}), tentativo ${attempt}/${maxAttempts}`);
            lastErrorMsg = `Modello ${currentModel} temporaneamente sovraccarico (HTTP ${code}).`;
            if (attempt < maxAttempts) {
              if (typeof Utilities !== "undefined" && Utilities.sleep) Utilities.sleep(1200 * attempt);
              continue;
            } else {
              break; // Passa al modello alternativo successivo nella cascata
            }
          } else {
            Logger.log(`DocumentIntelligence: errore HTTP ${code} con ${currentModel}: ${responseText.slice(0, 200)}`);
            lastErrorMsg = `Errore API Gemini (${currentModel}, HTTP ${code}): ${responseText.slice(0, 200)}`;
            break;
          }

        } catch (fetchErr) {
          const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          Logger.log(`DocumentIntelligence: eccezione chiamata a ${currentModel} (tentativo ${attempt}): ${errMsg}`);
          lastErrorMsg = `Timeout o interruzione di rete con ${currentModel}: ${errMsg}`;
          if (attempt < maxAttempts) {
            if (typeof Utilities !== "undefined" && Utilities.sleep) Utilities.sleep(1000 * attempt);
            continue;
          } else {
            break; // Passa al modello alternativo
          }
        }
      }
    }

    let userFriendlyMsg = "I server di Google Gemini sono temporaneamente congestionati (errore 503 / timeout).";
    if (lastStatusCode === 404) {
      userFriendlyMsg = "I modelli Google Gemini configurati non sono supportati o risultano deprecati (HTTP 404).";
    } else if (lastStatusCode === 401 || lastStatusCode === 403) {
      userFriendlyMsg = `Autenticazione Google Gemini non valida o autorizzazione negata (HTTP ${lastStatusCode}).`;
    } else if (lastStatusCode === 429) {
      userFriendlyMsg = "Quota o limite di richieste Google Gemini superato (HTTP 429).";
    }

    return {
      success: false,
      message: `${userFriendlyMsg} Dettaglio: ${lastErrorMsg || ('HTTP ' + lastStatusCode)}. Riprova tra pochi istanti.`
    };
  }

  /**
   * Analizza un singolo Blob (mantenuto per retrocompatibilità).
   * @param {GoogleAppsScript.Base.Blob} blob
   * @return {Record<string, any>}
   */
  static analyzeBlob(blob) {
    return DocumentIntelligence.analyzeBlobs(blob ? [blob] : []);
  }

  /**
   * Analizza un singolo file inviato dal frontend come stringa Base64.
   * @param {string} base64Data - Dati Base64.
   * @param {string} [mimeType="application/pdf"]
   * @param {string} [fileName="documento.pdf"]
   * @return {Record<string, any>}
   */
  static smartClassifyBase64(base64Data, mimeType = "application/pdf", fileName = "documento.pdf") {
    return DocumentIntelligence.smartClassifyMultipleBase64([{
      base64Data: base64Data,
      mimeType: mimeType,
      fileName: fileName
    }]);
  }

  /**
   * Analizza una lista di file inviati dal frontend come array di stringhe Base64.
   * 
   * @param {Array<{ base64Data: string; mimeType?: string; fileName?: string }>} filesArray
   * @return {Record<string, any>}
   */
  static smartClassifyMultipleBase64(filesArray) {
    try {
      if (!Array.isArray(filesArray) || filesArray.length === 0) {
        return { success: false, message: "Nessun file fornito per l'analisi." };
      }

      const blobs = [];
      for (const item of filesArray) {
        if (!item || !item.base64Data) continue;

        let cleanBase64 = item.base64Data;
        let detectedMime = item.mimeType || "application/pdf";
        const name = item.fileName || item.name || "documento.pdf";

        const dataUriMatch = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUriMatch) {
          detectedMime = dataUriMatch[1];
          cleanBase64 = dataUriMatch[2];
        }

        const decodedBytes = Utilities.base64Decode(cleanBase64);
        blobs.push(Utilities.newBlob(decodedBytes, detectedMime, name));
      }

      if (blobs.length === 0) {
        return { success: false, message: "Dati Base64 non validi." };
      }

      return DocumentIntelligence.analyzeBlobs(blobs);
    } catch (e) {
      Logger.log("smartClassifyMultipleBase64 errore: " + e.message);
      return { success: false, message: e.message };
    }
  }
}
