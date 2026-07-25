const StatiCivili = Object.freeze(/** @type {const} */([
    "Celibe/Nubile",
    "Coniugato/Coniugata",
    "Separato/Separata",
    "Divorziato/Divorziata",
    "Vedovo/Vedova",
    "Unito civilmente",
    "In unione di fatto"
]));

// 2. Estraiamo il tipo degli elementi dell'array
/**
 * @typedef {typeof StatiCivili[number]} StatoCivile
 */

/**
 * @param {Relation} relazione
 */
function testEnum(relazione) {
    console.log(relazione);
}
