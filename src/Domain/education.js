/**
 * @file education.js
 * @description Modulo di dominio per la codifica dei livelli di istruzione e titoli di studio
 * secondo gli standard internazionali ISCED (International Standard Classification of Education)
 * ed europei EQF (European Qualifications Framework).
 * @module Domain/Education
 */

/**
 * Livelli di istruzione secondo lo standard UNESCO ISCED 2011.
 * Mappa ciascun titolo di studio al livello numerico corrispondente.
 * @readonly
 * @enum {number}
 */
const ISCED = /** @type {const}*/Object.freeze({
    Nessuno: 0, // asilo nido o materna
    Elementare: 1, // primaria (elementari)
    Medie: 2, // secondaria inferiore (medie)
    Qualifica: 3, // qualifica professionale (3 anni)
    Diploma: 3, // secondaria superiore (diploma)
    Specializzazione: 4, // post-secondaria non terziaria (corsi di specializzazione post-diploma non universitari)
    ITS: 5, // terziaria di ciclo breve (ITS)
    Triennale: 6, // terziaria di primo livello (triennale)
    Magistrale: 7, // terziaria di secondo livello (magistrale)
    Dottorato: 8, // dottorato o equivalente
});

/**
 * Livelli delle qualifiche secondo il quadro europeo EQF (European Qualifications Framework).
 * @readonly
 * @enum {number}
 */
const EQF = /** @type {const}*/Object.freeze({
    Nessuno: 0, // asilo nido o materna
    Elementare: 1, // primaria (elementari)
    Medie: 2, // secondaria inferiore (medie)
    Qualifica: 3, // qualifica professionale (3 anni)
    Diploma: 4, // secondaria superiore (diploma)
    ITS: 5, // terziaria di ciclo breve (ITS)
    Triennale: 6, // terziaria di primo livello (triennale)
    Magistrale: 7, // terziaria di secondo livello (magistrale)
    Dottorato: 8 // dottorato o equivalente
});

/** 
 * Tipo che rappresenta un livello ISCED valido.
 * @typedef {keyof typeof ISCED} TitoloStudioISCED 
 */

/** 
 * Tipo che rappresenta un livello EQF valido.
 * @typedef {keyof typeof EQF} TitoloStudioEQF 
 */
