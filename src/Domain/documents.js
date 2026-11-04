/**
 * @file documents.js
 * @description Modulo di dominio per la classificazione e i requisiti documentali
 * associati ai permessi di soggiorno (Studio, Famiglia, Lavoro Subordinato, Lavoro Autonomo).
 * @module Domain/Documents
 */

/**
 * Mappa immutabile delle tipologie di permesso di soggiorno (PdS) e relativi documenti richiesti.
 * @readonly
 * @enum {readonly string[]}
 */
const pds = Object.freeze(
  /** @type {const} */({
        Studio: [],
        Famiglia: [],
        Subordinato: [],
        Autonomo: [],
    })
);

/**
 * Elenco immutabile delle tipologie standard di documenti personali e titoli di identità/soggiorno.
 * Costituisce la Single Source of Truth di dominio per i fascicoli dei beneficiari e le dropdown.
 * @readonly
 * @enum {string}
 */
const TipiDocumenti = Object.freeze(/** @type {const} */([
    "Cartà identità",
    "Tessera sanitaria",
    "Passaporto",
    "Permesso di soggiorno",
    "Stato di famiglia",
    "Certificato di residenza",
    "ISEE",
    "Certificazione unica",
    "Dichiarazione residenza",
    "Residenza fittizia",
    "Sfratto",
    "Visura catastale",
    "Bolletta",
    "Patente di Guida",
    "Contratto di lavoro",
    "Contratto di locazione"
]));

/**
 * Tipo unione per una tipologia di documento personale.
 * @typedef {typeof TipiDocumenti[number]} TipoDocumento
 */
