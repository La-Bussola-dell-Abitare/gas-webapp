/**
 * @file relation.js
 * @description Modulo di dominio per la definizione e tipizzazione delle relazioni di parentela
 * o convivenza dei beneficiari rispetto all'intestatario della scheda o nucleo familiare.
 * @module Domain/Relation
 */

/**
 * Elenco immutabile delle relazioni di parentela/ruolo all'interno del nucleo familiare.
 * @readonly
 * @enum {string}
 */
const Relations = Object.freeze(/** @type {const} */([
    "Intestatario",
    "Coniuge",
    "Figlio",
    "Genitore",
    "Fratello",
    "Nipote",
    "Nonno",
    "Zio",
    "Cugino",
    "Altro"
]));

/**
 * Tipo unione che rappresenta una relazione di parentela valida tra quelle supportate.
 * @typedef {typeof Relations[number]} Relation
 */

/**
 * Funzione di test/debug per la validazione del tipo di relazione familiare.
 * @param {Relation} relazione - Relazione familiare da verificare.
 * @return {void}
 */
function testEnum(relazione) {
    console.log(relazione);
}
