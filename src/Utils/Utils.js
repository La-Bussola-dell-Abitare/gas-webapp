/**
 * @file Utils.js
 * @description Funzioni di utilità generale per la manipolazione di stringhe, la mappatura vettoriale di formule,
 * l'estrazione sicura di valori da righe di fogli di calcolo e l'indicizzazione dinamica case-insensitive delle colonne.
 * @module Utils/Common
 */

/**
 * Converte una stringa in Title Case (iniziali maiuscole).
 * @param {string} str - La stringa da convertire.
 * @return {string}
 */
function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Helper generico per applicare (mappare) una funzione su valori singoli o matrici/intervalli di celle di Google Sheets.
 * Gestisce ricorsivamente vettori e matrici 2D, celle vuote ed errori di calcolo.
 * 
 * @param {any} input - Singolo valore o matrice di celle da Google Sheets.
 * @param {(val: string) => any} fn - Funzione di calcolo da eseguire sul singolo valore.
 * @param {any} [fallbackOnError="Errore"] - Valore da restituire in caso di errore.
 * @param {any} [emptyValue=""] - Valore da restituire in caso di cella vuota.
 * @return {any}
 */
function mapFormula(input, fn, fallbackOnError = "Errore", emptyValue = "") {
  if (Array.isArray(input)) {
    return input.map(row =>
      Array.isArray(row)
        ? row.map(val => mapFormula(val, fn, fallbackOnError, emptyValue))
        : mapFormula(row, fn, fallbackOnError, emptyValue)
    );
  }
  if (input == null || input === "") return emptyValue;
  try {
    return fn(input.toString());
  } catch (e) {
    return fallbackOnError;
  }
}

/**
 * Formula personalizzata per convertire una stringa in title case.
 * Accetta un singolo valore o un intervallo di celle.
 * @param {any} str La stringa o la lista di stringhe da convertire.
 * @return {any} La stringa o matrice di stringhe convertite in title case.
 * @customfunction
 */
function TITLECASE(str) {
  return mapFormula(str, val => titleCase(val));
}

/**
 * Trova l'indice di una colonna basandosi sui possibili nomi dell'intestazione (case-insensitive).
 * @param {string[]} headers - Array di intestazioni del foglio.
 * @param {string[]} keys - Array di nomi possibili per la colonna.
 * @return {number} Indice della colonna (0-based) o -1 se non trovata.
 */
function findHeaderIndex(headers, keys) {
  const lowerKeys = keys.map(k => k.toLowerCase().trim());

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toString().toLowerCase().trim();
    if (lowerKeys.includes(header)) {
      return i;
    }
  }
  return -1;
}

/**
 * Converte in sicurezza un valore in stringa rimuovendo gli spazi.
 * @param {*} val - Il valore da convertire.
 * @return {string}
 */
function safeString(val) {
  if (val === null || val === undefined) return "";
  return val.toString().trim();
}

/**
 * Estrae in sicurezza un valore da una riga del foglio basandosi sulla mappa degli indici.
 * @param {any[]} row - La riga del foglio (array di celle).
 * @param {Record<string, number>} idx - L'oggetto con la mappatura delle colonne.
 * @param {string} key - La chiave da cercare nell'indice.
 * @param {*} [fallback=""] - Il valore di ritorno se la colonna non esiste o è vuota.
 * @return {*} Il valore della cella o il fallback.
 */
function getSheetVal(row, idx, key, fallback = "") {
  const index = idx[key];
  return (index >= 0 && index < row.length) ? safeString(row[index]) : fallback;
}

/**
 * Assicura che una colonna esista nell'intestazione del foglio (riga 1). Se non esiste, la aggiunge in fondo.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Il foglio di lavoro.
 * @param {string} headerName - Nome dell'intestazione da creare se mancante.
 * @param {string[]} [searchKeys] - Varianti di nome con cui cercare l'intestazione esistente.
 * @return {number} Indice 0-based della colonna nel foglio.
 */
function ensureHeaderIndex(sheet, headerName, searchKeys) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const keys = searchKeys && searchKeys.length > 0 ? searchKeys : [headerName];
  const foundIdx = findHeaderIndex(headers, keys);
  if (foundIdx >= 0) return foundIdx;

  const newColIdx = lastCol + 1;
  sheet.getRange(1, newColIdx).setValue(headerName);
  return newColIdx - 1;
}