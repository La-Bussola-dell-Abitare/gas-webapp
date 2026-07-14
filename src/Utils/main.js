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

// Global functions

function sheets(sheet) {
    var sheet = ss.getSheetByName(sheet);
    return sheet;
}

function setActiveSpreadsheet(sheetName) {
    SpreadsheetApp.getActive().getSheetByName(sheetName).activate();
}

/**
 * Returns the column index (1-based) of the specified column name in the first row of the data array.
 * @param {number[][]} data 
 * @param {string} colName 
 * @returns {number} The column index (1-based) of the specified column name, or 0 if not found.
 */
function getColumnByRange(data, colName) {
    var col = data[0].indexOf(colName);
    return ++col;
}

function getColumnByName(sheet, colName) {
    var data = sheet.getDataRange().getValues();
    var col = data[0].indexOf(colName);
    return ++col;
}

function getCellRangeByColumnName(sheet, columnName, row) {
    let data = sheet.getDataRange().getValues();
    let column = data[0].indexOf(columnName);
    if (column != -1) {
        return sheet.getRange(row, column + 1, 1, 1);
    }
}

function getCellValueByColumnName(sheet, columnName, row) {
    let cell = getCellRangeByColumnName(sheet, columnName, row);
    if (cell != null) {
        return cell.getValue();
    }
}

function getColumnRangeByName(sheet, columnName) {
    let sh = sheets(sheet);
    let data = sh.getRange("A1:1").getValues();
    let column = data[0].indexOf(columnName);
    if (column != -1) {
        return sh.getRange(2, column + 1, sh.getMaxRows());
    }
}

function getColumnValuesByName(sheet, columnName) {
    let column = getColumnRangeByName(sheet, columnName);
    if (column != null) {
        return column.getValues();
    }
}

function isError(cell) {
    // cell is a value, e.g. came from `range.getValue()` or is an element of an array from `range.getValues()`
    const errorValues = ["#N/A", "#REF", "#VALUE!"];
    return errorValues.includes(cell);
}