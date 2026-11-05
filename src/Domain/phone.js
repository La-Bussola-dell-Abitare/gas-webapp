/**
 * @file phone.js
 * @description Modulo di dominio per i prefissi telefonici internazionali (ITU-T E.164).
 * Fornisce il mapping dei prefissi telefonici e codici ISO-2 per tutti gli stati mondiali censiti,
 * le funzioni di normalizzazione/parsing e l'elenco dei paesi prioritari per la Web App.
 * @module Domain/Phone
 */

/**
 * @typedef {Object} CountryPhoneInfo
 * @property {string} code - Prefisso telefonico internazionale con il '+' (es. "+39")
 * @property {string} iso - Codice ISO-3166-1 alpha-2 della nazione (es. "IT")
 * @property {string} flag - Emoji della bandiera nazionale (es. "🇮🇹")
 */

/**
 * Mapping completo e immutabile dei prefissi telefonici internazionali per tutti gli stati mondiali.
 * @readonly
 * @type {Record<string, CountryPhoneInfo>}
 */
const CountryPhoneData = Object.freeze({
  "Afghanistan": { code: "+93", iso: "AF", flag: "🇦🇫" },
  "Albania": { code: "+355", iso: "AL", flag: "🇦🇱" },
  "Algeria": { code: "+213", iso: "DZ", flag: "🇩🇿" },
  "Andorra": { code: "+376", iso: "AD", flag: "🇦🇩" },
  "Angola": { code: "+244", iso: "AO", flag: "🇦🇴" },
  "Antigua e Barbuda": { code: "+1268", iso: "AG", flag: "🇦🇬" },
  "Arabia Saudita": { code: "+966", iso: "SA", flag: "🇸🇦" },
  "Argentina": { code: "+54", iso: "AR", flag: "🇦🇷" },
  "Armenia": { code: "+374", iso: "AM", flag: "🇦🇲" },
  "Australia": { code: "+61", iso: "AU", flag: "🇦🇺" },
  "Austria": { code: "+43", iso: "AT", flag: "🇦🇹" },
  "Azerbaigian": { code: "+994", iso: "AZ", flag: "🇦🇿" },

  "Bahamas": { code: "+1242", iso: "BS", flag: "🇧🇸" },
  "Bahrein": { code: "+973", iso: "BH", flag: "🇧🇭" },
  "Bangladesh": { code: "+880", iso: "BD", flag: "🇧🇩" },
  "Barbados": { code: "+1246", iso: "BB", flag: "🇧🇧" },
  "Belgio": { code: "+32", iso: "BE", flag: "🇧🇪" },
  "Belize": { code: "+501", iso: "BZ", flag: "🇧🇿" },
  "Benin": { code: "+229", iso: "BJ", flag: "🇧🇯" },
  "Bhutan": { code: "+975", iso: "BT", flag: "🇧🇹" },
  "Bielorussia": { code: "+375", iso: "BY", flag: "🇧🇾" },
  "Bolivia": { code: "+591", iso: "BO", flag: "🇧🇴" },
  "Bosnia ed Erzegovina": { code: "+387", iso: "BA", flag: "🇧🇦" },
  "Botswana": { code: "+267", iso: "BW", flag: "🇧🇼" },
  "Brasile": { code: "+55", iso: "BR", flag: "🇧🇷" },
  "Brunei": { code: "+673", iso: "BN", flag: "🇧🇳" },
  "Bulgaria": { code: "+359", iso: "BG", flag: "🇧🇬" },
  "Burkina Faso": { code: "+226", iso: "BF", flag: "🇧🇫" },
  "Burundi": { code: "+257", iso: "BI", flag: "🇧🇮" },

  "Cambogia": { code: "+855", iso: "KH", flag: "🇰🇭" },
  "Camerun": { code: "+237", iso: "CM", flag: "🇨🇲" },
  "Canada": { code: "+1", iso: "CA", flag: "🇨🇦" },
  "Capo Verde": { code: "+238", iso: "CV", flag: "🇨🇻" },
  "Ciad": { code: "+235", iso: "TD", flag: "🇹🇩" },
  "Cile": { code: "+56", iso: "CL", flag: "🇨🇱" },
  "Cina": { code: "+86", iso: "CN", flag: "🇨🇳" },
  "Cipro": { code: "+357", iso: "CY", flag: "🇨🇾" },
  "Colombia": { code: "+57", iso: "CO", flag: "🇨🇴" },
  "Comore": { code: "+269", iso: "KM", flag: "🇰🇲" },
  "Congo": { code: "+242", iso: "CG", flag: "🇨🇬" },
  "Corea del Nord": { code: "+850", iso: "KP", flag: "🇰🇵" },
  "Corea del Sud": { code: "+82", iso: "KR", flag: "🇰🇷" },
  "Costa d’Avorio": { code: "+225", iso: "CI", flag: "🇨🇮" },
  "Costa Rica": { code: "+506", iso: "CR", flag: "🇨🇷" },
  "Croazia": { code: "+385", iso: "HR", flag: "🇭🇷" },
  "Cuba": { code: "+53", iso: "CU", flag: "🇨🇺" },

  "Danimarca": { code: "+45", iso: "DK", flag: "🇩🇰" },
  "Dominica": { code: "+1767", iso: "DM", flag: "🇩🇲" },

  "Ecuador": { code: "+593", iso: "EC", flag: "🇪🇨" },
  "Egitto": { code: "+20", iso: "EG", flag: "🇪🇬" },
  "El Salvador": { code: "+503", iso: "SV", flag: "🇸🇻" },
  "Emirati Arabi Uniti": { code: "+971", iso: "AE", flag: "🇦🇪" },
  "Eritrea": { code: "+291", iso: "ER", flag: "🇪🇷" },
  "Estonia": { code: "+372", iso: "EE", flag: "🇪🇪" },
  "Eswatini": { code: "+268", iso: "SZ", flag: "🇸🇿" },
  "Etiopia": { code: "+251", iso: "ET", flag: "🇪🇹" },

  "Figi": { code: "+679", iso: "FJ", flag: "🇫🇯" },
  "Filippine": { code: "+63", iso: "PH", flag: "🇵🇭" },
  "Finlandia": { code: "+358", iso: "FI", flag: "🇫🇮" },
  "Francia": { code: "+33", iso: "FR", flag: "🇫🇷" },

  "Gabon": { code: "+241", iso: "GA", flag: "🇬🇦" },
  "Gambia": { code: "+220", iso: "GM", flag: "🇬🇲" },
  "Georgia": { code: "+995", iso: "GE", flag: "🇬🇪" },
  "Germania": { code: "+49", iso: "DE", flag: "🇩🇪" },
  "Ghana": { code: "+233", iso: "GH", flag: "🇬🇭" },
  "Giamaica": { code: "+1876", iso: "JM", flag: "🇯🇲" },
  "Giappone": { code: "+81", iso: "JP", flag: "🇯🇵" },
  "Gibuti": { code: "+253", iso: "DJ", flag: "🇩🇯" },
  "Giordania": { code: "+962", iso: "JO", flag: "🇯🇴" },
  "Grecia": { code: "+30", iso: "GR", flag: "🇬🇷" },
  "Grenada": { code: "+1473", iso: "GD", flag: "🇬🇩" },
  "Guatemala": { code: "+502", iso: "GT", flag: "🇬🇹" },
  "Guinea": { code: "+224", iso: "GN", flag: "🇬🇳" },
  "Guinea Equatoriale": { code: "+240", iso: "GQ", flag: "🇬🇶" },
  "Guinea-Bissau": { code: "+245", iso: "GW", flag: "🇬🇼" },
  "Guyana": { code: "+592", iso: "GY", flag: "🇬🇾" },

  "Haiti": { code: "+509", iso: "HT", flag: "🇭🇹" },
  "Honduras": { code: "+504", iso: "HN", flag: "🇭🇳" },

  "India": { code: "+91", iso: "IN", flag: "🇮🇳" },
  "Indonesia": { code: "+62", iso: "ID", flag: "🇮🇩" },
  "Iran": { code: "+98", iso: "IR", flag: "🇮🇷" },
  "Iraq": { code: "+964", iso: "IQ", flag: "🇮🇶" },
  "Irlanda": { code: "+353", iso: "IE", flag: "🇮🇪" },
  "Islanda": { code: "+354", iso: "IS", flag: "🇮🇸" },
  "Isole Marshall": { code: "+692", iso: "MH", flag: "🇲🇭" },
  "Israele": { code: "+972", iso: "IL", flag: "🇮🇱" },
  "Italia": { code: "+39", iso: "IT", flag: "🇮🇹" },

  "Kazakistan": { code: "+7", iso: "KZ", flag: "🇰🇿" },
  "Kenya": { code: "+254", iso: "KE", flag: "🇰🇪" },
  "Kirghizistan": { code: "+996", iso: "KG", flag: "🇰🇬" },
  "Kiribati": { code: "+686", iso: "KI", flag: "🇰🇮" },
  "Kosovo": { code: "+383", iso: "XK", flag: "🇽🇰" },
  "Kuwait": { code: "+965", iso: "KW", flag: "🇰🇼" },

  "Laos": { code: "+856", iso: "LA", flag: "🇱🇦" },
  "Lesotho": { code: "+266", iso: "LS", flag: "🇱🇸" },
  "Lettonia": { code: "+371", iso: "LV", flag: "🇱🇻" },
  "Libano": { code: "+961", iso: "LB", flag: "🇱🇧" },
  "Liberia": { code: "+231", iso: "LR", flag: "🇱🇷" },
  "Libia": { code: "+218", iso: "LY", flag: "🇱🇾" },
  "Liechtenstein": { code: "+423", iso: "LI", flag: "🇱🇮" },
  "Lituania": { code: "+370", iso: "LT", flag: "🇱🇹" },
  "Lussemburgo": { code: "+352", iso: "LU", flag: "🇱🇺" },

  "Macedonia del Nord": { code: "+389", iso: "MK", flag: "🇲🇰" },
  "Madagascar": { code: "+261", iso: "MG", flag: "🇲🇬" },
  "Malawi": { code: "+265", iso: "MW", flag: "🇲🇼" },
  "Malaysia": { code: "+60", iso: "MY", flag: "🇲🇾" },
  "Maldive": { code: "+960", iso: "MV", flag: "🇲🇻" },
  "Mali": { code: "+223", iso: "ML", flag: "🇲🇱" },
  "Malta": { code: "+356", iso: "MT", flag: "🇲🇹" },
  "Marocco": { code: "+212", iso: "MA", flag: "🇲🇦" },
  "Mauritania": { code: "+222", iso: "MR", flag: "🇲🇷" },
  "Mauritius": { code: "+230", iso: "MU", flag: "🇲🇺" },
  "Messico": { code: "+52", iso: "MX", flag: "🇲🇽" },
  "Micronesia": { code: "+691", iso: "FM", flag: "🇫🇲" },
  "Moldavia": { code: "+373", iso: "MD", flag: "🇲🇩" },
  "Monaco": { code: "+377", iso: "MC", flag: "🇲🇨" },
  "Mongolia": { code: "+976", iso: "MN", flag: "🇲🇳" },
  "Montenegro": { code: "+382", iso: "ME", flag: "🇲🇪" },
  "Mozambico": { code: "+258", iso: "MZ", flag: "🇲🇿" },
  "Myanmar": { code: "+95", iso: "MM", flag: "🇲🇲" },

  "Namibia": { code: "+264", iso: "NA", flag: "🇳🇦" },
  "Nauru": { code: "+674", iso: "NR", flag: "🇳🇷" },
  "Nepal": { code: "+977", iso: "NP", flag: "🇳🇵" },
  "Nessuno": { code: "+39", iso: "IT", flag: "🇮🇹" },
  "Nicaragua": { code: "+505", iso: "NI", flag: "🇳🇮" },
  "Niger": { code: "+227", iso: "NE", flag: "🇳🇪" },
  "Nigeria": { code: "+234", iso: "NG", flag: "🇳🇬" },
  "Norvegia": { code: "+47", iso: "NO", flag: "🇳🇴" },
  "Nuova Zelanda": { code: "+64", iso: "NZ", flag: "🇳🇿" },

  "Oman": { code: "+968", iso: "OM", flag: "🇴🇲" },

  "Paesi Bassi": { code: "+31", iso: "NL", flag: "🇳🇱" },
  "Pakistan": { code: "+92", iso: "PK", flag: "🇵🇰" },
  "Palau": { code: "+680", iso: "PW", flag: "🇵🇼" },
  "Palestina": { code: "+970", iso: "PS", flag: "🇵🇸" },
  "Panama": { code: "+507", iso: "PA", flag: "🇵🇦" },
  "Papua Nuova Guinea": { code: "+675", iso: "PG", flag: "🇵🇬" },
  "Paraguay": { code: "+595", iso: "PY", flag: "🇵🇾" },
  "Perù": { code: "+51", iso: "PE", flag: "🇵🇪" },
  "Polonia": { code: "+48", iso: "PL", flag: "🇵🇱" },
  "Portogallo": { code: "+351", iso: "PT", flag: "🇵🇹" },

  "Qatar": { code: "+974", iso: "QA", flag: "🇶🇦" },

  "Regno Unito": { code: "+44", iso: "GB", flag: "🇬🇧" },
  "Repubblica Ceca": { code: "+420", iso: "CZ", flag: "🇨🇿" },
  "Repubblica Centrafricana": { code: "+236", iso: "CF", flag: "🇨🇫" },
  "Repubblica Dominicana": { code: "+1809", iso: "DO", flag: "🇩🇴" },
  "Romania": { code: "+40", iso: "RO", flag: "🇷🇴" },
  "Ruanda": { code: "+250", iso: "RW", flag: "🇷🇼" },
  "Russia": { code: "+7", iso: "RU", flag: "🇷🇺" },

  "Saint Kitts e Nevis": { code: "+1869", iso: "KN", flag: "🇰🇳" },
  "Saint Lucia": { code: "+1758", iso: "LC", flag: "🇱🇨" },
  "Saint Vincent e Grenadine": { code: "+1784", iso: "VC", flag: "🇻🇨" },
  "Samoa": { code: "+685", iso: "WS", flag: "🇼🇸" },
  "San Marino": { code: "+378", iso: "SM", flag: "🇸🇲" },
  "São Tomé e Príncipe": { code: "+239", iso: "ST", flag: "🇸🇹" },
  "Senegal": { code: "+221", iso: "SN", flag: "🇸🇳" },
  "Serbia": { code: "+381", iso: "RS", flag: "🇷🇸" },
  "Seychelles": { code: "+248", iso: "SC", flag: "🇸🇨" },
  "Sierra Leone": { code: "+232", iso: "SL", flag: "🇸🇱" },
  "Singapore": { code: "+65", iso: "SG", flag: "🇸🇬" },
  "Siria": { code: "+963", iso: "SY", flag: "🇸🇾" },
  "Slovacchia": { code: "+421", iso: "SK", flag: "🇸🇰" },
  "Slovenia": { code: "+386", iso: "SI", flag: "🇸🇮" },
  "Somalia": { code: "+252", iso: "SO", flag: "🇸🇴" },
  "Spagna": { code: "+34", iso: "ES", flag: "🇪🇸" },
  "Sri Lanka": { code: "+94", iso: "LK", flag: "🇱🇰" },
  "Stati Uniti": { code: "+1", iso: "US", flag: "🇺🇸" },
  "Sudafrica": { code: "+27", iso: "ZA", flag: "🇿🇦" },
  "Sudan": { code: "+249", iso: "SD", flag: "🇸🇩" },
  "Sudan del Sud": { code: "+211", iso: "SS", flag: "🇸🇸" },
  "Suriname": { code: "+597", iso: "SR", flag: "🇸🇷" },
  "Svezia": { code: "+46", iso: "SE", flag: "🇸🇪" },
  "Svizzera": { code: "+41", iso: "CH", flag: "🇨🇭" },

  "Tagikistan": { code: "+992", iso: "TJ", flag: "🇹🇯" },
  "Tanzania": { code: "+255", iso: "TZ", flag: "🇹🇿" },
  "Thailandia": { code: "+66", iso: "TH", flag: "🇹🇭" },
  "Timor Est": { code: "+670", iso: "TL", flag: "🇹🇱" },
  "Togo": { code: "+228", iso: "TG", flag: "🇹🇬" },
  "Tonga": { code: "+676", iso: "TO", flag: "🇹🇴" },
  "Trinidad e Tobago": { code: "+1868", iso: "TT", flag: "🇹🇹" },
  "Tunisia": { code: "+216", iso: "TN", flag: "🇹🇳" },
  "Turchia": { code: "+90", iso: "TR", flag: "🇹🇷" },
  "Turkmenistan": { code: "+993", iso: "TM", flag: "🇹🇲" },
  "Tuvalu": { code: "+688", iso: "TV", flag: "🇹🇻" },

  "Ucraina": { code: "+380", iso: "UA", flag: "🇺🇦" },
  "Uganda": { code: "+256", iso: "UG", flag: "🇺🇬" },
  "Ungheria": { code: "+36", iso: "HU", flag: "🇭🇺" },
  "Uruguay": { code: "+598", iso: "UY", flag: "🇺🇾" },
  "Uzbekistan": { code: "+998", iso: "UZ", flag: "🇺🇿" },

  "Vanuatu": { code: "+678", iso: "VU", flag: "🇻🇺" },
  "Vaticano": { code: "+39", iso: "VA", flag: "🇻🇦" },
  "Venezuela": { code: "+58", iso: "VE", flag: "🇻🇪" },
  "Vietnam": { code: "+84", iso: "VN", flag: "🇻🇳" },

  "Yemen": { code: "+967", iso: "YE", flag: "🇾🇪" },

  "Zambia": { code: "+260", iso: "ZM", flag: "🇿🇲" },
  "Zimbabwe": { code: "+263", iso: "ZW", flag: "🇿🇼" }
});

