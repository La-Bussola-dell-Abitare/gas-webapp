// Funzioni chiamate dal front-end

/**
 * Recupera i dati dal foglio "Operatori" e li trasforma in un array di oggetti JS.
 * @return {Operatore[]}
 */
function getOperatoriObjects() {
    return OperatoreRepository.getAll();
}

/**
 * Restituisce un oggetto operatore cercando per nome
 * @param {string} nome - Il nome dell'operatore (es. "Lorenzo")
 * @returns {Operatore|null} - L'oggetto operatore o null se non trovato
 */
function getOperatoreByName(nome) {
    return OperatoreRepository.getByName(nome);
}
