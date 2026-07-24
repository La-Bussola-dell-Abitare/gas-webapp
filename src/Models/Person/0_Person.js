/**
 * @typedef {Object} PersonData
 * @property {string} name - Il nome della persona.
 * @property {string} surname - Il cognome della persona.
 * @property {Date | null} birthDate - La data di nascita.
 * @property {string} birthPlace - Il luogo di nascita.
 * @property {CodiceFiscale} taxCode - L'istanza del codice fiscale della persona.
 * @property {string | null} [email=null] - L'indirizzo email (opzionale).
 * @property {string | null} [phone=null] - Il numero di telefono (opzionale).
 * @property {string | null} [citizenship=null] - La cittadinanza (opzionale).
 * @property {string | null} [signatureFileId=null] - L'ID del file della firma (opzionale).
 */

/**
 * Classe base che rappresenta una persona.
 */
class Person {
  /**
   * Crea un'istanza di Person.
   * @param {PersonData} data - I dati iniziali della persona.
   */
  constructor(data) {
    this.name = data.name;
    this.surname = data.surname;
    this.birthDate = data.birthDate;
    this.birthPlace = data.birthPlace;
    this.taxCode = data.taxCode;
    this.email = data.email || null;
    this.phone = data.phone || null;
    this.citizenship = data.citizenship || null;
    this.signatureFileId = data.signatureFileId || null;
  }

  // =========================================================================
  // PROPRIETÀ ALIAS PER RETROCOMPATIBILITÀ (ITALIANO)
  // =========================================================================
  get nome() { return this.name; }
  set nome(v) { this.name = v; }
  get cognome() { return this.surname; }
  set cognome(v) { this.surname = v; }
  get cf() { return this.taxCode ? this.taxCode.originale : ""; }
  get dataNascita() { return this.birthDate; }
  get luogoNascita() { return this.birthPlace instanceof City ? this.birthPlace.name : this.birthPlace; }
  get telefono() { return this.phone; }
  get cittadinanza() { return this.citizenship; }
}