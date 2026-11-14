/**
 * @file City.js
 * @description Modello geografico per la rappresentazione, geocodifica e validazione dei Comuni italiani
 * e delle città estere. Interroga la cache interna di Apps Script (CacheService) e servizi remoti
 * (comuni-json e OpenStreetMap Nominatim) per estrarre provincia, CAP, codice catastale e nazione.
 * @module Domain/Places/City
 */

/**
 * Struttura dei dati geografici associati a una città.
 * @typedef {Object} CityData
 * @property {string} name - Nome del comune o della città.
 * @property {string[]} cap - Elenco dei Codici di Avviamento Postale associati.
 * @property {string} province - Sigla della provincia (es. "RM", "MI").
 * @property {Country|string} country - Nome della nazione di appartenenza.
 * @property {string} [codiceCatastale] - Codice catastale Belfiore (per i comuni italiani).
 */

/**
 * Classe per la gestione e la decodifica delle informazioni geografiche di una città/comune.
 * 
 * @property {string} name - Nome del comune / Città.
 * @property {string[]} cap - Codice di Avviamento Postale.
 * @property {string} province - Sigla della provincia (es. "RM").
 * @property {Country|string} country - Nazione.
 * @property {string} [codiceCatastale] - Codice catastale (se in Italia).
 */
class City {
  /**
   * Crea un'istanza di City ricavando le informazioni in tempo reale o da cache.
   * @param {string} name - Il nome esatto del comune o della città.
   * @throws {Error} Se il nome della città è vuoto o non definito.
   */
  constructor(name) {
    if (!name) throw new Error("City: il nome della città non può essere vuoto.");

    this.name = name.trim();
    /** @type {string[]} */
    this.cap = [];
    /** @type {string} */
    this.province = "";
    /** @type {string} */
    this.codiceCatastale = "";
    /** @type {Country|string} */
    this.country = "";

    this._resolve();
  }

  /**
   * Risolve le informazioni geografiche tramite cache e API pubbliche gratuite.
   * Cerca prima nei comuni italiani (comuni-json) e successivamente su OpenStreetMap Nominatim.
   * @private
   * @return {void}
   */
  _resolve() {
    const cache = CacheService.getScriptCache();
    if (!cache) return;

    const cacheKey = "CITY_" + this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");

    try {
      const cached = cache.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        this.cap = data.cap || [];
        this.province = data.province || "";
        this.codiceCatastale = data.codiceCatastale || "";
        this.country = data.country || "";
        return;
      }
    } catch (e) {
      Logger.log("Errore lettura cache City: " + e.message);
    }

    // 1. Cerca nei comuni italiani tramite comuni-json (veloce e gratuito)
    try {
      const urlComuni = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";
      const responseComuni = UrlFetchApp.fetch(urlComuni);
      /** @type {Array<{ nome: string, codiceCatastale: string, sigla: string, cap: string[] }>} */
      const comuni = JSON.parse(responseComuni.getContentText());

      const targetName = this.name.toLowerCase().trim();
      const comune = comuni.find(c => c.nome.toLowerCase().trim() === targetName);

      if (comune) {
        this.country = "Italia";
        this.province = comune.sigla;
        this.cap = comune.cap || [];
        this.codiceCatastale = comune.codiceCatastale;

        this._saveToCache(cache, cacheKey);
        return;
      }
    } catch (e) {
      Logger.log("Errore ricerca comuni italiani: " + e.message);
    }

    // 2. Se non trovato in Italia, interroga l'API di geocodifica Nominatim OpenStreetMap (gratuita e pubblica)
    try {
      const urlNominatim = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.name)}&format=json&addressdetails=1&limit=1`;
      const response = UrlFetchApp.fetch(urlNominatim, {
        headers: {
          "User-Agent": "BussolaAbitareApp/1.0 (GoogleAppsScript)"
        }
      });
      const results = JSON.parse(response.getContentText());

      if (results && results.length > 0) {
        const addr = results[0].address;

        // Verifica se è l'Italia gestita in altro modo da Nominatim
        if (addr.country_code === "it") {
          this.country = "Italia";
          this.province = addr.province || addr.county || "";
          if (addr.postcode) {
            this.cap = [addr.postcode];
          }
        } else {
          this.country = addr.country || "";
          this.province = addr.state || addr.region || addr.county || "";
          if (addr.postcode) {
            this.cap = [addr.postcode];
          }
        }

        this._saveToCache(cache, cacheKey);
        return;
      }
    } catch (e) {
      Logger.log("Errore ricerca estera Nominatim: " + e.message);
    }
  }

  /**
   * Salva le proprietà geografiche correnti nella cache di script di Google Apps Script (validità 6 ore).
   * @private
   * @param {GoogleAppsScript.Cache.Cache} cache - Istanza della cache di script.
   * @param {string} key - Chiave univoca identificativa della città.
   * @return {void}
   */
  _saveToCache(cache, key) {
    try {
      const data = {
        cap: this.cap,
        province: this.province,
        codiceCatastale: this.codiceCatastale,
        country: this.country
      };
      cache.put(key, JSON.stringify(data), 21600); // 6 ore
    } catch (e) {
      Logger.log("Errore scrittura cache City: " + e.message);
    }
  }
}

/**
 * Funzione di esempio/test per verificare la corretta risoluzione dei dati di un comune.
 * @return {void}
 */
function testCityExample() {
  const rome = new City("Roma");
  Logger.log(JSON.stringify(rome));
}
