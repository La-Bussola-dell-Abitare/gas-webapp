/**
 * @file main.js
 * @description Modulo di bootstrapping per la registrazione di getter globali ad accesso lazy (lazy-loaded)
 * sull'oggetto `globalThis`. Espone variabili di utilità comuni (ss, allSheets, activeSheet, today, ui,
 * timezone, scriptProperties, documentProperties, userProperties) richiamate solo quando effettivamente utilizzate.
 * @module Utils/Bootstrap
 */

/**
 * Definisce un getter lazy-loaded per una proprietà dell'oggetto di destinazione.
 * Una volta invocato per la prima volta, memorizza il valore eliminando il getter per massimizzare le performance.
 * 
 * @private
 * @param {string} name - Il nome della proprietà globale da registrare.
 * @param {function(): *} value - La factory function che produce il valore alla prima lettura.
 * @param {Object} [obj=globalThis] - L'oggetto a cui associare la proprietà.
 * @return {Object} L'oggetto modificato con il nuovo getter registrato.
 */
const addGetter_ = (name, value, obj = globalThis) => {
    Object.defineProperty(obj, name, {
        enumerable: true,
        configurable: true,
        get() {
            delete this[name];
            return (this[name] = value());
        },
    });
    return obj;
};

// Registrazione dei getter globali lazy-loaded comuni per l'ambiente Google Apps Script
[
    ['ss', () => SpreadsheetApp.getActiveSpreadsheet()],
    ['allSheets', () => ss.getSheets()],
    ['activeSheet', () => ss.getActiveSheet()],
    ['today', () => Utilities.formatDate(new Date(), globalThis.ss.getSpreadsheetTimeZone(), "dd/MM/yyyy")],
    ['ui', () => SpreadsheetApp.getUi()],
    ['timezone', () => Session.getScriptTimeZone()],
    ['scriptProperties', () => PropertiesService.getScriptProperties()],
    ['documentProperties', () => PropertiesService.getDocumentProperties()],
    ['userProperties', () => PropertiesService.getUserProperties()],
].forEach(([n, v]) => addGetter_(n, v));
