/**
 * @typedef {PersonData & {
 *   operatore?: string;
 *   qualifica?: string;
 *   ruolo?: string;
 * }} OperatoreData
 */

/**
 * Classe Operatore che rappresenta un operatore dello sportello.
 * @extends Person
 */
class Operatore extends Person {
  /**
   * Crea un'istanza di Operatore.
   * @param {OperatoreData} data - I dati dell'operatore.
   */
  constructor(data) {
    super(data);
    this.operatore = data.operatore || "";
    this.qualifica = data.qualifica || "";
    this.ruolo = data.ruolo || "";
  }

  /**
   * Factory statico per creare un'istanza di Operatore da una riga del foglio ed indici.
   * @param {any[]} row - La riga di dati
   * @param {Record<string, number>} idx - Mappa degli indici delle colonne
   * @return {Operatore}
   */
  static fromRow(row, idx) {
    const nomeVal = getSheetVal(row, idx, "nome", "");
    const cognomeVal = getSheetVal(row, idx, "cognome", "");
    const cfVal = getSheetVal(row, idx, "codice fiscale", "");
    const dataNascitaVal = getSheetVal(row, idx, "data di nascita", null);
    const luogoNascitaVal = getSheetVal(row, idx, "luogo di nascita", "");
    const firmaVal = getSheetVal(row, idx, "firma", "");

    const operatoreVal = getSheetVal(row, idx, "operatore", "");
    const qualificaVal = getSheetVal(row, idx, "qualifica", "");
    const ruoloVal = getSheetVal(row, idx, "ruolo", "");

    const birthPlaceCity = new City(luogoNascitaVal);
    const resolvedCitizenship = birthPlaceCity.country === "Italia" ? Citizenship.Italiana : Citizenship.Apolide;

    return new Operatore({
      name: nomeVal,
      surname: cognomeVal,
      taxCode: new CodiceFiscale(cfVal),
      birthDate: dataNascitaVal,
      birthPlace: birthPlaceCity,
      citizenship: resolvedCitizenship,
      signatureFileId: firmaVal,
      operatore: operatoreVal,
      qualifica: qualificaVal,
      ruolo: ruoloVal
    });
  }
}

/**
 * Repository per gestire le operazioni di persistenza e lettura degli Operatori.
 */
class OperatoreRepository {
  /**
   * Ottiene tutti gli operatori.
   * @return {Operatore[]}
   */
  static getAll() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Operatori");
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => h.toString().trim().toLowerCase());
    const idx = OperatoreRepository._getColIndexes(headers);

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nome = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]) : "";
      const cognome = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]) : "";

      if (nome || cognome) {
        list.push(Operatore.fromRow(row, idx));
      }
    }
    return list;
  }

  /**
   * Trova un operatore per nome completo (nome cognome) o solo per nome.
   * @param {string} searchName - Nome da cercare
   * @return {Operatore|null}
   */
  static getByName(searchName) {
    if (!searchName) return null;
    const cleanSearch = searchName.toLowerCase().trim();
    const list = OperatoreRepository.getAll();

    return list.find(op => {
      const fullName = (op.name + " " + op.surname).toLowerCase().trim();
      return fullName === cleanSearch || op.name.toLowerCase().trim() === cleanSearch;
    }) || null;
  }

  /**
   * Mappa gli indici delle colonne in base alle intestazioni.
   * @private
   * @param {string[]} headers
   * @return {Record<string, number>}
   */
  static _getColIndexes(headers) {
    return {
      nome: findHeaderIndex(headers, ["nome"]),
      cognome: findHeaderIndex(headers, ["cognome"]),
      cf: findHeaderIndex(headers, ["codice fiscale", "cf"]),
      dataNascita: findHeaderIndex(headers, ["data di nascita", "data nascita"]),
      luogoNascita: findHeaderIndex(headers, ["luogo di nascita", "luogo nascita"]),
      operatore: findHeaderIndex(headers, ["operatore"]),
      qualifica: findHeaderIndex(headers, ["qualifica"]),
      ruolo: findHeaderIndex(headers, ["ruolo"]),
      firma: findHeaderIndex(headers, ["firma", "firma id"])
    };
  }
}

// =========================================================================
// FUNZIONI COMPATIBILITÀ DECORATOR / WRAPPER LEGACY
// =========================================================================

/**
 * Recupera i dati dal foglio "Operatori" e li trasforma in un array di oggetti JS.
 * @return {Operatore[]}
 */
function getOperatoriObjects() {
  return OperatoreRepository.getAll();
}

/**
 * Restituisce un oggetto operatore cercando per nome
 * @param {string} nome - Il nome dell'operatore (es. "Lorenzo")
 * @returns {Operatore|null} - L'oggetto operatore o null se non trovato
 */
function getOperatoreByName(nome) {
  return OperatoreRepository.getByName(nome);
}
