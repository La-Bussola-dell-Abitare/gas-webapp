/**
 * @file Operatore.js
 * @description Modello per la gestione dell'Operatore dello sportello (operatore sociale o assistente sociale).
 * Estende la classe Person memorizzando qualifica professionale, ruolo (es. accoglienza, coordinamento),
 * identificativo operatore e factory method per l'idratazione da riga di Google Sheets.
 * @module Models/Person/Operatore
 */

/**
 * Proprietà professionali specifiche dell'operatore.
 * @typedef {Object} OperatoreOnlyData
 * @property {string} operatore - Sigla o identificativo testuale dell'operatore.
 * @property {string} qualifica - La qualifica professionale (es. "Operatore Sociale", "Assistente Sociale").
 * @property {string} ruolo - Il ruolo assegnato nello sportello (es. "Accoglienza", "Coordinamento").
 */

/**
 * Struttura combinata dei dati anagrafici e professionali dell'operatore.
 * @typedef {PersonData & OperatoreOnlyData} OperatoreData
 */

/**
 * Classe che rappresenta un operatore o assistente sociale dello sportello.
 * @extends Person
 */
class Operatore extends Person {
  /**
   * Crea un'istanza di Operatore.
   * @param {OperatoreData} data - I dati anagrafici e lavorativi dell'operatore.
   */
  constructor(data) {
    super(data);
    this.operatore = data.operatore || "";
    this.qualifica = data.qualifica || "";
    this.ruolo = data.ruolo || "";
  }

  /**
   * Factory statico per istanziare un Operatore a partire da una riga grezza di Google Sheets
   * e dalla mappa dinamica degli indici di colonna.
   * 
   * @param {any[]} row - La riga di dati del foglio "Operatori".
   * @param {Record<string, number>} idx - Mappa degli indici delle colonne calcolata dalle intestazioni.
   * @return {Operatore} La nuova istanza dell'Operatore idratata con i dati del foglio.
   */
  static fromRow(row, idx) {
    const nomeVal = getSheetVal(row, idx, "nome", "");
    const cognomeVal = getSheetVal(row, idx, "cognome", "");
    const cfVal = (getSheetVal(row, idx, "cf", "") || getSheetVal(row, idx, "codice fiscale", "")).trim().toUpperCase();
    const dataNascitaVal = (idx.dataNascita !== undefined && idx.dataNascita >= 0 && idx.dataNascita < row.length)
      ? row[idx.dataNascita]
      : getSheetVal(row, idx, "data di nascita", null);
    const luogoNascitaVal = getSheetVal(row, idx, "luogoNascita", "") || getSheetVal(row, idx, "luogo di nascita", "");
    const firmaVal = getSheetVal(row, idx, "firma", "");

    const operatoreVal = getSheetVal(row, idx, "operatore", "");
    const qualificaVal = getSheetVal(row, idx, "qualifica", "");
    const ruoloVal = getSheetVal(row, idx, "ruolo", "");

    let birthPlaceCity = luogoNascitaVal;
    let resolvedCitizenship = typeof Citizenship !== "undefined" && Citizenship.Italiana ? Citizenship.Italiana : "Italia";
    if (luogoNascitaVal) {
      try {
        birthPlaceCity = new City(luogoNascitaVal);
        resolvedCitizenship = birthPlaceCity.country === "Italia"
          ? (typeof Citizenship !== "undefined" ? Citizenship.Italiana : "Italia")
          : (typeof Citizenship !== "undefined" ? Citizenship.Apolide : "Apolide");
      } catch (e) {
        birthPlaceCity = luogoNascitaVal;
      }
    }

    let taxCodeObj = null;
    if (cfVal) {
      try {
        taxCodeObj = new CodiceFiscale(cfVal);
      } catch (e) {
        taxCodeObj = { originale: cfVal, normalizzato: cfVal };
      }
    }

    return new Operatore({
      name: nomeVal,
      surname: cognomeVal,
      taxCode: taxCodeObj,
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
