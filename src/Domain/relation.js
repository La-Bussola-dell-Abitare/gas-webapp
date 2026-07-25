const Relations = Object.freeze(/** @type {const} */([
    "Intestatario",
    "Coniuge",
    "Figlio",
    "Genitore",
    "Fratello",
    "Nipote",
    "Nonno",
    "Zio",
    "Cugino",
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
