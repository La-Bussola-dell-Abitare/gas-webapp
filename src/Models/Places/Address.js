/**
 * @typedef {Object} AddressData
 * @property {string} street - Via.
 * @property {City} city - Città.
 * @property {string} postalCode - Codice di Avviamento Postale.
 */

/**
 * Classe per la gestione e la decodifica delle informazioni geografiche di un indirizzo.
 * 
 * @property {string} street - Via.
 * @property {City} city - Città.
 * @property {string} postalCode - Codice di Avviamento Postale.
 */
class Address {
    /**
     * @param {string} street
     * @param {City} city
     * @param {string} postalCode
     */
    constructor(street, city, postalCode) {
        this.street = street;
        this.city = city;
        this.postalCode = postalCode;
    }
}

let address = new Address("Via Roma", new City("Roma"), "00100");
console.log(address);