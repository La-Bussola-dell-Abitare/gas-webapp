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
