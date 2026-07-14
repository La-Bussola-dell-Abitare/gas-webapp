/**
 * Classe per la gestione e la decodifica del Codice Fiscale.
 */
class CodiceFiscale {
    /**
     * Crea un'istanza di CodiceFiscale.
     * @param {string} cf - Il codice fiscale da analizzare.
     */
    constructor(cf) {
        if (!cf) throw new Error("Il codice fiscale non può essere vuoto");
        this.originale = cf.trim().toUpperCase();
        this.normalizzato = CodiceFiscale._decodificaOmocodia(this.originale);
    }

    /**
     * Mappa ufficiale delle lettere di omocodia.
     * @private
     * @type {Record<string, string>}
     */
    static get _mappaOmocodia() {
        return {
            'L': '0', 'M': '1', 'N': '2', 'P': '3', 'Q': '4',
            'R': '5', 'S': '6', 'T': '7', 'U': '8', 'V': '9'
        };
    }

    /**
     * Mappa dei caratteri in posizione dispari (1-indexed) per il calcolo del carattere di controllo.
     * @private
     * @type {Record<string, number>}
     */
    static get _mappaDispari() {
        return {
            'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
            'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
            'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23,
            '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21
        };
    }

    /**
     * Mappa dei caratteri in posizione pari (1-indexed) per il calcolo del carattere di controllo.
     * @private
     * @type {Record<string, number>}
     */
    static get _mappaPari() {
        return {
            'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
            'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
            'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25,
            '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
        };
    }

    /**
     * Decodifica il codice Belfiore (catastale) restituendo il nome del comune o dello stato estero.
     * @param {string} codice - Il codice Belfiore di 4 caratteri (es. F205 o Z112).
     * @return {string} Il nome corrispondente, o il codice originale se non trovato.
     */
    static decodeBelfiore(codice) {
        if (!codice || codice.length !== 4) return codice;

        const cache = CacheService.getScriptCache();
        if (!cache) return codice;
        const cacheKey = "BELFIORE_" + codice;

        try {
            const cachedValue = cache.get(cacheKey);
            if (cachedValue) return cachedValue;
        } catch (e) {
            // Ignoriamo eventuali errori del CacheService
        }

        try {
            if (codice.toUpperCase().startsWith("Z")) {
                // Stato estero
                const url = "https://raw.githubusercontent.com/pmontrasio/codici-stati/master/dist/countries.json";
                const response = UrlFetchApp.fetch(url);
                const countries = JSON.parse(response.getContentText());

                // Ricerca della corrispondenza per taxcode_country_code
                for (const key in countries) {
                    if (countries[key].taxcode_country_code === codice) {
                        const name = titleCase(countries[key].italian_country_name_1 || countries[key].italian_country_name_2);
                        if (name) {
                            try {
                                cache.put(cacheKey, name, 21600); // cache 6 ore
                            } catch (e) { }
                            return name;
                        }
                    }
                }
            } else {
                // Comune italiano
                const url = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";
                const response = UrlFetchApp.fetch(url);
                /** @type {Array<{ codiceCatastale: string; nome: string }>} */
                const comuni = JSON.parse(response.getContentText());

                const comune = comuni.find(c => c.codiceCatastale === codice);
                if (comune && comune.nome) {
                    const name = titleCase(comune.nome);
                    try {
                        cache.put(cacheKey, name, 21600); // cache 6 ore
                    } catch (e) { }
                    return name;
                }
            }
        } catch (e) {
            Logger.log("Errore nella decodifica Belfiore del codice " + codice + ": " + e.message);
        }

        return codice;
    }