/**
 * Nazioni con la massima frequenza di accesso allo sportello,
 * posizionate in cima alla lista per comodità dell'operatore.
 * @readonly
 * @type {readonly string[]}
 */
const TopPriorityCountries = Object.freeze([
  "Italia",
  "Marocco",
  "Albania",
  "Romania",
  "Ucraina",
  "Nigeria",
  "Senegal",
  "Perù",
  "Egitto",
  "Tunisia",
  "Bangladesh",
  "Pakistan",
  "Cina",
  "Filippine",
  "India"
]);

/**
 * Mappa chiave-valore immediata { [Nazione]: Prefisso } (es. { "Italia": "+39" }).
 * @readonly
 * @type {Record<string, string>}
 */
const CountryCallingCodes = Object.freeze(
  Object.fromEntries(Object.entries(CountryPhoneData).map(([k, v]) => [k, v.code]))
);

/**
 * Separa una stringa contenente un numero di telefono (con o senza prefisso)
 * restituendo il prefisso identificato e la parte numerica locale.
 * @param {string} fullNumber - Numero di telefono memorizzato
 * @return {{ prefix: string; number: string }}
 */
function splitPhoneNumber(fullNumber) {
  if (!fullNumber || typeof fullNumber !== "string") {
    return { prefix: "+39", number: "" };
  }

  let cleaned = fullNumber.trim();
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.substring(2);
  }

  if (cleaned.startsWith("+")) {
    // Ordina i prefissi noti dal più lungo al più corto per evitare falsi match (es. +1809 prima di +1)
    const prefixes = Object.values(CountryCallingCodes);
    const uniquePrefixes = Array.from(new Set(prefixes)).sort((a, b) => b.length - a.length);

    for (const pref of uniquePrefixes) {
      if (cleaned.startsWith(pref)) {
        const local = cleaned.substring(pref.length).trim();
        return { prefix: pref, number: local };
      }
    }

    // Se inizia con + ma è un prefisso non mappato, estrai fino al primo spazio o fino a 4 cifre
    const match = cleaned.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      return { prefix: match[1], number: match[2].trim() };
    }
  }

  // Se non ha prefisso internazionale esplicito, assume Italia (+39)
  return { prefix: "+39", number: cleaned };
}

/**
 * Ricompone e standardizza prefisso e numero locale nel formato E.164.
 * @param {string} prefix - Prefisso internazionale (es. "+39")
 * @param {string} localNumber - Numero locale (es. "333 1234567")
 * @return {string} Numero unificato (es. "+39 333 1234567")
 */
function formatE164(prefix, localNumber) {
  const num = (localNumber || "").trim();
  if (!num) return "";

  let pref = (prefix || "+39").trim();
  if (!pref.startsWith("+")) pref = "+" + pref;

  return `${pref} ${num}`;
}
