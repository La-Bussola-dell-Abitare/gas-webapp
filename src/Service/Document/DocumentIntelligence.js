/**
 * @file DocumentIntelligence.js
 * @description Servizio di Document Intelligence e Computer Vision basato su Google Gemini Flash.
 * Esegue l'analisi multimodale di scansioni (PDF) e immagini (JPEG/PNG) di documenti di identità,
 * permessi di soggiorno, attestazioni ISEE, patenti e buste paga, estraendo dati strutturati (JSON)
 * per l'autocompilazione rapida dei form e la catalogazione automatica.
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
   * Analizza un Blob (PDF, JPEG, PNG, WEBP) tramite l'API di Google Gemini.
   * 
   * @param {GoogleAppsScript.Base.Blob} blob - Il blob del documento da analizzare.
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
   *   };
   *   message?: string;
   * }}
   */
  static analyzeBlob(blob) {
    if (!blob) {
      return { success: false, message: "Blob del file non fornito." };
    }

    if (!DocumentIntelligence.isAvailable()) {
      return {
        success: false,
        message: "Chiave Google Gemini API non configurata. Inserisci la proprietà 'GEMINI_API_KEY' nelle Proprietà dello Script."
      };
    }

    const apiKey = CONFIG.GEMINI.getApiKey();
    const model = (CONFIG.GEMINI && CONFIG.GEMINI.MODEL) || "gemini-2.0-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const mimeType = blob.getContentType() || "application/pdf";
    const base64Content = Utilities.base64Encode(blob.getBytes());

    const promptText = `
Sei l'assistente ufficiale di Document Intelligence dello sportello sociale "La Bussola dell'Abitare" (Roma Capitale).
Analizza attentamente l'immagine o il PDF fornito ed estrai tutti i dati anagrafici e documentali leggibili.

Devi restituire ESCLUSIVAMENTE un oggetto JSON valido conforme alla seguente struttura esatta:
{
  "tipoDocumento": "Carta d'Identità" | "Permesso di Soggiorno" | "Patente di Guida" | "Passaporto" | "Attestazione ISEE" | "Tessera Sanitaria" | "Codice Fiscale" | "Contratto di Locazione" | "Busta Paga" | "Firma Autografa" | "Altro",
  "datiPersona": {
    "nome": "stringa o vuota",
    "cognome": "stringa o vuota",
    "codiceFiscale": "stringa 16 caratteri o vuota",
    "dataNascita": "YYYY-MM-DD o vuota",
    "luogoNascita": "stringa o vuota",
    "sesso": "M" | "F" | "",
    "cittadinanza": "stringa o vuota",
    "residenza": "stringa indirizzo o vuota"
  },
  "datiDocumento": {
    "numeroDocumento": "stringa o vuota",
    "dataEmissione": "YYYY-MM-DD o vuota",
    "dataScadenza": "YYYY-MM-DD o vuota",
    "valore": number o null,
    "enteRilascio": "stringa o vuota",
    "note": "breve sintesi del documento o annotazioni utili"
  }
}

Regole fondamentali di estrazione:
1. "tipoDocumento": riconosci se si tratta di Carta d'Identità (CIE o cartacea), Permesso di Soggiorno (o ricevuta postale), ISEE, Patente, Passaporto, Tessera Sanitaria, Busta Paga o Contratto.
2. "codiceFiscale": estrai il Codice Fiscale italiano esatto a 16 caratteri alfanumerici maiuscoli se presente o calcolabile.
3. "valore": se è un'attestazione ISEE, estrai il valore dell'ISEE ordinario o corrente (numero decimale in € senza simboli di valuta, es. 8450.50). Se è un contratto di locazione, estrai l'importo del canone mensile. Per tutti gli altri documenti imposta null.
4. "dataEmissione" e "dataScadenza": converti sempre le date nel formato standard YYYY-MM-DD.
5. In caso di campi illeggibili, parzialmente coperti o non presenti nel documento, lascia stringa vuota "" (o null per valore), NON inventare MAI informazioni.
`;

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Content
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    };

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

      if (code !== 200) {
        Logger.log(`DocumentIntelligence errore HTTP ${code}: ${responseText}`);
        return {
          success: false,
          message: `Errore nella chiamata all'API Gemini (HTTP ${code}): ${responseText.slice(0, 200)}`
        };
      }

      const jsonResp = JSON.parse(responseText);
      const candidates = jsonResp.candidates;
      if (!candidates || candidates.length === 0) {
        return { success: false, message: "Nessuna risposta generata dal modello IA." };
      }

      const rawText = candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(rawText);

      // Risolve la categoria e arricchisce i dati dal catalogo SSOT Documents
      let tipo = parsedData.tipoDocumento || "Altro";
      let categoria = "Altro";
      if (typeof findDocumentType === "function") {
        const docRecord = findDocumentType(tipo);
        if (docRecord) {
          tipo = docRecord.name;
          categoria = docRecord.categoria;
        }
      }

      return {
        success: true,
        data: {
          tipoDocumento: tipo,
          categoria: categoria,
          datiPersona: parsedData.datiPersona || {},
          datiDocumento: parsedData.datiDocumento || {}
        }
      };

    } catch (err) {
      Logger.log("DocumentIntelligence.analyzeBlob eccezione: " + err.message);
      return {
        success: false,
        message: "Errore durante l'elaborazione del documento: " + err.message
      };
    }
  }

  /**
   * Analizza un file inviato dal frontend sotto forma di stringa Base64.
   * 
   * @param {string} base64Data - Dati del file in formato Base64 (con o senza data URI scheme).
   * @param {string} [mimeType="application/pdf"] - MIME type del file.
   * @param {string} [fileName="documento.pdf"] - Nome originario del file.
   * @return {Record<string, any>}
   */
  static smartClassifyBase64(base64Data, mimeType = "application/pdf", fileName = "documento.pdf") {
    try {
      if (!base64Data) {
        return { success: false, message: "Dati Base64 non forniti." };
      }

      // Estrae eventuale mimeType dall'header data: URI se presente
      let cleanBase64 = base64Data;
      let detectedMime = mimeType;
      const dataUriMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        detectedMime = dataUriMatch[1];
        cleanBase64 = dataUriMatch[2];
      }

      const decodedBytes = Utilities.base64Decode(cleanBase64);
      const blob = Utilities.newBlob(decodedBytes, detectedMime, fileName);

      return DocumentIntelligence.analyzeBlob(blob);
    } catch (e) {
      Logger.log("smartClassifyBase64 errore: " + e.message);
      return { success: false, message: e.message };
    }
  }
}
