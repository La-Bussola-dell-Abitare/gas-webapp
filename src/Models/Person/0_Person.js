/**
 * @file 0_Person.js
 * @description Modello base OOP che definisce l'entità Persona.
 * Contiene le proprietà anagrafiche fondamentali condivise sia dai beneficiari che dagli operatori
 * (nome, cognome, data e luogo di nascita, codice fiscale, contatti, firma).
 * Fornisce getter/setter con alias in lingua italiana per garantire la retrocompatibilità.
 * NOTA SUL PREFISSO '0_': In Google Apps Script V8, l'ordine di esecuzione dei file a runtime segue l'ordine
 * alfabetico. Il prefisso '0_' è fondamentale affinché la superclasse Person venga inizializzata PRIMA delle
 * sottoclassi che la estendono (Beneficiario.js e Operatore.js), prevenendo l'errore "Person is not defined".
 * @module Models/Person/Person
 */

/**
 * Struttura dei dati per l'inizializzazione di una Persona.
 * @typedef {Object} PersonData
 * @property {string} name - Il nome della persona.
 * @property {string} surname - Il cognome della persona.
 * @property {Date | null} [birthDate] - La data di nascita.
 * @property {City|string} birthPlace - Il luogo o città di nascita.
 * @property {CodiceFiscale} [taxCode] - L'istanza del codice fiscale della persona.
 * @property {string | null} [email=null] - L'indirizzo email (opzionale).
 * @property {string | null} [phone=null] - Il numero di telefono (opzionale).
 * @property {Citizenship | string | null} [citizenship=null] - La cittadinanza (opzionale).
 * @property {string | null} [signatureFileId=null] - L'ID del file Drive contenente la firma grafica (opzionale).
 */

/**
 * Classe base che rappresenta una persona nell'ecosistema dell'applicazione.
 */
class Person {
  /**
   * Crea un'istanza di Person.
   * @param {PersonData} data - I dati anagrafici iniziali della persona.
   */
  constructor(data) {
    this.name = data.name || data.nome || "";
    this.surname = data.surname || data.cognome || "";
    this.birthDate = data.birthDate || data.dataNascita || null;
    this.birthPlace = data.birthPlace || data.luogoNascita || "";
    this.taxCode = data.taxCode || (data.cf ? (typeof CodiceFiscale !== "undefined" && CodiceFiscale.isValid(data.cf) ? new CodiceFiscale(data.cf) : { originale: data.cf, normalizzato: data.cf }) : null);
    this.email = data.email || null;
    this.phone = data.phone || data.telefono || null;
    this.citizenship = data.citizenship || data.cittadinanza || null;
    this.signatureFileId = data.signatureFileId || data.firma || null;
    this.photoFileId = data.photoFileId || data.foto || null;
  }

  // =========================================================================
  // PROPRIETÀ ALIAS PER RETROCOMPATIBILITÀ (ITALIANO)
  // =========================================================================

  /**
   * Restituisce il nome della persona.
   * @return {string}
   */
  get nome() { return this.name; }

  /**
   * Imposta il nome della persona.
   * @param {string} v - Il nuovo nome.
   */
  set nome(v) { this.name = v; }

  /**
   * Restituisce il cognome della persona.
   * @return {string}
   */
  get cognome() { return this.surname; }

  /**
   * Imposta il cognome della persona.
   * @param {string} v - Il nuovo cognome.
   */
  set cognome(v) { this.surname = v; }

  /**
   * Restituisce il codice fiscale in formato stringa.
   * @return {string} Il codice fiscale originale o stringa vuota.
   */
  get cf() {
    if (!this.taxCode) return "";
    return this.taxCode instanceof CodiceFiscale ? this.taxCode.originale : (this.taxCode.originale || String(this.taxCode));
  }

  /**
   * Restituisce la data di nascita.
   * @return {Date|null|undefined}
   */
  get dataNascita() { return this.birthDate; }

  /**
   * Restituisce il nome della città o luogo di nascita.
   * @return {string}
   */
  get luogoNascita() { return this.birthPlace instanceof City ? this.birthPlace.name : (this.birthPlace || ""); }

  /**
   * Restituisce il numero di telefono.
   * @return {string|null}
   */
  get telefono() { return this.phone; }

  /**
   * Restituisce la cittadinanza.
   * @return {Citizenship|string|null}
   */
  get cittadinanza() { return this.citizenship; }

  /**
   * Restituisce l'ID del file Drive della firma autografa.
   * @return {string|null}
   */
  get firma() { return this.signatureFileId; }
  set firma(v) { this.signatureFileId = v; }

  /**
   * Restituisce l'ID del file Drive della fototessera / avatar.
   * @return {string|null}
   */
  get foto() { return this.photoFileId; }
  set foto(v) { this.photoFileId = v; }
}
