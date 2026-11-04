/**
 * @file abitazione.js
 * @description Modulo di dominio per la classificazione e tipizzazione delle tipologie abitative
 * monitorate dallo sportello sociale "La Bussola dell'Abitare" (es. locazione, casa rifugio, senza dimora).
 * Fornisce un array immutabile delle tipologie valide e il relativo tipo JSDoc.
 * @module Domain/Abitazione
 */

/**
 * Elenco immutabile delle tipologie di sistemazione abitativa rilevate dallo sportello.
 * @readonly
 * @enum {string}
 */
const Abitazione = Object.freeze(/** @type {const} */([
    "Nessuna",
    "Accoglienza: Casa rifugio",
    "Accoglienza: Casa famiglia",
    "Accoglienza: Semi-autonomia",
    "Ospite temporaneo presso parenti / amici",
    "Stabile occupato",
    "Locazione",
    "Proprietà",
    "Usufrutto o titolo gratuito",
    "Accoglienza: Dormitorio",
    "Accoglienza: CPA",
    "Accoglienza: Co-housing sociale",
    "Accoglienza: Housing first"
]));

/**
 * Tipo unione che rappresenta una tipologia abitativa valida tra quelle supportate.
 * @typedef {typeof Abitazione[number]} TipoAbitazione
 */

/**
 * Funzione di test/debug per la validazione statica del tipo di abitazione.
 * @param {TipoAbitazione} relazione - Tipologia abitativa da verificare.
 * @return {void}
 */
function testEnum(relazione) {
    console.log(relazione);
}
