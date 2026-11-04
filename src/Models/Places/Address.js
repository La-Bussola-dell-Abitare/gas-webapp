/**
 * @file Address.js
 * @description Modello per la gestione e la formalizzazione degli indirizzi di residenza e domicilio.
 * Associa una via/piazza a un'istanza della classe City e al relativo CAP.
 * @module Models/Places/Address
 */

/**
 * Struttura dei dati per l'inizializzazione di un indirizzo.
 * @typedef {Object} AddressData
 * @property {string} street - Nome della via, piazza e numero civico.
 * @property {City|string} city - Oggetto City o nome della città.
 * @property {string} postalCode - Codice di Avviamento Postale (CAP).
 */

/**
 * Classe per la gestione e la rappresentazione strutturata delle informazioni di un indirizzo.
 * 
 * @property {string} street - Via e numero civico.
 * @property {City|string} city - Città associata.
 * @property {string} postalCode - Codice di Avviamento Postale.
 */
class Address {
    /**
     * Crea un'istanza di Address.
     * @param {string} street - Via e numero civico.
     * @param {City|string} city - Città associata (istanza di City o stringa).
     * @param {string} postalCode - Codice di Avviamento Postale (CAP).
     */
    constructor(street, city, postalCode) {
        this.street = street;
        this.city = city;
        this.postalCode = postalCode;
    }
}

/**
 * Funzione di esempio/test per verificare la creazione di un indirizzo completo.
 * @return {void}
 */
function testAddressExample() {
    const addr = new Address("Via Roma 1", new City("Roma"), "00100");
    Logger.log(JSON.stringify(addr));
}
