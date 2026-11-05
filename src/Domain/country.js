/**
 * @file country.js
 * @description Modulo di dominio unificato per la gestione di tutte le informazioni geografiche,
 * anagrafiche e di telecomunicazione legate ai Paesi del mondo (ITU-T E.164, ISO-3166-1).
 * Costituisce la Single Source of Truth (SSOT) per cittadinanze, stati, prefissi telefonici e bandiere.
 * @module Domain/Country
 */

/**
 * @typedef {Object} CountryRecord
 * @property {string} name - Nome italiano ufficiale dello Stato (es. "Italia", "Marocco")
 * @property {string} citizenship - Aggettivo di cittadinanza ufficiale (es. "Italiana", "Marocchina")
 * @property {string} iso - Codice ISO-3166-1 alpha-2 (es. "IT", "MA")
 * @property {string} phone - Prefisso telefonico internazionale ITU-T con "+" (es. "+39", "+212")
 * @property {string} flag - Emoji della bandiera nazionale (es. "🇮🇹", "🇲🇦")
 * @property {boolean} [isTopPriority=false] - Se true, il paese è tra le nazionalità a maggior affluenza allo sportello
 */

/**
 * Catalogo unico, immutabile e completo di tutte le nazioni censite con i relativi attributi.
 * @readonly
 * @type {readonly CountryRecord[]}
 */
