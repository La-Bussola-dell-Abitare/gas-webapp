/**
 * @typedef {Object} CityData
 * @property {string} name - Nome del comune / Città.
 * @property {string[]} cap - Codice di Avviamento Postale.
 * @property {string} province - Sigla della provincia (es. "RM").
 * @property {string} country - Nazione.
 * @property {string} [codiceCatastale] - Codice catastale (se in Italia).
 */

/**
 * Classe per la gestione e la decodifica delle informazioni geografiche di una città/comune.
 */
class City {
  /**
   * Crea un'istanza di City ricavando le informazioni in tempo reale.
   * @param {string} name - Il nome esatto del comune o della città.
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
    /** @type {string} */
    this.country = "";

    this._resolve();
  }

  /**
   * Risolve le informazioni geografiche tramite cache e API pubbliche gratuite.
   * @private
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
   * Salva le proprietà correnti in cache.
   * @private
   * @param {GoogleAppsScript.Cache.Cache} cache
   * @param {string} key
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
