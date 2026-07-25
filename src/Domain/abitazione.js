const Abitazione = Object.freeze(/** @type {const} */([
    "Senza dimora",
    "Casa rifugio",
    "Casa famiglia",
    "Semi-autonomia",
    "Ospite temporaneo presso amici/parenti",
    "Housing first",
    "Locazione",
    "Proprietà",
    "Stabile occupato",
    "Usufrutto o titolo gratuito",
    "Altro"
]));

// 2. Estraiamo il tipo degli elementi dell'array
/**
 * @typedef {typeof Relations[number]} Relation
 */

/**
 * @param {Relation} relazione
 */
function testEnum(relazione) {
    console.log(relazione);
}