const Countries = Object.freeze([
  {"name":"Afghanistan","citizenship":"Afghana","iso":"AF","phone":"+93","flag":"🇦🇫","isTopPriority":false},
  {"name":"Albania","citizenship":"Albanese","iso":"AL","phone":"+355","flag":"🇦🇱","isTopPriority":true},
  {"name":"Algeria","citizenship":"Algerina","iso":"DZ","phone":"+213","flag":"🇩🇿","isTopPriority":false},
  {"name":"Andorra","citizenship":"Andorrana","iso":"AD","phone":"+376","flag":"🇦🇩","isTopPriority":false},
  {"name":"Angola","citizenship":"Angolana","iso":"AO","phone":"+244","flag":"🇦🇴","isTopPriority":false},
  {"name":"Antigua e Barbuda","citizenship":"Antiguana","iso":"AG","phone":"+1268","flag":"🇦🇬","isTopPriority":false},
  {"name":"Arabia Saudita","citizenship":"Saudita","iso":"SA","phone":"+966","flag":"🇸🇦","isTopPriority":false},
  {"name":"Argentina","citizenship":"Argentina","iso":"AR","phone":"+54","flag":"🇦🇷","isTopPriority":false},
  {"name":"Armenia","citizenship":"Armena","iso":"AM","phone":"+374","flag":"🇦🇲","isTopPriority":false},
  {"name":"Australia","citizenship":"Australiana","iso":"AU","phone":"+61","flag":"🇦🇺","isTopPriority":false},
  {"name":"Austria","citizenship":"Austriaca","iso":"AT","phone":"+43","flag":"🇦🇹","isTopPriority":false},
  {"name":"Azerbaigian","citizenship":"Azera","iso":"AZ","phone":"+994","flag":"🇦🇿","isTopPriority":false},
  {"name":"Bahamas","citizenship":"Bahamense","iso":"BS","phone":"+1242","flag":"🇧🇸","isTopPriority":false},
  {"name":"Bahrein","citizenship":"Bahreinita","iso":"BH","phone":"+973","flag":"🇧🇭","isTopPriority":false},
  {"name":"Bangladesh","citizenship":"Bangladese","iso":"BD","phone":"+880","flag":"🇧🇩","isTopPriority":true},
  {"name":"Barbados","citizenship":"Barbadiana","iso":"BB","phone":"+1246","flag":"🇧🇧","isTopPriority":false},
  {"name":"Belgio","citizenship":"Belga","iso":"BE","phone":"+32","flag":"🇧🇪","isTopPriority":false},
  {"name":"Belize","citizenship":"Beliziana","iso":"BZ","phone":"+501","flag":"🇧🇿","isTopPriority":false},
  {"name":"Benin","citizenship":"Beninese","iso":"BJ","phone":"+229","flag":"🇧🇯","isTopPriority":false},
  {"name":"Bhutan","citizenship":"Bhutanese","iso":"BT","phone":"+975","flag":"🇧🇹","isTopPriority":false},
  {"name":"Bielorussia","citizenship":"Bielorussa","iso":"BY","phone":"+375","flag":"🇧🇾","isTopPriority":false},
  {"name":"Bolivia","citizenship":"Boliviana","iso":"BO","phone":"+591","flag":"🇧🇴","isTopPriority":false},
  {"name":"Bosnia ed Erzegovina","citizenship":"Bosniaca","iso":"BA","phone":"+387","flag":"🇧🇦","isTopPriority":false},
  {"name":"Botswana","citizenship":"Botswanese","iso":"BW","phone":"+267","flag":"🇧🇼","isTopPriority":false},
  {"name":"Brasile","citizenship":"Brasiliana","iso":"BR","phone":"+55","flag":"🇧🇷","isTopPriority":false},
  {"name":"Brunei","citizenship":"Bruneiana","iso":"BN","phone":"+673","flag":"🇧🇳","isTopPriority":false},
  {"name":"Bulgaria","citizenship":"Bulgara","iso":"BG","phone":"+359","flag":"🇧🇬","isTopPriority":false},
  {"name":"Burkina Faso","citizenship":"Burkinabé","iso":"BF","phone":"+226","flag":"🇧🇫","isTopPriority":false},
  {"name":"Burundi","citizenship":"Burundese","iso":"BI","phone":"+257","flag":"🇧🇮","isTopPriority":false},
  {"name":"Cambogia","citizenship":"Cambogiana","iso":"KH","phone":"+855","flag":"🇰🇭","isTopPriority":false},
  {"name":"Camerun","citizenship":"Camerunense","iso":"CM","phone":"+237","flag":"🇨🇲","isTopPriority":false},
  {"name":"Canada","citizenship":"Canadese","iso":"CA","phone":"+1","flag":"🇨🇦","isTopPriority":false},
  {"name":"Capo Verde","citizenship":"Capoverdiana","iso":"CV","phone":"+238","flag":"🇨🇻","isTopPriority":false},
  {"name":"Ciad","citizenship":"Ciadiana","iso":"TD","phone":"+235","flag":"🇹🇩","isTopPriority":false},
  {"name":"Cile","citizenship":"Cilena","iso":"CL","phone":"+56","flag":"🇨🇱","isTopPriority":false},
  {"name":"Cina","citizenship":"Cinese","iso":"CN","phone":"+86","flag":"🇨🇳","isTopPriority":true},
  {"name":"Cipro","citizenship":"Cipriota","iso":"CY","phone":"+357","flag":"🇨🇾","isTopPriority":false},
  {"name":"Colombia","citizenship":"Colombiana","iso":"CO","phone":"+57","flag":"🇨🇴","isTopPriority":false},
  {"name":"Comore","citizenship":"Comoriana","iso":"KM","phone":"+269","flag":"🇰🇲","isTopPriority":false},
  {"name":"Congo","citizenship":"Congolese","iso":"CG","phone":"+242","flag":"🇨🇬","isTopPriority":false},
  {"name":"Corea del Nord","citizenship":"Nordcoreana","iso":"KP","phone":"+850","flag":"🇰🇵","isTopPriority":false},
  {"name":"Corea del Sud","citizenship":"Sudcoreana","iso":"KR","phone":"+82","flag":"🇰🇷","isTopPriority":false},
  {"name":"Costa d’Avorio","citizenship":"Ivoriana","iso":"CI","phone":"+225","flag":"🇨🇮","isTopPriority":false},
  {"name":"Costa Rica","citizenship":"Costaricana","iso":"CR","phone":"+506","flag":"🇨🇷","isTopPriority":false},
  {"name":"Croazia","citizenship":"Croata","iso":"HR","phone":"+385","flag":"🇭🇷","isTopPriority":false},
  {"name":"Cuba","citizenship":"Cubana","iso":"CU","phone":"+53","flag":"🇨🇺","isTopPriority":false},
  {"name":"Danimarca","citizenship":"Danese","iso":"DK","phone":"+45","flag":"🇩🇰","isTopPriority":false},
  {"name":"Dominica","citizenship":"Dominicana","iso":"DM","phone":"+1767","flag":"🇩🇲","isTopPriority":false},
  {"name":"Ecuador","citizenship":"Ecuadoriana","iso":"EC","phone":"+593","flag":"🇪🇨","isTopPriority":false},
  {"name":"Egitto","citizenship":"Egiziana","iso":"EG","phone":"+20","flag":"🇪🇬","isTopPriority":true},
  {"name":"El Salvador","citizenship":"Salvadoregna","iso":"SV","phone":"+503","flag":"🇸🇻","isTopPriority":false},
  {"name":"Emirati Arabi Uniti","citizenship":"Emiratina","iso":"AE","phone":"+971","flag":"🇦🇪","isTopPriority":false},
  {"name":"Eritrea","citizenship":"Eritrea","iso":"ER","phone":"+291","flag":"🇪🇷","isTopPriority":false},
  {"name":"Estonia","citizenship":"Estone","iso":"EE","phone":"+372","flag":"🇪🇪","isTopPriority":false},
  {"name":"Eswatini","citizenship":"Swatina","iso":"SZ","phone":"+268","flag":"🇸🇿","isTopPriority":false},
  {"name":"Etiopia","citizenship":"Etiope","iso":"ET","phone":"+251","flag":"🇪🇹","isTopPriority":false},
  {"name":"Figi","citizenship":"Figiana","iso":"FJ","phone":"+679","flag":"🇫🇯","isTopPriority":false},
  {"name":"Filippine","citizenship":"Filippina","iso":"PH","phone":"+63","flag":"🇵🇭","isTopPriority":true},
  {"name":"Finlandia","citizenship":"Finlandese","iso":"FI","phone":"+358","flag":"🇫🇮","isTopPriority":false},
  {"name":"Francia","citizenship":"Francese","iso":"FR","phone":"+33","flag":"🇫🇷","isTopPriority":false},
  {"name":"Gabon","citizenship":"Gabonese","iso":"GA","phone":"+241","flag":"🇬🇦","isTopPriority":false},
  {"name":"Gambia","citizenship":"Gambiana","iso":"GM","phone":"+220","flag":"🇬🇲","isTopPriority":false},
  {"name":"Georgia","citizenship":"Georgiana","iso":"GE","phone":"+995","flag":"🇬🇪","isTopPriority":false},
  {"name":"Germania","citizenship":"Tedesca","iso":"DE","phone":"+49","flag":"🇩🇪","isTopPriority":false},
  {"name":"Ghana","citizenship":"Ghanese","iso":"GH","phone":"+233","flag":"🇬🇭","isTopPriority":false},
  {"name":"Giamaica","citizenship":"Giamaicana","iso":"JM","phone":"+1876","flag":"🇯🇲","isTopPriority":false},
  {"name":"Giappone","citizenship":"Giapponese","iso":"JP","phone":"+81","flag":"🇯🇵","isTopPriority":false},
  {"name":"Gibuti","citizenship":"Gibutiana","iso":"DJ","phone":"+253","flag":"🇩🇯","isTopPriority":false},
  {"name":"Giordania","citizenship":"Giordana","iso":"JO","phone":"+962","flag":"🇯🇴","isTopPriority":false},
  {"name":"Grecia","citizenship":"Greca","iso":"GR","phone":"+30","flag":"🇬🇷","isTopPriority":false},
  {"name":"Grenada","citizenship":"Grenadina","iso":"GD","phone":"+1473","flag":"🇬🇩","isTopPriority":false},
  {"name":"Guatemala","citizenship":"Guatemalteca","iso":"GT","phone":"+502","flag":"🇬🇹","isTopPriority":false},
  {"name":"Guinea","citizenship":"Guineana","iso":"GN","phone":"+224","flag":"🇬🇳","isTopPriority":false},
  {"name":"Guinea Equatoriale","citizenship":"Equatoguineana","iso":"GQ","phone":"+240","flag":"🇬🇶","isTopPriority":false},
  {"name":"Guinea-Bissau","citizenship":"Guineense","iso":"GW","phone":"+245","flag":"🇬🇼","isTopPriority":false},
  {"name":"Guyana","citizenship":"Guyanese","iso":"GY","phone":"+592","flag":"🇬🇾","isTopPriority":false},
  {"name":"Haiti","citizenship":"Haitiana","iso":"HT","phone":"+509","flag":"🇭🇹","isTopPriority":false},
  {"name":"Honduras","citizenship":"Honduregna","iso":"HN","phone":"+504","flag":"🇭🇳","isTopPriority":false},
  {"name":"India","citizenship":"Indiana","iso":"IN","phone":"+91","flag":"🇮🇳","isTopPriority":true},
  {"name":"Indonesia","citizenship":"Indonesiana","iso":"ID","phone":"+62","flag":"🇮🇩","isTopPriority":false},
  {"name":"Iran","citizenship":"Iraniana","iso":"IR","phone":"+98","flag":"🇮🇷","isTopPriority":false},
  {"name":"Iraq","citizenship":"Irachena","iso":"IQ","phone":"+964","flag":"🇮🇶","isTopPriority":false},
  {"name":"Irlanda","citizenship":"Irlandese","iso":"IE","phone":"+353","flag":"🇮🇪","isTopPriority":false},
  {"name":"Islanda","citizenship":"Islandese","iso":"IS","phone":"+354","flag":"🇮🇸","isTopPriority":false},
  {"name":"Isole Marshall","citizenship":"Marshallese","iso":"MH","phone":"+692","flag":"🇲🇭","isTopPriority":false},
  {"name":"Israele","citizenship":"Israeliana","iso":"IL","phone":"+972","flag":"🇮🇱","isTopPriority":false},
  {"name":"Italia","citizenship":"Italiana","iso":"IT","phone":"+39","flag":"🇮🇹","isTopPriority":true},
  {"name":"Kazakistan","citizenship":"Kazaka","iso":"KZ","phone":"+7","flag":"🇰🇿","isTopPriority":false},
  {"name":"Kenya","citizenship":"Kenyana","iso":"KE","phone":"+254","flag":"🇰🇪","isTopPriority":false},
  {"name":"Kirghizistan","citizenship":"Kirghisa","iso":"KG","phone":"+996","flag":"🇰🇬","isTopPriority":false},
  {"name":"Kiribati","citizenship":"Kiribatiana","iso":"KI","phone":"+686","flag":"🇰🇮","isTopPriority":false},
  {"name":"Kosovo","citizenship":"Kosovara","iso":"XK","phone":"+383","flag":"🇽🇰","isTopPriority":false},
  {"name":"Kuwait","citizenship":"Kuwaitiana","iso":"KW","phone":"+965","flag":"🇰🇼","isTopPriority":false},
  {"name":"Laos","citizenship":"Laotiana","iso":"LA","phone":"+856","flag":"🇱🇦","isTopPriority":false},
  {"name":"Lesotho","citizenship":"Lesothiana","iso":"LS","phone":"+266","flag":"🇱🇸","isTopPriority":false},
  {"name":"Lettonia","citizenship":"Lettone","iso":"LV","phone":"+371","flag":"🇱🇻","isTopPriority":false},
  {"name":"Libano","citizenship":"Libanese","iso":"LB","phone":"+961","flag":"🇱🇧","isTopPriority":false},
  {"name":"Liberia","citizenship":"Liberiana","iso":"LR","phone":"+231","flag":"🇱🇷","isTopPriority":false},
  {"name":"Libia","citizenship":"Libica","iso":"LY","phone":"+218","flag":"🇱🇾","isTopPriority":false},
  {"name":"Liechtenstein","citizenship":"Liechtensteiniana","iso":"LI","phone":"+423","flag":"🇱🇮","isTopPriority":false},
  {"name":"Lituania","citizenship":"Lituana","iso":"LT","phone":"+370","flag":"🇱🇹","isTopPriority":false},
  {"name":"Lussemburgo","citizenship":"Lussemburghese","iso":"LU","phone":"+352","flag":"🇱🇺","isTopPriority":false},
  {"name":"Macedonia del Nord","citizenship":"Macedone","iso":"MK","phone":"+389","flag":"🇲🇰","isTopPriority":false},
  {"name":"Madagascar","citizenship":"Malgascia","iso":"MG","phone":"+261","flag":"🇲🇬","isTopPriority":false},
  {"name":"Malawi","citizenship":"Malawiana","iso":"MW","phone":"+265","flag":"🇲🇼","isTopPriority":false},
  {"name":"Malaysia","citizenship":"Malese","iso":"MY","phone":"+60","flag":"🇲🇾","isTopPriority":false},
  {"name":"Maldive","citizenship":"Maldiviana","iso":"MV","phone":"+960","flag":"🇲🇻","isTopPriority":false},
  {"name":"Mali","citizenship":"Maliana","iso":"ML","phone":"+223","flag":"🇲🇱","isTopPriority":false},
  {"name":"Malta","citizenship":"Maltese","iso":"MT","phone":"+356","flag":"🇲🇹","isTopPriority":false},
  {"name":"Marocco","citizenship":"Marocchina","iso":"MA","phone":"+212","flag":"🇲🇦","isTopPriority":true},
  {"name":"Mauritania","citizenship":"Mauritana","iso":"MR","phone":"+222","flag":"🇲🇷","isTopPriority":false},
  {"name":"Mauritius","citizenship":"Mauriziana","iso":"MU","phone":"+230","flag":"🇲🇺","isTopPriority":false},
  {"name":"Messico","citizenship":"Messicana","iso":"MX","phone":"+52","flag":"🇲🇽","isTopPriority":false},
  {"name":"Micronesia","citizenship":"Micronesiana","iso":"FM","phone":"+691","flag":"🇫🇲","isTopPriority":false},
  {"name":"Moldavia","citizenship":"Moldava","iso":"MD","phone":"+373","flag":"🇲🇩","isTopPriority":false},
  {"name":"Monaco","citizenship":"Monegasca","iso":"MC","phone":"+377","flag":"🇲🇨","isTopPriority":false},
  {"name":"Mongolia","citizenship":"Mongola","iso":"MN","phone":"+976","flag":"🇲🇳","isTopPriority":false},
  {"name":"Montenegro","citizenship":"Montenegrina","iso":"ME","phone":"+382","flag":"🇲🇪","isTopPriority":false},
  {"name":"Mozambico","citizenship":"Mozambicana","iso":"MZ","phone":"+258","flag":"🇲🇿","isTopPriority":false},
  {"name":"Myanmar","citizenship":"Birmana","iso":"MM","phone":"+95","flag":"🇲🇲","isTopPriority":false},
  {"name":"Namibia","citizenship":"Namibiana","iso":"NA","phone":"+264","flag":"🇳🇦","isTopPriority":false},
  {"name":"Nauru","citizenship":"Nauruana","iso":"NR","phone":"+674","flag":"🇳🇷","isTopPriority":false},
  {"name":"Nepal","citizenship":"Nepalese","iso":"NP","phone":"+977","flag":"🇳🇵","isTopPriority":false},
  {"name":"Nessuno","citizenship":"Apolide","iso":"IT","phone":"+39","flag":"🇮🇹","isTopPriority":false},
  {"name":"Nicaragua","citizenship":"Nicaraguense","iso":"NI","phone":"+505","flag":"🇳🇮","isTopPriority":false},
  {"name":"Niger","citizenship":"Nigerina","iso":"NE","phone":"+227","flag":"🇳🇪","isTopPriority":false},
  {"name":"Nigeria","citizenship":"Nigeriana","iso":"NG","phone":"+234","flag":"🇳🇬","isTopPriority":true},
  {"name":"Norvegia","citizenship":"Norvegese","iso":"NO","phone":"+47","flag":"🇳🇴","isTopPriority":false},
  {"name":"Nuova Zelanda","citizenship":"Neozelandese","iso":"NZ","phone":"+64","flag":"🇳🇿","isTopPriority":false},
  {"name":"Oman","citizenship":"Omanita","iso":"OM","phone":"+968","flag":"🇴🇲","isTopPriority":false},
  {"name":"Paesi Bassi","citizenship":"Olandese","iso":"NL","phone":"+31","flag":"🇳🇱","isTopPriority":false},
  {"name":"Pakistan","citizenship":"Pakistana","iso":"PK","phone":"+92","flag":"🇵🇰","isTopPriority":true},
  {"name":"Palau","citizenship":"Palauana","iso":"PW","phone":"+680","flag":"🇵🇼","isTopPriority":false},
  {"name":"Palestina","citizenship":"Palestinese","iso":"PS","phone":"+970","flag":"🇵🇸","isTopPriority":false},
  {"name":"Panama","citizenship":"Panamense","iso":"PA","phone":"+507","flag":"🇵🇦","isTopPriority":false},
  {"name":"Papua Nuova Guinea","citizenship":"Papua","iso":"PG","phone":"+675","flag":"🇵🇬","isTopPriority":false},
  {"name":"Paraguay","citizenship":"Paraguayana","iso":"PY","phone":"+595","flag":"🇵🇾","isTopPriority":false},
  {"name":"Perù","citizenship":"Peruviana","iso":"PE","phone":"+51","flag":"🇵🇪","isTopPriority":true},
  {"name":"Polonia","citizenship":"Polacca","iso":"PL","phone":"+48","flag":"🇵🇱","isTopPriority":false},
  {"name":"Portogallo","citizenship":"Portoghese","iso":"PT","phone":"+351","flag":"🇵🇹","isTopPriority":false},
  {"name":"Qatar","citizenship":"Qatarina","iso":"QA","phone":"+974","flag":"🇶🇦","isTopPriority":false},
  {"name":"Regno Unito","citizenship":"Britannica","iso":"GB","phone":"+44","flag":"🇬🇧","isTopPriority":false},
  {"name":"Repubblica Ceca","citizenship":"Ceca","iso":"CZ","phone":"+420","flag":"🇨🇿","isTopPriority":false},
  {"name":"Repubblica Centrafricana","citizenship":"Centrafricana","iso":"CF","phone":"+236","flag":"🇨🇫","isTopPriority":false},
  {"name":"Repubblica Dominicana","citizenship":"Dominicana_RD","iso":"DO","phone":"+1809","flag":"🇩🇴","isTopPriority":false},
  {"name":"Romania","citizenship":"Romena","iso":"RO","phone":"+40","flag":"🇷🇴","isTopPriority":true},
  {"name":"Ruanda","citizenship":"Ruandese","iso":"RW","phone":"+250","flag":"🇷🇼","isTopPriority":false},
  {"name":"Russia","citizenship":"Russa","iso":"RU","phone":"+7","flag":"🇷🇺","isTopPriority":false},
  {"name":"Saint Kitts e Nevis","citizenship":"Nevisiana","iso":"KN","phone":"+1869","flag":"🇰🇳","isTopPriority":false},
  {"name":"Saint Lucia","citizenship":"Luciana","iso":"LC","phone":"+1758","flag":"🇱🇨","isTopPriority":false},
  {"name":"Saint Vincent e Grenadine","citizenship":"Vincentina","iso":"VC","phone":"+1784","flag":"🇻🇨","isTopPriority":false},
  {"name":"Samoa","citizenship":"Samoana","iso":"WS","phone":"+685","flag":"🇼🇸","isTopPriority":false},
  {"name":"San Marino","citizenship":"Sammarinese","iso":"SM","phone":"+378","flag":"🇸🇲","isTopPriority":false},
  {"name":"São Tomé e Príncipe","citizenship":"Santomese","iso":"ST","phone":"+239","flag":"🇸🇹","isTopPriority":false},
  {"name":"Senegal","citizenship":"Senegalese","iso":"SN","phone":"+221","flag":"🇸🇳","isTopPriority":true},
  {"name":"Serbia","citizenship":"Serba","iso":"RS","phone":"+381","flag":"🇷🇸","isTopPriority":false},
  {"name":"Seychelles","citizenship":"Seychellese","iso":"SC","phone":"+248","flag":"🇸🇨","isTopPriority":false},
  {"name":"Sierra Leone","citizenship":"Sierraleonese","iso":"SL","phone":"+232","flag":"🇸🇱","isTopPriority":false},
  {"name":"Singapore","citizenship":"Singaporiana","iso":"SG","phone":"+65","flag":"🇸🇬","isTopPriority":false},
  {"name":"Siria","citizenship":"Siriana","iso":"SY","phone":"+963","flag":"🇸🇾","isTopPriority":false},
  {"name":"Slovacchia","citizenship":"Slovacca","iso":"SK","phone":"+421","flag":"🇸🇰","isTopPriority":false},
  {"name":"Slovenia","citizenship":"Slovena","iso":"SI","phone":"+386","flag":"🇸🇮","isTopPriority":false},
  {"name":"Somalia","citizenship":"Somala","iso":"SO","phone":"+252","flag":"🇸🇴","isTopPriority":false},
  {"name":"Spagna","citizenship":"Spagnola","iso":"ES","phone":"+34","flag":"🇪🇸","isTopPriority":false},
  {"name":"Sri Lanka","citizenship":"Singalese","iso":"LK","phone":"+94","flag":"🇱🇰","isTopPriority":false},
  {"name":"Stati Uniti","citizenship":"Statunitense","iso":"US","phone":"+1","flag":"🇺🇸","isTopPriority":false},
  {"name":"Sudafrica","citizenship":"Sudafricana","iso":"ZA","phone":"+27","flag":"🇿🇦","isTopPriority":false},
  {"name":"Sudan","citizenship":"Sudanese","iso":"SD","phone":"+249","flag":"🇸🇩","isTopPriority":false},
  {"name":"Sudan del Sud","citizenship":"Sudsudanese","iso":"SS","phone":"+211","flag":"🇸🇸","isTopPriority":false},
  {"name":"Suriname","citizenship":"Surinamese","iso":"SR","phone":"+597","flag":"🇸🇷","isTopPriority":false},
  {"name":"Svezia","citizenship":"Svedese","iso":"SE","phone":"+46","flag":"🇸🇪","isTopPriority":false},
  {"name":"Svizzera","citizenship":"Svizzera","iso":"CH","phone":"+41","flag":"🇨🇭","isTopPriority":false},
  {"name":"Tagikistan","citizenship":"Tagika","iso":"TJ","phone":"+992","flag":"🇹🇯","isTopPriority":false},
  {"name":"Tanzania","citizenship":"Tanzaniana","iso":"TZ","phone":"+255","flag":"🇹🇿","isTopPriority":false},
  {"name":"Thailandia","citizenship":"Thailandese","iso":"TH","phone":"+66","flag":"🇹🇭","isTopPriority":false},
  {"name":"Timor Est","citizenship":"Timorese","iso":"TL","phone":"+670","flag":"🇹🇱","isTopPriority":false},
  {"name":"Togo","citizenship":"Togolese","iso":"TG","phone":"+228","flag":"🇹🇬","isTopPriority":false},
  {"name":"Tonga","citizenship":"Tongana","iso":"TO","phone":"+676","flag":"🇹🇴","isTopPriority":false},
  {"name":"Trinidad e Tobago","citizenship":"Trinidadiana","iso":"TT","phone":"+1868","flag":"🇹🇹","isTopPriority":false},
  {"name":"Tunisia","citizenship":"Tunisina","iso":"TN","phone":"+216","flag":"🇹🇳","isTopPriority":true},
  {"name":"Turchia","citizenship":"Turca","iso":"TR","phone":"+90","flag":"🇹🇷","isTopPriority":false},
  {"name":"Turkmenistan","citizenship":"Turkmena","iso":"TM","phone":"+993","flag":"🇹🇲","isTopPriority":false},
  {"name":"Tuvalu","citizenship":"Tuvaluana","iso":"TV","phone":"+688","flag":"🇹🇻","isTopPriority":false},
  {"name":"Ucraina","citizenship":"Ucraina","iso":"UA","phone":"+380","flag":"🇺🇦","isTopPriority":true},
  {"name":"Uganda","citizenship":"Ugandese","iso":"UG","phone":"+256","flag":"🇺🇬","isTopPriority":false},
  {"name":"Ungheria","citizenship":"Ungherese","iso":"HU","phone":"+36","flag":"🇭🇺","isTopPriority":false},
  {"name":"Uruguay","citizenship":"Uruguaiana","iso":"UY","phone":"+598","flag":"🇺🇾","isTopPriority":false},
  {"name":"Uzbekistan","citizenship":"Uzbeka","iso":"UZ","phone":"+998","flag":"🇺🇿","isTopPriority":false},
  {"name":"Vanuatu","citizenship":"Vanuatiana","iso":"VU","phone":"+678","flag":"🇻🇺","isTopPriority":false},
  {"name":"Vaticano","citizenship":"Vaticana","iso":"VA","phone":"+39","flag":"🇻🇦","isTopPriority":false},
  {"name":"Venezuela","citizenship":"Venezuelana","iso":"VE","phone":"+58","flag":"🇻🇪","isTopPriority":false},
  {"name":"Vietnam","citizenship":"Vietnamita","iso":"VN","phone":"+84","flag":"🇻🇳","isTopPriority":false},
  {"name":"Yemen","citizenship":"Yemenita","iso":"YE","phone":"+967","flag":"🇾🇪","isTopPriority":false},
  {"name":"Zambia","citizenship":"Zambiana","iso":"ZM","phone":"+260","flag":"🇿🇲","isTopPriority":false},
  {"name":"Zimbabwe","citizenship":"Zimbabwese","iso":"ZW","phone":"+263","flag":"🇿🇼","isTopPriority":false}
]);

