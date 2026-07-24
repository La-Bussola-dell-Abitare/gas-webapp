/**
 * @typedef {Object} OperatoreOnlyData
 * @property {string} operatore - Il nome dell'operatore.
 * @property {string} qualifica - La qualifica dell'operatore.
 * @property {string} ruolo - Il ruolo dell'operatore.
 */

/**
 * @typedef {PersonData & OperatoreOnlyData} OperatoreData

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