/**
 * @file LookupRepository.js
 * @description Repository per l'accesso e la gestione centralizzata dei valori ammessi (lookup lists)
 * e delle dropdown della Web App. Recupera i dati dai Named Ranges del foglio Google Sheets attivo,
 * con fallback automatico sui moduli di Dominio e caching performante tramite CacheService.
 * @module Repository/LookupRepository
 */

/**
 * Repository per il recupero delle liste di valori e convalidazione dai Named Ranges.
 */
class LookupRepository {
    /**
     * Chiave utilizzata per la memorizzazione dei valori in CacheService.
     * @type {string}
     */
    static get CACHE_KEY() {
        return "LOOKUP_VALUES_V2";
    }

    /**
     * Durata massima della cache in secondi (6 ore = 21600s).
     * @type {number}
     */
    static get CACHE_TTL() {
        return 21600;
    }

    /**
     * Estrae un array di stringhe non vuote e uniche da un Named Range nel foglio Google attivo.
     * Supporta ricerca diretta e fallback case/accent-insensitive tra tutti i Named Ranges del foglio.
     * 
     * @param {string} rangeName - Il nome dell'intervallo denominato (es. "Abitazione", "Criticità").
     * @return {string[]} Array di stringhe con i valori trovati, oppure array vuoto.
     */
    static getNamedRangeValues(rangeName) {
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            if (!ss) return [];

            let range = ss.getRangeByName(rangeName);

            // Se non trovato direttamente, cerca case-insensitive e normalizzando gli accenti
            if (!range) {
                const target = rangeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const allRanges = ss.getNamedRanges();
                const found = allRanges.find(nr => {
                    const nrName = nr.getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return nrName === target;
                });
                if (found) {
                    range = found.getRange();
                }
            }

            if (!range) return [];

            const raw = range.getValues();
            const values = [];

            for (let r = 0; r < raw.length; r++) {
                for (let c = 0; c < raw[r].length; c++) {
                    const cell = raw[r][c];
                    if (cell !== "" && cell !== null && cell !== undefined) {
                        const str = String(cell).trim();
                        if (str && !values.includes(str)) {
                            values.push(str);
                        }
                    }
                }
            }

            return values;
        } catch (err) {
            Logger.log(`LookupRepository - Errore lettura Named Range '${rangeName}': ${err instanceof Error ? err.message : String(err)}`);
            return [];
        }
    }

    /**
     * Restituisce i valori predefiniti di dominio (Single Source of Truth)
     * da utilizzare come fallback quando i Named Ranges non sono definiti o accessibili.
     * @return {Record<string, string[]>}
     */
    static getDefaults() {
        return {
            abitazione: typeof Abitazione !== "undefined" ? [...Abitazione] : [],
            servizi: typeof SportelloServizi !== "undefined" ? [...SportelloServizi] : [],
            criticita: typeof Criticita !== "undefined" ? [...Criticita] : [],
            relazioni: typeof Relations !== "undefined" ? [...Relations] : [],
            statiCivili: typeof StatiCivili !== "undefined" ? [...StatiCivili] : [],
            statiLavorativi: typeof WorkStatuses !== "undefined" ? [...WorkStatuses] : [],
            titoliStudio: typeof TitoliStudio !== "undefined" ? [...TitoliStudio] : [],
            stati: typeof StatiMondiali !== "undefined" ? [...StatiMondiali] : [],
            tipiDocumenti: typeof TipiDocumenti !== "undefined" ? [...TipiDocumenti] : [],
            prefissiTelefonici: typeof CountryPhoneData !== "undefined" ? CountryPhoneData : {},
            topPrefissi: typeof TopPriorityCountries !== "undefined" ? [...TopPriorityCountries] : []
        };
    }

    /**
     * Recupera l'insieme completo di tutti i valori ammessi per i form della Web App.
     * Interroga prima la cache; in caso di cache miss o se richiesto l'aggiornamento forzato,
     * legge i Named Ranges dal foglio Google e ricorre ai valori di Dominio come fallback.
     * 
     * @param {boolean} [forceRefresh=false] - Se true, invalida la cache e forza la rilettura dal foglio.
     * @return {Record<string, string[]>} Dizionario contenente le liste di valori per ogni categoria.
     */
    static getAll(forceRefresh = false) {
        const cache = CacheService.getScriptCache();

        if (!forceRefresh && cache) {
            const cached = cache.get(LookupRepository.CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.prefissiTelefonici && Object.keys(parsed.prefissiTelefonici).length > 0) {
                        return parsed;
                    }
                    Logger.log("LookupRepository - Cache priva di prefissi telefonici, rigenerazione.");
                } catch (e) {
                    Logger.log("LookupRepository - Cache parsing error, rilettura dal foglio.");
                }
            }
        }

        const defaults = LookupRepository.getDefaults();

        /**
         * @param {string} rangeName
         * @param {string[]} defaultValues
         * @return {string[]}
         */
        const pick = (rangeName, defaultValues) => {
            const sheetValues = LookupRepository.getNamedRangeValues(rangeName);
            return sheetValues.length > 0 ? sheetValues : defaultValues;
        };

        const lookups = {
            abitazione: pick("Abitazione", defaults.abitazione),
            servizi: pick("Sportello_Servizi", defaults.servizi),
            criticita: pick("Criticità", defaults.criticita),
            relazioni: pick("Relazioni", defaults.relazioni),
            statiCivili: pick("StatoCivile", defaults.statiCivili),
            statiLavorativi: pick("StatoLavorativo", defaults.statiLavorativi),
            titoliStudio: pick("TitoliStudio", defaults.titoliStudio),
            stati: pick("Stati", defaults.stati),
            tipiDocumenti: pick("TipiDocumenti", defaults.tipiDocumenti),
            prefissiTelefonici: defaults.prefissiTelefonici,
            topPrefissi: defaults.topPrefissi
        };

        // Memorizzazione in CacheService
        if (cache) {
            try {
                cache.put(LookupRepository.CACHE_KEY, JSON.stringify(lookups), LookupRepository.CACHE_TTL);
            } catch (err) {
                Logger.log(`LookupRepository - Errore salvataggio cache: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        return lookups;
    }

    /**
     * Invalida la cache dei valori di lookup.
     * @return {void}
     */
    static clearCache() {
        const cache = CacheService.getScriptCache();
        if (cache) {
            cache.remove(LookupRepository.CACHE_KEY);
        }
    }
}
