/**
 * @file documents.js
 * @description Modulo di dominio per la classificazione, i requisiti e la gestione documentale
 * dello sportello "La Bussola dell'Abitare". Costituisce la Single Source of Truth (SSOT)
 * per tutte le tipologie di documenti (anagrafici, legali, economici, abitativi e sanitari),
 * i loro archetipi di denominazione, metadati (valore, scadenza), icone e regole di matching regex.
 * @module Domain/Documents
 */

/**
 * @typedef {"Anagrafica" | "Soggiorno" | "Economica" | "Abitativa" | "Lavoro" | "Sanitaria" | "Legale" | "Altro"} DocumentCategory
 */

/**
 * @typedef {"SCADENZA" | "ANNUALE" | "PERIODICO" | "CONTRATTO" | "UNICO"} DocumentArchetype
 */

/**
 * @typedef {"persona" | "nucleo" | "entrambi"} DocumentScope
 */

/**
 * @typedef {Object} DocumentRecord
 * @property {string} id - Identificativo univoco costante (es. "CARTA_IDENTITA", "ISEE", "FIRMA")
 * @property {string} name - Nome visualizzato ufficiale (es. "Carta d'Identità", "Attestazione ISEE")
 * @property {DocumentCategory} categoria - Raggruppamento tematico
 * @property {DocumentArchetype} archetipo - Comportamento temporale per denominazione e archiviazione
 * @property {string} icona - Classe icona Bootstrap Icons (es. "bi-person-badge", "bi-cash-coin")
 * @property {string} emoji - Emoji rappresentativa per la UI
 * @property {boolean} hasValue - Indica se il documento comporta un valore numerico/economico (€)
 * @property {boolean} hasExpiration - Indica se il documento è soggetto a data di scadenza
 * @property {RegExp} regex - Espressione regolare per identificare il documento da testi o nomi file
 * @property {DocumentScope} scope - Ambito di pertinenza ("persona", "nucleo" o "entrambi")
 * @property {string} [description] - Breve descrizione o note operative
 */

/**
 * Catalogo unico, immutabile e completo di tutte le tipologie documentali (SSOT).
 * @readonly
 * @type {readonly DocumentRecord[]}
 */