    /**
     * Calcola il carattere di controllo per i primi 15 caratteri del codice fiscale.
     * @private
     * @param {string} cf - Il codice fiscale.
     * @return {string}
     */
    static _calcolaCarattereControllo(cf) {
        if (!cf || cf.length < 15) return "";
        let somma = 0;
        const mappaDispari = CodiceFiscale._mappaDispari;
        const mappaPari = CodiceFiscale._mappaPari;

        for (let i = 0; i < 15; i++) {
            const char = cf.charAt(i);
            if (i % 2 === 0) {
                const val = mappaDispari[char];
                if (val === undefined) return "";
                somma += val;
            } else {
                const val = mappaPari[char];
                if (val === undefined) return "";
                somma += val;
            }
        }
        return String.fromCharCode(65 + (somma % 26));
    }

    /**
     * Ripristina i numeri originali sostituendo le lettere di omocodia.
     * @private
     * @param {string} cf - Il codice fiscale.
     * @return {string}
     */
    static _decodificaOmocodia(cf) {
        const posizioniNumeriche = [6, 7, 9, 10, 12, 13, 14];
        let cfArray = cf.split("");
        const mappa = CodiceFiscale._mappaOmocodia;

        for (let i = 0; i < cfArray.length; i++) {
            if (posizioniNumeriche.includes(i)) {
                let char = cfArray[i];
                if (mappa[char] !== undefined) {
                    cfArray[i] = mappa[char];
                }
            }
        }
        return cfArray.join("");
    }

    /**
     * Verifica se la struttura base del codice (16 caratteri) è valida.
     * @param {string} cf - Il codice fiscale.
     * @return {boolean}
     */
    static isValid(cf) {
        if (cf == null) return false;
        cf = cf.toString().toUpperCase().trim();
        const regex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPRST]{1}[0-9LMNPQRSTUV]{2}[A-Z]{1}[0-9LMNPQRSTUV]{3}[A-Z]{1}$/;
        if (!regex.test(cf)) return false;

        const calcolato = CodiceFiscale._calcolaCarattereControllo(cf);
        return calcolato === cf.charAt(15);
    }

    /**
     * Estrae la data di nascita da un codice fiscale.
     * @param {string} cf - Il codice fiscale.
     * @return {Date} Oggetto Date corrispondente alla data di nascita.
     */
    static getBirthdate(cf) {
        if (!CodiceFiscale.isValid(cf)) throw new Error("Codice Fiscale non valido o incompleto");
        
        const cfNormalizzato = CodiceFiscale._decodificaOmocodia(cf.toUpperCase().trim());

        // 1. Anno
        let anno = parseInt(cfNormalizzato.substring(6, 8), 10);
        const annoCorrenteDueCifre = new Date().getFullYear() % 100;
        anno += (anno > annoCorrenteDueCifre) ? 1900 : 2000;

        // 2. Mese
        const mesi = "ABCDEHLMPRST";
        let mese = mesi.indexOf(cfNormalizzato.charAt(8));
        if (mese === -1) throw new Error("Mese non valido");

        // 3. Giorno
        let giorno = parseInt(cfNormalizzato.substring(9, 11), 10);
        if (giorno > 40) giorno -= 40;
        if (giorno < 1 || giorno > 31) throw new Error("Giorno non valido");

        return new Date(anno, mese, giorno);
    }

    /**
     * Determina il sesso ('M' o 'F') da un codice fiscale.
     * @param {string} cf - Il codice fiscale.
     * @return {"M" | "F"}
     */
    static getSesso(cf) {
        if (!CodiceFiscale.isValid(cf)) throw new Error("Codice Fiscale non valido o incompleto");
        const cfNormalizzato = CodiceFiscale._decodificaOmocodia(cf.toUpperCase().trim());
        let giorno = parseInt(cfNormalizzato.substring(9, 11), 10);
        return giorno > 40 ? "F" : "M";
    }

    /**
     * Estrae il codice catastale del comune di nascita da un codice fiscale.
     * @param {string} cf - Il codice fiscale.
     * @return {string}
     */
    static getCodiceComune(cf) {
        if (!CodiceFiscale.isValid(cf)) throw new Error("Codice Fiscale non valido o incompleto");
        const cfNormalizzato = CodiceFiscale._decodificaOmocodia(cf.toUpperCase().trim());
        return cfNormalizzato.substring(11, 15);
    }

    /**
     * Ritorna il nome del comune o dello stato estero di nascita da un codice fiscale.
     * @param {string} cf - Il codice fiscale.
     * @return {string} Il nome del comune o dello stato di nascita.
     */
    static getBirthplace(cf) {
        return CodiceFiscale.decodeBelfiore(CodiceFiscale.getCodiceComune(cf));
    }

    /**
     * Ritorna lo stato di nascita ("Italia" o il nome dello stato estero) da un codice fiscale.
     * @param {string} cf - Il codice fiscale.
     * @return {string} Lo stato di nascita.
     */
    static getBirthplaceCountry(cf) {
        const codice = CodiceFiscale.getCodiceComune(cf);
        if (codice.toUpperCase().startsWith("Z")) {
            return CodiceFiscale.decodeBelfiore(codice);
        }
        return "Italia";
    }

    /**
     * Verifica se la struttura base del codice (16 caratteri) è valida.
     * @return {boolean}
     */
    isValid() {
        return CodiceFiscale.isValid(this.originale);
    }

    /**
     * Estrae la data di nascita.
     * @return {Date} Oggetto Date corrispondente alla data di nascita.
     */
    getBirthdate() {
        return CodiceFiscale.getBirthdate(this.originale);
    }

    /**
     * Determina il sesso ('M' o 'F').
     * @return {"M" | "F"}
     */
    getSesso() {
        return CodiceFiscale.getSesso(this.originale);
    }

    /**
     * Estrae il codice catastale del comune di nascita.
     * @return {string}
     */
    getCodiceComune() {
        return CodiceFiscale.getCodiceComune(this.originale);
    }

    /**
     * Ritorna il nome del comune o dello stato estero di nascita.
     * @return {string} Il nome del comune o dello stato di nascita.
     */
    getBirthplace() {
        return CodiceFiscale.getBirthplace(this.originale);
    }

    /**
     * Ritorna lo stato di nascita ("Italia" o il nome dello stato estero).
     * @return {string} Lo stato di nascita.
     */
    getBirthplaceCountry() {
        return CodiceFiscale.getBirthplaceCountry(this.originale);
    }
}

