/* Invece che variabili globali che vengono eseguite ad ogni funzione chiamata, uso dei getter copiando da https://stackoverflow.com/questions/70056310/avoid-repeating-use-global-variables-in-google-apps-script-or-not */

const addGetter_ = (name, value, obj = this) => {
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
[
    ['ss', () => SpreadsheetApp.getActiveSpreadsheet()],
    ['allSheets', () => ss.getSheets()],
    ['activeSheet', () => ss.getActiveSheet()],
    ['today', () => Utilities.formatDate(new Date(), this.ss.getSpreadsheetTimeZone(), "dd/MM/yyyy")],
    ['ui', () => SpreadsheetApp.getUi()],
    ['timezone', () => Session.getScriptTimeZone()],
    ['scriptProperties', () => PropertiesService.getScriptProperties()],
    ['documentProperties', () => PropertiesService.getDocumentProperties()],
    ['userProperties', () => PropertiesService.getUserProperties()],
].forEach(([n, v]) => addGetter_(n, v));

