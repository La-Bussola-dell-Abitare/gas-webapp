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
    OccupatoStabile: "Occupato (stabile)",
    OccupatoOccasionale: "Occupato (occasionale)",
    OccupatoIrregolare: "Occupato (irregolare)",
    LavoratoreAutonomo: "Lavoratore autonomo/atipico",
    Disoccupato: "Disoccupato",
    Inattivo: "Inattivo",
    Studente: "Studente",
    Pensionato: "Pensionato",
    IscrittoCPI: "Iscritto CPI",
    CategoriaProtetta: "Categoria protetta",
    Casalingo: "Casalingo",
    Altro: "Altro"
});

/** 
 * Chiave identificativa dello stato lavorativo.
 * @typedef {keyof typeof WorkStatus} WorkStatusKey 
 */

/**
 * Array immutabile degli stati lavorativi ammessi (senza la voce generica 'Occupato').
 * @readonly
 * @type {readonly ["Occupato (stabile)", "Occupato (occasionale)", "Occupato (irregolare)", "Lavoratore autonomo/atipico", "Disoccupato", "Inattivo", "Studente", "Pensionato", "Iscritto CPI", "Categoria protetta", "Casalingo", "Altro"]}
 */
const WorkStatuses = Object.freeze(/** @type {const} */([
    "Occupato (stabile)",
    "Occupato (occasionale)",
    "Occupato (irregolare)",
    "Lavoratore autonomo/atipico",
    "Disoccupato",
    "Inattivo",
    "Studente",
    "Pensionato",
    "Iscritto CPI",
    "Categoria protetta",
    "Casalingo",
    "Altro"
]));

/**
 * Tipo unione che rappresenta uno stato lavorativo valido.
 * @typedef {typeof WorkStatuses[number]} WorkStatus
 */