/**
 * Mappa indicizzata per Nome Stato -> CountryRecord.
 * @readonly
 * @type {Record<string, CountryRecord>}
 */
const CountryByName = Object.freeze(
  Object.fromEntries(Countries.map(c => [c.name, c]))
);

/**
 * Mappa indicizzata per Aggettivo Cittadinanza -> Nome Stato.
 * Mantiene la piena compatibilità retroattiva con il dizionario CountryByCitizenship.
 * @readonly
 * @type {Record<string, string>}
 */
const CountryByCitizenship = Object.freeze(
  Object.fromEntries(Countries.map(c => [c.citizenship, c.name]))
);

/**
 * Mappatura compatibile con il precedente CountryPhoneData: Nome Stato -> { code, iso, flag }.
 * @readonly
 * @type {Record<string, { code: string, iso: string, flag: string }>} 
 */
const CountryPhoneData = Object.freeze(
  Object.fromEntries(Countries.map(c => [c.name, { code: c.phone, iso: c.iso, flag: c.flag }]))
);

/**
 * Mappa rapida Nome Stato -> Prefisso telefonico.
 * @readonly
 * @type {Record<string, string>}
 */
const CountryCallingCodes = Object.freeze(
  Object.fromEntries(Countries.map(c => [c.name, c.phone]))
);

