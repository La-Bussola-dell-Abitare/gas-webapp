/**
 * Definisce un getter lazy-loaded per una proprietà dell'oggetto di destinazione.
 * @private
 * @param {string} name - Il nome della proprietà.
 * @param {function(): *} value - La funzione che restituisce il valore.
 * @param {Object} [obj=globalThis] - L'oggetto a cui aggiungere la proprietà.
 * @return {Object} L'oggetto di destinazione modificato.
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

// Registrazione dei getter globali lazy-loaded comuni
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