const Documents = Object.freeze([
  {
    id: "CARTA_IDENTITA",
    name: "Carta d'Identità",
    categoria: "Anagrafica",
    archetipo: "SCADENZA",
    icona: "bi-person-badge",
    emoji: "🪪",
    hasValue: false,
    hasExpiration: true,
    regex: /(carta.*identit|c[\._\s-]?i\b|doc.*identit)/i,
    scope: "persona",
    description: "Documento di identità (elettronica CIE o cartacea)"
  },
  {
    id: "PERMESSO_SOGGIORNO",
    name: "Permesso di Soggiorno",
    categoria: "Soggiorno",
    archetipo: "SCADENZA",
    icona: "bi-passport",
    emoji: "🛂",
    hasValue: false,
    hasExpiration: true,
    regex: /(permesso.*sogg|pds\b|titolo.*sogg|carta.*soggiorno|ricevuta.*sogg)/i,
    scope: "persona",
    description: "Titolo di soggiorno per cittadini extra-UE o ricevuta postale di rinnovo"
  },
  {
    id: "PATENTE",
    name: "Patente di Guida",
    categoria: "Anagrafica",
    archetipo: "SCADENZA",
    icona: "bi-car-front",
    emoji: "🚗",
    hasValue: false,
    hasExpiration: true,
    regex: /(patente|guida|driving)/i,
    scope: "persona",
    description: "Patente di guida in corso di validità"
  },
  {
    id: "PASSAPORTO",
    name: "Passaporto",
    categoria: "Anagrafica",
    archetipo: "SCADENZA",
    icona: "bi-book",
    emoji: "📘",
    hasValue: false,
    hasExpiration: true,
    regex: /(passaporto|passport)/i,
    scope: "persona",
    description: "Passaporto nazionale o estero"
  },
  {
    id: "TESSERA_SANITARIA",
    name: "Tessera Sanitaria",
    categoria: "Sanitaria",
    archetipo: "SCADENZA",
    icona: "bi-heart-pulse",
    emoji: "🏥",
    hasValue: false,
    hasExpiration: true,
    regex: /(tessera.*sanit|cns\b|codice.*fisc|cf\b)/i,
    scope: "persona",
    description: "Tessera Sanitaria / Carta Nazionale dei Servizi"
  },
  {
    id: "CODICE_FISCALE",
    name: "Codice Fiscale",
    categoria: "Anagrafica",
    archetipo: "UNICO",
    icona: "bi-upc-scan",
    emoji: "💳",
    hasValue: false,
    hasExpiration: false,
    regex: /(tesserino.*cf|certificato.*attribuzione.*cf|codice.*fiscale)/i,
    scope: "persona",
    description: "Tesserino o certificato di attribuzione codice fiscale"
  },
  {
    id: "FIRMA",
    name: "Firma Autografa",
    categoria: "Anagrafica",
    archetipo: "UNICO",
    icona: "bi-pen",
    emoji: "✍️",
    hasValue: false,
    hasExpiration: false,
    regex: /(firma|signature|sig)/i,
    scope: "persona",
    description: "Firma autografa acquisita digitalmente per documenti ufficiali"
  },
  {
    id: "ISEE",
    name: "Attestazione ISEE",
    categoria: "Economica",
    archetipo: "ANNUALE",
    icona: "bi-cash-coin",
    emoji: "💶",
    hasValue: true,
    hasExpiration: true,
    regex: /(isee|dsu|dichiarazione.*sostitutiva.*unica)/i,
    scope: "nucleo",
    description: "Attestazione ISEE ordinario o corrente con relativo valore in €"
  },
  {
    id: "CONTRATTO_LOCAZIONE",
    name: "Contratto di Locazione",
    categoria: "Abitativa",
    archetipo: "CONTRATTO",
    icona: "bi-house-check",
    emoji: "🏠",
    hasValue: true,
    hasExpiration: true,
    regex: /(contratt.*(locaz|affitt)|affitto|locazione)/i,
    scope: "nucleo",
    description: "Contratto di affitto registrato con canone mensile"
  },
  {
    id: "CONTRATTO_LAVORO",
    name: "Contratto di Lavoro",
    categoria: "Lavoro",
    archetipo: "CONTRATTO",
    icona: "bi-briefcase",
    emoji: "💼",
    hasValue: true,
    hasExpiration: true,
    regex: /(contratto.*lavoro|lettera.*assunzione|comunicazione.*unilav)/i,
    scope: "persona",
    description: "Contratto di lavoro subordinato, part-time o indeterminato"
  },
  {
    id: "BUSTA_PAGA",
    name: "Busta Paga",
    categoria: "Economica",
    archetipo: "PERIODICO",
    icona: "bi-receipt",
    emoji: "🧾",
    hasValue: true,
    hasExpiration: false,
    regex: /(busta.*paga|cedolino|statino|prospetto.*paga)/i,
    scope: "persona",
    description: "Cedolino stipendiale mensile con importo netto"
  },
  {
    id: "CERTIFICAZIONE_UNICA",
    name: "Certificazione Unica (CU/CUD)",
    categoria: "Economica",
    archetipo: "ANNUALE",
    icona: "bi-file-earmark-spreadsheet",
    emoji: "📊",
    hasValue: true,
    hasExpiration: false,
    regex: /(certificazione.*unica|cud|modello.*730|dichiarazione.*redditi)/i,
    scope: "persona",
    description: "Certificazione unica dei redditi di lavoro dipendente o autonomo"
  },
  {
    id: "STATO_FAMIGLIA",
    name: "Stato di Famiglia",
    categoria: "Anagrafica",
    archetipo: "SCADENZA",
    icona: "bi-people",
    emoji: "👨‍👩‍👦",
    hasValue: false,
    hasExpiration: true,
    regex: /(stato.*famiglia|certificato.*stato.*famiglia)/i,
    scope: "nucleo",
    description: "Certificato o autocertificazione dello stato di famiglia anagrafico"
  },
  {
    id: "CERTIFICATO_RESIDENZA",
    name: "Certificato di Residenza",
    categoria: "Anagrafica",
    archetipo: "SCADENZA",
    icona: "bi-geo-alt",
    emoji: "📍",
    hasValue: false,
    hasExpiration: true,
    regex: /(certificato.*residenza|dichiarazione.*residenza)/i,
    scope: "entrambi",
    description: "Certificato di residenza rilasciato dall'ufficio anagrafe"
  },
  {
    id: "RESIDENZA_FITTIZIA",
    name: "Residenza Fittizia",
    categoria: "Anagrafica",
    archetipo: "SCADENZA",
    icona: "bi-pin-map",
    emoji: "📌",
    hasValue: false,
    hasExpiration: true,
    regex: /(residenza.*fittizia|via.*modesta.*valenti|indirizzo.*virtuale)/i,
    scope: "persona",
    description: "Iscrizione anagrafica all'indirizzo virtuale (es. Via Modesta Valenti)"
  },
  {
    id: "SFRATTO",
    name: "Atto di Sfratto",
    categoria: "Abitativa",
    archetipo: "CONTRATTO",
    icona: "bi-exclamation-octagon",
    emoji: "⚠️",
    hasValue: true,
    hasExpiration: true,
    regex: /(sfratto|atto.*intimazione|convalida.*sfratto|morosit[aà])/i,
    scope: "nucleo",
    description: "Provvedimento o intimazione di sfratto per finita locazione o morosità"
  },
  {
    id: "VISURA_CATASTALE",
    name: "Visura Catastale",
    categoria: "Abitativa",
    archetipo: "UNICO",
    icona: "bi-buildings",
    emoji: "🏢",
    hasValue: false,
    hasExpiration: false,
    regex: /(visura.*catastale|planimetria|catasto)/i,
    scope: "nucleo",
    description: "Dati catastali dell'immobile o alloggio"
  },
  {
    id: "BOLLETTA",
    name: "Bolletta Utenze",
    categoria: "Abitativa",
    archetipo: "PERIODICO",
    icona: "bi-lightning-charge",
    emoji: "💡",
    hasValue: true,
    hasExpiration: true,
    regex: /(bolletta|utenza|luce|gas|fattura.*energia|servizio.*elettrico)/i,
    scope: "nucleo",
    description: "Bolletta utenze domestiche (luce, gas, acqua) con importo e scadenza"
  },
  {
    id: "SCHEDA_SEGNALAZIONE",
    name: "Scheda di Segnalazione",
    categoria: "Legale",
    archetipo: "CONTRATTO",
    icona: "bi-file-earmark-medical",
    emoji: "📋",
    hasValue: false,
    hasExpiration: false,
    regex: /(scheda.*segnalazione|segnalazione.*servizi)/i,
    scope: "nucleo",
    description: "Scheda formale di segnalazione ai servizi sociali comunali"
  },
  {
    id: "ALTRO",
    name: "Altro Documento",
    categoria: "Altro",
    archetipo: "UNICO",
    icona: "bi-file-earmark",
    emoji: "📄",
    hasValue: false,
    hasExpiration: false,
    regex: /(documento|allegato|file)/i,
    scope: "entrambi",
    description: "Documentazione generica o non classificata"
  }
]);

