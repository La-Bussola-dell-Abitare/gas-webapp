/**
 * @file work.js
 * @description Modulo di dominio per la definizione e tipizzazione delle condizioni occupazionali
 * e stati lavorativi dei beneficiari, necessari per la compilazione del Monitoraggio Ufficiale.
 * @module Domain/Work
 */

/**
 * Oggetto mappa delle condizioni occupazionali supportate.
 * @readonly
 * @enum {string}
 */
const WorkStatus = /** @type {const}*/Object.freeze({
    Occupato: "Occupato",
    Disoccupato: "Disoccupato",
    Studente: "Studente",
    Pensionato: "Pensionato",
    Casalingo: "Casalingo",
    Altro: "Altro"
});

/** 
 * Chiave identificativa dello stato lavorativo.
 * @typedef {keyof typeof WorkStatus} WorkStatusKey 
 */

/**
 * Array immutabile degli stati lavorativi ammessi.
 * @readonly
 * @type {readonly ["Occupato", "Disoccupato", "Studente", "Pensionato", "Casalingo", "Altro"]}
 */
const WorkStatuses = Object.freeze(/** @type {const} */([
    "Occupato",
    "Disoccupato",
    "Studente",
    "Pensionato",
    "Casalingo",
    "Altro"
]));

/**
 * Tipo unione che rappresenta uno stato lavorativo valido.
 * @typedef {typeof WorkStatuses[number]} WorkStatus
 */
