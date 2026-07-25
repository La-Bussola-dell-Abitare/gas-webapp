/**
 * @enum {number}
 */
const ISCED = /** @type {const}*/Object.freeze({
    Nessuno: 0, // asilo nido o materna
    Elementare: 1, // primaria (elementari)
    Medie: 2, // secondaria inferiore (medie)
    Qualifica: 3, // qualifica professionale (3 anni)
    Diploma: 3, // secondaria superiore (diploma)
    Specializzazione: 4, // post-secondaria non terziaria (corsi di specializzazione post-diploma non universitari)
    ITS: 5, // terziaria di ciclo breve (ITS)
    Triennale: 6, // terziaria di primo livello (triennale)
    Magistrale: 7, // terziaria di secondo livello (magistrale)
    Dottorato: 8, // dottorato o equivalente
});

/**
 * @enum {number}
 */
const EQF = /** @type {const}*/Object.freeze({
    Nessuno: 0, // asilo nido o materna
    Elementare: 1, // primaria (elementari)
    Medie: 2, // secondaria inferiore (medie)
    Qualifica: 3, // qualifica professionale (3 anni)
    Diploma: 4, // secondaria superiore (diploma)
    ITS: 5, // terziaria di ciclo breve (ITS)
    Triennale: 6, // terziaria di primo livello (triennale)
    Magistrale: 7, // terziaria di secondo livello (magistrale)
    Dottorato: 8 // dottorato o equivalente
});