/**
 * Elenco alfabetico immutabile dei soli nomi degli stati mondiali.
 * Mantiene la piena compatibilità con la costante StatiMondiali.
 * @readonly
 * @type {readonly string[]}
 */
const StatiMondiali = Object.freeze(
  Countries.map(c => c.name).sort((a, b) => a.localeCompare(b, "it"))
);

/**
 * Elenco dei paesi prioritari per la Web App dello sportello.
 * Mantiene la piena compatibilità con la costante TopPriorityCountries.
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
 * Ricerca un record paese a partire da un valore arbitrario (nome stato, aggettivo cittadinanza o codice ISO).
 * Supporta confronti case-insensitive e normalizzazione spazi.
 * @param {string} query - Termine di ricerca (es. "Italia", "marocchina", "FR", "albanese")
 * @return {CountryRecord | null} Il record della nazione trovata, oppure null se non trovata.
 */
function findCountry(query) {
  if (!query || typeof query !== "string") return null;
  const clean = query.trim();
  if (!clean) return null;

  // 1. Match diretto per nome esatto
  if (CountryByName[clean]) return CountryByName[clean];

  // 2. Match diretto per aggettivo cittadinanza
  const countryNameFromCit = CountryByCitizenship[clean];
  if (countryNameFromCit && CountryByName[countryNameFromCit]) {
    return CountryByName[countryNameFromCit];
  }

  // 3. Match case-insensitive su nome, aggettivo o codice ISO
  const lower = clean.toLowerCase();
  for (let i = 0; i < Countries.length; i++) {
    const c = Countries[i];
    if (c.name.toLowerCase() === lower ||
        c.citizenship.toLowerCase() === lower ||
        c.iso.toLowerCase() === lower) {
      return c;
    }
  }

  return null;
}

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
    const prefixes = Object.values(CountryCallingCodes);
    const uniquePrefixes = Array.from(new Set(prefixes)).sort((a, b) => b.length - a.length);

    for (let i = 0; i < uniquePrefixes.length; i++) {
      const pref = uniquePrefixes[i];
      if (cleaned.startsWith(pref)) {
        const local = cleaned.substring(pref.length).trim();
        return { prefix: pref, number: local };
      }
    }

    const match = cleaned.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      return { prefix: match[1], number: match[2].trim() };
    }
  }

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
