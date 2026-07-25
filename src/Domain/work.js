/**
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

/** @typedef {keyof typeof WorkStatus} WorkStatus */


const WorkStatuses = Object.freeze(/** @type {const} */([
    "Occupato",
    "Disoccupato",
    "Studente",
    "Pensionato",
    "Casalingo",
    "Altro"
]));

/**
 * @typedef {typeof WorkStatuses[number]} WorkStatus
 */
