/**
 * @file Documento.js
 * @description Modello per la gestione dei documenti e delle relative scadenze del fascicolo beneficiario.
 * Rappresenta un record della tabella relazionale 'Documenti' collegata tramite codice fiscale al Beneficiario.
 * Fornisce metodi per il calcolo automatico dello stato di validità (Scaduto, In Scadenza, Valido, Permanente),
 * il conteggio dei giorni residui e la serializzazione per la Web App.
 * @module Models/Documenti/Documento
 */

/**
 * @typedef {"VALIDO" | "IN_SCADENZA" | "SCADUTO" | "PERMANENTE"} DocumentoStatoScadenza
 */

/**
 * @typedef {Object} DocumentoData
 * @property {number|string} [id] - Identificativo univoco progressivo (es. 1, 2, 3...)
 * @property {string} intestatario - Codice Fiscale dell'intestatario/beneficiario (Foreign Key)
 * @property {string} tipo - Tipo del documento (es. "Carta d'Identità", "Attestazione ISEE", "Permesso di Soggiorno")
 * @property {string} [categoria] - Categoria documentale ("Anagrafica", "Soggiorno", "Economica", "Abitativa", ecc.)
 * @property {number|null} [valore] - Valore economico in € se applicabile (es. 6450.00 per ISEE, 600.00 per affitto)
 * @property {string|Date|null} [dataEmissione] - Data di emissione o rilascio (formato YYYY-MM-DD o Date)
 * @property {string|Date|null} [dataScadenza] - Data di scadenza (formato YYYY-MM-DD o Date)
 * @property {string} [idDrive] - Identificativo del file memorizzato su Google Drive
 * @property {string} [note] - Annotazioni opzionali o dettagli dell'ente emittente
 * @property {string|Date|null} [dataInserimento] - Timestamp di inserimento nel sistema
 */

/**
 * Modello di dominio per un singolo documento del fascicolo.
 */
class Documento {
  /**
   * Crea un'istanza di Documento.
   * @param {DocumentoData} data - Dati grezzi del documento.
   */
  constructor(data = {}) {
    this.id = data.id !== undefined && data.id !== null && data.id !== "" ? Number(data.id) : null;
    this.intestatario = (data.intestatario || "").toString().trim().toUpperCase();
    this.tipo = (data.tipo || "Altro").toString().trim();

    // Se la categoria non è esplicitata, la deduce dal catalogo di dominio SSOT
    if (data.categoria) {
      this.categoria = data.categoria.toString().trim();
    } else if (typeof findDocumentType === "function") {
      const rec = findDocumentType(this.tipo);
      this.categoria = rec ? rec.categoria : "Altro";
    } else {
      this.categoria = "Altro";
    }

    // Valore economico numerico
    if (data.valore !== undefined && data.valore !== null && data.valore !== "") {
      const parsedVal = typeof data.valore === "number" ? data.valore : parseFloat(String(data.valore).replace(",", "."));
      this.valore = isNaN(parsedVal) ? null : parsedVal;
    } else {
      this.valore = null;
    }

    this.dataEmissione = Documento._normalizeDateString(data.dataEmissione);
    this.dataScadenza = Documento._normalizeDateString(data.dataScadenza);
    this.qualita = (data.qualita || data.qualitaDocumento || "🟢 OTTIMALE").toString().trim();
    this.idDrive = (data.idDrive || "").toString().trim();
    this.note = (data.note || "").toString().trim();
    this.dataInserimento = Documento._normalizeDateString(data.dataInserimento) || new Date().toISOString().split("T")[0];
  }