// =========================================================================
// MAPPE DI ACCESSO RAPIDO O(1) E RETROCOMPATIBILITÀ
// =========================================================================

/**
 * Mappa indicizzata per ID univoco -> DocumentRecord.
 * @readonly
 * @type {Record<string, DocumentRecord>}
 */
const DocumentById = Object.freeze(
  Object.fromEntries(Documents.map(d => [d.id, d]))
);

/**
 * Mappa indicizzata per Nome visualizzato -> DocumentRecord.
 * @readonly
 * @type {Record<string, DocumentRecord>}
 */
const DocumentByName = Object.freeze(
  Object.fromEntries(Documents.map(d => [d.name, d]))
);

/**
 * Elenco immutabile delle tipologie standard di documenti (nomi stringa).
 * Mantiene la piena compatibilità retroattiva al 100% con il preesistente TipiDocumenti.
 * @readonly
 * @type {readonly string[]}
 */
const TipiDocumenti = Object.freeze(
  Documents.map(d => d.name)
);

/**
 * Tipo unione per una tipologia di documento personale.
 * @typedef {typeof TipiDocumenti[number]} TipoDocumento
 */

/**
 * Elenco dei soli documenti pertinenti al singolo beneficiario.
 * @readonly
 * @type {readonly string[]}
 */
const TipiDocumentiPersona = Object.freeze(
  Documents.filter(d => d.scope === "persona" || d.scope === "entrambi").map(d => d.name)
);

/**
 * Elenco dei soli documenti pertinenti all'intero nucleo familiare.
 * @readonly
 * @type {readonly string[]}
 */
const TipiDocumentiNucleo = Object.freeze(
  Documents.filter(d => d.scope === "nucleo" || d.scope === "entrambi").map(d => d.name)
);

/**
 * Mappa delle tipologie di permesso di soggiorno (PdS) e relativi requisiti documentali.
 * Conservata per retrocompatibilità.
 * @readonly
 * @enum {readonly string[]}
 */
const pds = Object.freeze({
  Studio: ["Passaporto", "Permesso di Soggiorno"],
  Famiglia: ["Passaporto", "Permesso di Soggiorno", "Stato di Famiglia"],
  Subordinato: ["Passaporto", "Permesso di Soggiorno", "Contratto di Lavoro", "Busta Paga"],
  Autonomo: ["Passaporto", "Permesso di Soggiorno", "Certificazione Unica (CU/CUD)"]
});

// =========================================================================
// FUNZIONI UTILITY DI DOMINIO
// =========================================================================

/**
 * Ricerca un record documento nel catalogo a partire da qualsiasi stringa
 * (ID costante, nome esatto, abbreviazione o testo che matcha la regex).
 * 
 * @param {string} query - Termine di ricerca (es. "patente", "ISEE", "c.i.", "CARTA_IDENTITA")
 * @return {DocumentRecord} Il record del documento trovato (o il record 'ALTRO' come fallback sicuro).
 */
