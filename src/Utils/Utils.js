/**
 * @file Utils.js
 * @description Funzioni di utilità generale per la manipolazione di stringhe, la mappatura vettoriale di formule,
 * l'estrazione sicura di valori da righe di fogli di calcolo e l'indicizzazione dinamica case-insensitive delle colonne.
 * @module Utils/Common
 */

/**
 * Normalizza una singola parola rispettando particelle, apostrofi e trattini italiani.
 * @param {string} word - La parola da normalizzare.
 * @param {boolean} isFirstWord - Se la parola si trova all'inizio del testo.
 * @param {boolean} isLastWord - Se la parola si trova alla fine del testo.
 * @return {string}
 */
function normalizeWord(word, isFirstWord, isLastWord) {
  if (!word) return "";
  const lower = word.toLowerCase();

  // Particelle che rimangono minuscole a metà frase (tranne se prima o ultima parola)
  const minorWords = new Set(["di", "de", "del", "della", "delle", "dei", "degli", "da", "dal", "dalla", "dalle", "dai", "dagli", "in", "sul", "sulla", "sulle", "sui", "sugli", "a", "al", "alla", "alle", "ai", "agli", "e", "ed", "o", "od"]);

  if (!isFirstWord && !isLastWord && minorWords.has(lower)) {
    return lower;
  }

  // Gestione apostrofi: d'angelo, dell'orto, l'aquila, nell'emilia
  if (lower.includes("'")) {
    const parts = lower.split("'");
    return parts.map((p, idx) => {
      if (idx === 0) {
        if (["d", "l", "sant"].includes(p)) {
          return isFirstWord ? p.charAt(0).toUpperCase() + p.slice(1) : p;
        }
        if (["dell", "nell", "all", "sull"].includes(p)) {
          return isFirstWord ? p.charAt(0).toUpperCase() + p.slice(1) : p.toLowerCase();
        }
      }
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join("'");
  }

  // Gestione trattini (es. Jean-Luc, Rossi-Bianchi)
  if (lower.includes("-")) {
    return lower.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("-");
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Converte una stringa in Proper Case (Title Case italiano) rispettando nomi composti e particelle.
 * @param {string} str - La stringa da convertire.
 * @return {string}
 */
function normalizeProperCase(str) {
  if (!str) return "";
  const s = String(str).trim().replace(/\s+/g, " ");
  const words = s.split(" ");
  return words.map((w, idx) => normalizeWord(w, idx === 0, idx === words.length - 1)).join(" ");
}

/**
 * Normalizza il nome di un comune o luogo di nascita, preservando la sigla provincia in maiuscolo a 2 lettere.
 * Esempio: "REGGIO NELL'EMILIA (RE)" -> "Reggio nell'Emilia (RE)"
 * @param {string} str - Denominazione del comune o stato.
 * @return {string}
 */
function normalizeCity(str) {
  if (!str) return "";
  let s = String(str).trim().replace(/\s+/g, " ");

  let prov = "";
  const provMatchParen = s.match(/\s*\(([a-zA-Z]{2})\)\s*$/);
  if (provMatchParen) {
    prov = " (" + provMatchParen[1].toUpperCase() + ")";
    s = s.replace(/\s*\(([a-zA-Z]{2})\)\s*$/, "").trim();
  } else {
    const provMatchEnd = s.match(/\s+([a-zA-Z]{2})$/);
    if (provMatchEnd) {
      prov = " (" + provMatchEnd[1].toUpperCase() + ")";
      s = s.replace(/\s+([a-zA-Z]{2})$/, "").trim();
    }
  }

  const words = s.split(" ");
  const normalizedWords = words.map((w, idx) => normalizeWord(w, idx === 0, idx === words.length - 1));
  return normalizedWords.join(" ") + prov;
}

/**
 * Normalizza un indirizzo completo mantenendo intatti CAP, numeri civici ed eventuali sigle provincia.
 * Esempio: "VIA DEI MILLE 10/A, 00185 ROMA (RM)" -> "Via dei Mille 10/A, 00185 Roma (RM)"
 * @param {string} str - Indirizzo da normalizzare.
 * @return {string}
 */
function normalizeAddress(str) {
  if (!str) return "";
  let s = String(str).trim().replace(/\s+/g, " ");

  const words = s.split(" ");
  return words.map((w, idx) => {
    let trailingPunct = "";
    let clean = w;
    const punctMatch = w.match(/([,;:.])$/);
    if (punctMatch) {
      trailingPunct = punctMatch[1];
      clean = w.slice(0, -1);
    }

    if (/^\d{5}$/.test(clean)) return clean + trailingPunct;
    if (/^\([a-zA-Z]{2}\)$/.test(clean)) return clean.toUpperCase() + trailingPunct;
    if (/^\d+[\/\-a-zA-Z]*$/.test(clean)) return clean.toUpperCase() + trailingPunct;

    return normalizeWord(clean, idx === 0, idx === words.length - 1) + trailingPunct;
  }).join(" ");
}

/**
 * Normalizza il Codice Fiscale forzandolo a 16 caratteri maiuscoli senza spazi.
 * @param {string} cf - Codice Fiscale grezzo.
 * @return {string}
 */
function normalizeFiscalCode(cf) {
  if (!cf) return "";
  return String(cf).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

/**
 * Converte una stringa in Title Case (iniziali maiuscole).
 * @param {string} str - La stringa da convertire.
 * @return {string}
 */
function titleCase(str) {
  return normalizeProperCase(str);
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