  /**
   * Normalizza qualsiasi input di data in stringa 'YYYY-MM-DD'.
   * @private
   * @param {string|Date|null} val - Il valore da normalizzare.
   * @return {string} Data formattata YYYY-MM-DD o stringa vuota.
   */
  static _normalizeDateString(val) {
    if (!val) return "";
    if (val instanceof Date && !isNaN(val.getTime())) {
      try {
        const tz = (typeof Session !== "undefined" && Session.getScriptTimeZone && Session.getScriptTimeZone()) || "Europe/Rome";
        if (typeof Utilities !== "undefined" && Utilities.formatDate) {
          return Utilities.formatDate(val, tz, "yyyy-MM-dd");
        }
      } catch (e) {
        // Fallback standard JS
      }
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const s = String(val).trim();
    if (s.includes("T")) {
      return s.split("T")[0];
    }
    // Riconosce formato DD/MM/YYYY
    const matchDmy = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (matchDmy) {
      const day = matchDmy[1].padStart(2, "0");
      const month = matchDmy[2].padStart(2, "0");
      const year = matchDmy[3];
      return `${year}-${month}-${day}`;
    }
    return s;
  }

  /**
   * Restituisce il record descrittivo completo del documento dal catalogo di dominio.
   * @return {DocumentRecord|null}
   */
  getDocRecord() {
    if (typeof findDocumentType === "function") {
      return findDocumentType(this.tipo);
    }
    return null;
  }

  /**
   * Calcola lo stato di scadenza del documento rispetto a una data di riferimento (di default oggi).
   * 
   * - 🔴 **SCADUTO**: Data Scadenza < Oggi
   * - 🟡 **IN_SCADENZA**: Oggi <= Data Scadenza <= Oggi + 60 giorni
   * - 🟢 **VALIDO**: Data Scadenza > Oggi + 60 giorni
   * - ⚪ **PERMANENTE**: Documento senza scadenza (o tipo con hasExpiration: false)
   * 
   * @param {Date} [referenceDate=new Date()] - Data di confronto.
   * @return {DocumentoStatoScadenza}
   */
  getStatoScadenza(referenceDate = new Date()) {
    const rec = this.getDocRecord();
    if (rec && rec.hasExpiration === false) {
      return "PERMANENTE";
    }

    if (!this.dataScadenza) {
      return "PERMANENTE";
    }

    const scad = new Date(this.dataScadenza);
    if (isNaN(scad.getTime())) {
      return "PERMANENTE";
    }

    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);
    scad.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((scad.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "SCADUTO";
    }
    if (diffDays <= 60) {
      return "IN_SCADENZA";
    }
    return "VALIDO";
  }

  /**
   * Calcola i giorni mancanti alla scadenza (o trascorsi dalla scadenza se negativi).
   * @param {Date} [referenceDate=new Date()] - Data di confronto.
   * @return {number|null} Numero di giorni o null se non soggetto a scadenza.
   */
  getGiorniAllaScadenza(referenceDate = new Date()) {
    if (!this.dataScadenza) return null;
    const scad = new Date(this.dataScadenza);
    if (isNaN(scad.getTime())) return null;

    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);
    scad.setHours(0, 0, 0, 0);

    return Math.ceil((scad.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Restituisce l'URL visualizzabile su Google Drive del file, se presente.
   * @return {string}
   */
  getUrlDrive() {
    if (!this.idDrive) return "";
    return `https://drive.google.com/file/d/${this.idDrive}/view`;
  }

  /**
   * Idrata un'istanza di Documento a partire da una riga di Google Sheets e dalla mappa degli indici.
   * @param {any[]} row - Array di valori della riga.
   * @param {Record<string, number>} idx - Mappa degli indici delle colonne.
   * @return {Documento}
   */
  static fromRow(row, idx) {
    const rawVal = getSheetVal(row, idx, "valore", "");
    const parsedVal = rawVal !== "" ? parseFloat(rawVal.replace(",", ".")) : null;

    return new Documento({
      id: getSheetVal(row, idx, "id", null),
      intestatario: getSheetVal(row, idx, "intestatario", ""),
      tipo: getSheetVal(row, idx, "tipo", "Altro"),
      categoria: getSheetVal(row, idx, "categoria", ""),
      valore: isNaN(parsedVal) ? null : parsedVal,
      dataEmissione: idx.dataEmissione >= 0 ? row[idx.dataEmissione] : "",
      dataScadenza: idx.dataScadenza >= 0 ? row[idx.dataScadenza] : "",
      qualita: getSheetVal(row, idx, "qualita", "🟢 OTTIMALE"),
      idDrive: getSheetVal(row, idx, "idDrive", ""),
      note: getSheetVal(row, idx, "note", ""),
      dataInserimento: idx.dataInserimento >= 0 ? row[idx.dataInserimento] : ""
    });
  }

  /**
   * Converte l'istanza in un oggetto semplice (POJO) con metadati arricchiti per il frontend.
   * @return {Record<string, any>}
   */
  toObject() {
    const rec = this.getDocRecord();
    return {
      id: this.id,
      intestatario: this.intestatario,
      tipo: this.tipo,
      categoria: this.categoria,
      valore: this.valore,
      dataEmissione: this.dataEmissione,
      dataScadenza: this.dataScadenza,
      qualita: this.qualita || "🟢 OTTIMALE",
      idDrive: this.idDrive,
      note: this.note,
      dataInserimento: this.dataInserimento,
      statoScadenza: this.getStatoScadenza(),
      giorniAllaScadenza: this.getGiorniAllaScadenza(),
      urlDrive: this.getUrlDrive(),
      icona: rec ? rec.icona : "bi-file-earmark",
      emoji: rec ? rec.emoji : "📄",
      archetipo: rec ? rec.archetipo : "UNICO",
      hasValue: rec ? rec.hasValue : false,
      hasExpiration: rec ? rec.hasExpiration : false
    };
  }
}
