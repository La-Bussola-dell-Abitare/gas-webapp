/**
 * @file statocivile.js
 * @description Modulo di dominio per la definizione e tipizzazione degli stati civili legali
 * dei beneficiari registrati presso lo sportello "La Bussola dell'Abitare".
 * @module Domain/StatoCivile
 */

/**
 * Elenco immutabile degli stati civili ammessi per la compilazione anagrafica.
 * @readonly
 * @enum {string}
 */
const StatiCivili = Object.freeze(/** @type {const} */([
    "Celibe/Nubile",
    "Coniugato/Coniugata",
    "Separato/Separata",
    "Divorziato/Divorziata",
    "Vedovo/Vedova",
    "Unito civilmente",
    "In unione di fatto"
]));

/**
 * Tipo unione che rappresenta uno stato civile valido.
 * @typedef {typeof StatiCivili[number]} StatoCivile
 */

/**
 * Funzione di test/debug per la validazione del tipo di stato civile.
 * @param {StatoCivile} statoCivile - Lo stato civile da verificare.
 * @return {void}
 */
function testEnum(statoCivile) {
    console.log(statoCivile);
}