function findDocumentType(query) {
  if (!query || typeof query !== "string") {
    return DocumentById["ALTRO"];
  }

  const clean = query.trim();
  const upper = clean.toUpperCase();

  // 1. Match per ID esatto (es. "ISEE", "CARTA_IDENTITA")
  if (DocumentById[upper]) {
    return DocumentById[upper];
  }

  // 2. Match per Nome esatto
  if (DocumentByName[clean]) {
    return DocumentByName[clean];
  }

  // 3. Match case-insensitive su Nome
  const lower = clean.toLowerCase();
  for (let i = 0; i < Documents.length; i++) {
    if (Documents[i].name.toLowerCase() === lower) {
      return Documents[i];
    }
  }

  // 4. Match tramite espressione regolare del tipo documento
  for (let i = 0; i < Documents.length; i++) {
    if (Documents[i].regex && Documents[i].regex.test(clean)) {
      return Documents[i];
    }
  }

  return DocumentById["ALTRO"];
}

/**
 * Restituisce l'elenco ordinato di tutte le categorie documentali censite.
 * @return {string[]}
 */
function getDocumentCategories() {
  const categories = Documents.map(d => d.categoria);
  return Array.from(new Set(categories));
}

/**
 * Restituisce l'elenco dei documenti filtrati per categoria.
 * @param {DocumentCategory} categoria
 * @return {DocumentRecord[]}
 */
function getDocumentsByCategory(categoria) {
  if (!categoria) return [...Documents];
  return Documents.filter(d => d.categoria.toLowerCase() === categoria.toLowerCase());
}

/**
 * Genera il nome standardizzato del file per Google Drive basandosi sull'archetipo di dominio.
 * 
 * @param {Object} doc - Dati del documento (tipo, dataEmissione, dataScadenza, id, ecc.)
 * @param {Object} persona - Dati del beneficiario o intestatario (nome, cognome)
 * @param {string} [ext="pdf"] - Estensione del file (es. "pdf", "png")
 * @return {string} Nome formattato del file (es. "Carta d'Identità (scad. 2034) - Mario Rossi.pdf")
 */
function buildDocumentFileName(doc, persona, ext = "pdf") {
  const cleanExt = (ext || "pdf").replace(/^\./, "");
  
  let nomePersona = "";
  if (typeof persona === "string") {
    nomePersona = persona.trim();
  } else if (persona && typeof persona === "object") {
    nomePersona = `${persona.nome || persona.name || ""} ${persona.cognome || persona.surname || ""}`.trim();
  }

  const docInput = doc || {};
  const docRecord = findDocumentType(docInput.tipo || docInput.name || docInput.id || docInput);

  let dettaglio = "";

  switch (docRecord.archetipo) {
    case "ANNUALE": {
      // Estrae l'anno di riferimento (da anno, dataEmissione o data odierna)
      const anno = docInput.anno || 
        (docInput.dataEmissione ? new Date(docInput.dataEmissione).getFullYear() : new Date().getFullYear());
      dettaglio = `${anno}`;
      break;
    }

    case "SCADENZA": {
      if (docInput.dataScadenza) {
        const annoScad = new Date(docInput.dataScadenza).getFullYear();
        dettaglio = `(scad. ${annoScad})`;
      } else if (docInput.annoScadenza) {
        dettaglio = `(scad. ${docInput.annoScadenza})`;
      } else if (docInput.idDocumento || (docInput.id && !DocumentById[docInput.id])) {
        dettaglio = `[DOC-${docInput.idDocumento || docInput.id}]`;
      }
      break;
    }

    case "PERIODICO": {
      if (docInput.periodo) {
        dettaglio = String(docInput.periodo);
      } else if (docInput.dataEmissione) {
        try {
          const tz = (typeof Session !== "undefined" && Session.getScriptTimeZone && Session.getScriptTimeZone()) || "Europe/Rome";
          dettaglio = Utilities.formatDate(new Date(docInput.dataEmissione), tz, "yyyy-MM");
        } catch (e) {
          const d = new Date(docInput.dataEmissione);
          dettaglio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
      } else {
        dettaglio = `${new Date().getFullYear()}`;
      }
      break;
    }

    case "CONTRATTO": {
      const anno = docInput.anno || (docInput.dataEmissione ? new Date(docInput.dataEmissione).getFullYear() : new Date().getFullYear());
      dettaglio = `${anno}`;
      break;
    }

    case "UNICO":
    default:
      dettaglio = "";
      break;
  }

  const parti = [docRecord.name];
  if (dettaglio) parti.push(dettaglio);
  const prefisso = parti.join(" ");

  const finale = nomePersona ? `${prefisso} - ${nomePersona}.${cleanExt}` : `${prefisso}.${cleanExt}`;
  return finale.replace(/\s+/g, " ").trim();
}