// =========================================================================
// FUNZIONI WRAPPER PER USARE LA CLASSE DIRETTAMENTE NELLE CELLE DI GOOGLE SHEETS
// =========================================================================

/**
 * Formula personalizzata per estrarre la DATA DI NASCITA usando la classe.
 * @param {string} cf Il codice fiscale.
 * @return {Date | string} La data di nascita.
 * @customfunction
 */
function CF_DATA_NASCITA(cf) {
    try {
        return CodiceFiscale.getBirthdate(cf);
    } catch (e) {
        return "Errore";
    }
}

/**
 * Formula personalizzata per estrarre il SESSO usando la classe.
 * @param {string} cf Il codice fiscale.
 * @return {string} 'M' o 'F'.
 * @customfunction
 */
function CF_SESSO(cf) {
    try {
        return CodiceFiscale.getSesso(cf);
    } catch (e) {
        return "Errore";
    }
}

/**
 * Formula personalizzata per validare la struttura del codice fiscale.
 * @param {string} cf Il codice fiscale.
 * @return {boolean} VERO o FALSO.
 * @customfunction
 */
function CF_VALIDA(cf) {
    try {
        return CodiceFiscale.isValid(cf);
    } catch (e) {
        return false;
    }
}

/**
 * Formula personalizzata per estrarre il COMUNE O STATO DI NASCITA usando la classe.
 * @param {string} cf Il codice fiscale.
 * @return {string} Il nome del comune o dello stato estero di nascita.
 * @customfunction
 */
function CF_COMUNE(cf) {
    try {
        return CodiceFiscale.getBirthplace(cf);
    } catch (e) {
        return "Errore";
    }
}
