/**
 * @file services.js
 * @description Modulo di dominio per la definizione e tipizzazione dei servizi erogati dallo sportello
 * sociale "La Bussola dell'Abitare" e delle criticità rilevate nei nuclei familiari e beneficiari.
 * Fornisce elenchi immutabili di fallback per i Named Ranges del foglio Google.
 * @module Domain/Services
 */

/**
 * Elenco immutabile di default dei servizi erogati dallo sportello (Sportello_Servizi).
 * @readonly
 * @enum {string}
 */
const SportelloServizi = Object.freeze(/** @type {const} */([
    "Colloquio di accoglienza e orientamento",
    "Domanda ERP (Edilizia Residenziale Pubblica)",
    "Residenza fittizia e iscrizione anagrafica",
    "Supporto morosità incolpevole / emergenza sfratto",
    "Accompagnamento e presa in carico Servizi Sociali",
    "Consulenza legale e contrattuale locazioni",
    "Supporto rilascio o rinnovo CIE",
    "Consultazione graduatoria bando casa",
    "Orientamento al lavoro e formazione",
    "Segnalazione secondo livello specialistico",
    "Altro"
]));

/**
 * Elenco immutabile di default delle criticità rilevate nei casi seguiti dallo sportello (Criticità).
 * @readonly
 * @enum {string}
 */
const Criticita = Object.freeze(/** @type {const} */([
    "Senza dimora / precarietà estrema",
    "Procedura di sfratto esecutivo",
    "Morosità pregressa",
    "Sovraffollamento abitativo",
    "Inidoneità alloggiativa / condizioni igienico-sanitarie",
    "Disoccupazione / assenza di reddito stabile",
    "Fragilità sanitaria o disabilità nel nucleo",
    "Isolamento sociale o assenza di rete familiare",
    "Documentazione anagrafica o di soggiorno irregolare",
    "Altro"
]));

/**
 * Tipo unione per un servizio dello sportello.
 * @typedef {typeof SportelloServizi[number]} ServizioSportello
 */

/**
 * Tipo unione per una criticità rilevata.
 * @typedef {typeof Criticita[number]} CriticitaCaso
 */
