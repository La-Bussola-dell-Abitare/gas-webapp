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
     * Chiave utilizzata per la memorizzazione dei valori in CacheService e ScriptProperties.
     * @type {string}
     */
    static get CACHE_KEY() {
        return "DATI_BUNDLE";
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
     * @return {Record<string, any>}
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
            topPrefissi: typeof TopPriorityCountries !== "undefined" ? [...TopPriorityCountries] : [],
            countries: typeof Countries !== "undefined" ? Countries : []
        };
    }

    /**
     * Recupera l'insieme completo di tutti i valori ammessi per i form della Web App.
     * Architettura a Doppio Canale ad altissima reattività:
     * - Dati generali universali: letti istantaneamente in RAM dai moduli src/Domain/ (0 ms).
     * - Dati di sportello operativi: letti da CacheService (L1, ~2 ms) o ScriptProperties (L2, ~15 ms).
     * Zero chiamate a SpreadsheetApp a runtime.
     * 
     * @param {boolean} [forceRefresh=false] - Se true, forza la risincronizzazione da ScriptProperties.
     * @return {Record<string, any>} Dizionario contenente le liste di valori per ogni categoria.
     */
    static getAll(forceRefresh = false) {
        const defaults = LookupRepository.getDefaults();
        let sportelloLookups = null;

        // 1. Lettura L1 (Cache RAM)
        if (!forceRefresh && typeof CacheService !== "undefined" && CacheService.getScriptCache) {
            try {
                const cache = CacheService.getScriptCache();
                if (cache) {
                    const cached = cache.get(LookupRepository.CACHE_KEY);
                    if (cached) {
                        sportelloLookups = JSON.parse(cached);
                    }
                }
            } catch (e) {
                Logger.log("LookupRepository - Cache parsing error L1: " + e);
            }
        }

        // 2. Lettura L2 (ScriptProperties persistente)
        if (!sportelloLookups && typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
            try {
                const props = PropertiesService.getScriptProperties().getProperty(LookupRepository.CACHE_KEY);
                if (props) {
                    sportelloLookups = JSON.parse(props);
                    // Ripristino Cache L1
                    try {
                        const cache = CacheService.getScriptCache();
                        if (cache) cache.put(LookupRepository.CACHE_KEY, props, LookupRepository.CACHE_TTL);
                    } catch (e) {}
                }
            } catch (e) {
                Logger.log("LookupRepository - Properties parsing error L2: " + e);
            }
        }

        // 3. Fallback di prima inizializzazione se Properties è ancora vuota
        if (!sportelloLookups) {
            if (typeof DomainSyncService !== "undefined" && typeof DomainSyncService.syncAllLookupsToProperties === "function") {
                try {
                    sportelloLookups = DomainSyncService.syncAllLookupsToProperties();
                } catch (e) {
                    Logger.log("LookupRepository - Errore auto-sync iniziale: " + e);
                }
            }
        }

        const sl = sportelloLookups || {};

        return {
            // Dati di sportello (da ScriptProperties / Cache)
            abitazione: (sl.abitazione && sl.abitazione.length > 0) ? sl.abitazione : defaults.abitazione,
            servizi: (sl.servizi && sl.servizi.length > 0) ? sl.servizi : defaults.servizi,
            criticita: (sl.criticita && sl.criticita.length > 0) ? sl.criticita : defaults.criticita,
            relazioni: (sl.relazioni && sl.relazioni.length > 0) ? sl.relazioni : defaults.relazioni,
            statiCivili: (sl.statiCivili && sl.statiCivili.length > 0) ? sl.statiCivili : defaults.statiCivili,
            statiLavorativi: (sl.statiLavorativi && sl.statiLavorativi.length > 0) ? sl.statiLavorativi : defaults.statiLavorativi,
            tipiDocumenti: (sl.tipiDocumenti && sl.tipiDocumenti.length > 0) ? sl.tipiDocumenti : defaults.tipiDocumenti,

            // Dati universali (0ms direttamente dai moduli di dominio in memoria)
            titoliStudio: defaults.titoliStudio,
            stati: defaults.stati,
            prefissiTelefonici: defaults.prefissiTelefonici,
            topPrefissi: defaults.topPrefissi,
            countries: defaults.countries
        };
    }

    /**
     * Invalida la cache dei valori di lookup.
     * @return {void}
     */
    static clearCache() {
        if (typeof CacheService !== "undefined" && CacheService.getScriptCache) {
            try {
                const cache = CacheService.getScriptCache();
                if (cache) {
                    cache.remove(LookupRepository.CACHE_KEY);
                    cache.remove("LOOKUP_VALUES_V2");
                    cache.remove("DATI_BENEFICIARI");
                    cache.remove("DATI_DOCUMENTI");
                    cache.remove("DATI_SPORTELLI");
                    cache.remove("DATI_OPERATORI");
                    cache.remove("DATI_ORARI");
                }
            } catch (e) {}
        }
    }
}
