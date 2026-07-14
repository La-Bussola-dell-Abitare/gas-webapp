function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formula personalizzata per convertire una stringa in title case.
 * @param {string} str La stringa da convertire.
 * @return {string} La stringa convertita in title case.
 * @customfunction
 */
function TITLECASE(str) {
  try {
    return titleCase(str);
  } catch (e) {
    return "Errore";
  }
}

/**
 * Trova l'indice di una colonna basandosi sui possibili nomi dell'intestazione (case-insensitive).
 */
function findHeaderIndex(headers, keys) {
  // Convertiamo tutte le chiavi in minuscolo per il confronto
  const lowerKeys = keys.map(k => k.toLowerCase().trim());

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toString().toLowerCase().trim();

    // Controlla se l'header esatto è presente nell'elenco delle chiavi accettate
    if (lowerKeys.includes(header)) {
      return i;
    }
  }
  return -1; // Non trovato
}

/**
 * Converte in sicurezza un valore in stringa rimuovendo gli spazi.
 */
function safeString(val) {
  if (val === null || val === undefined) return "";
  return val.toString().trim();
}

/**
 * Estrae in sicurezza un valore da una riga del foglio basandosi sulla mappa degli indici.
 * @param {Array} row - La riga del foglio (array di celle).
 * @param {Object} idx - L'oggetto con la mappatura delle colonne ({nome: 0, email: 1}).
 * @param {string} key - La chiave da cercare nell'indice.
 * @param {*} fallback - Il valore di ritorno se la colonna non esiste o è vuota.
 * @returns {*} Il valore della cella o il fallback.
 */
function getSheetVal(row, idx, key, fallback = "") {
  const index = idx[key];
  return (index >= 0 && index < row.length) ? safeString(row[index]) : fallback;
}