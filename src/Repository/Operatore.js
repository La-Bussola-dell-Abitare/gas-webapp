/**
 * @file Operatore.js
 * @description Repository per l'accesso e la lettura dei dati degli Operatori e Assistenti Sociali
 * memorizzati sul foglio Google "Operatori".
 * @module Repository/Operatore
 */

/**
 * Repository per gestire le operazioni di persistenza e lettura degli Operatori.
 */
class OperatoreRepository {
    /**
     * Restituisce l'oggetto Sheet corrispondente al foglio operatori attivo (priorità a '_DatiOperatori', fallback a 'Operatori').
     * @return {GoogleAppsScript.Spreadsheet.Sheet | null} Il foglio Operatori o null se inesistente.
     */
    static sheet() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        if (!ss) return null;
        return ss.getSheetByName("_DatiOperatori") || ss.getSheetByName("Operatori");
    }

    /**
     * Recupera tutti gli operatori censiti nel foglio di calcolo, idratandoli in istanze della classe Operatore.
     * @return {Operatore[]} Elenco degli operatori registrati.
     */
    static getAll() {
        const sheet = OperatoreRepository.sheet();
        if (!sheet) return [];

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return [];

        const headers = data[0].map(h => h.toString().trim().toLowerCase());
        const idx = OperatoreRepository._getColIndexes(headers);

        const list = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const nome = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]) : "";
            const cognome = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]) : "";

            if (nome || cognome) {
                list.push(Operatore.fromRow(row, idx));
            }
        }
        return list;
    }

    /**
     * Trova un operatore per nome completo ("Nome Cognome") o solo per nome (case-insensitive).
     * @param {string} searchName - Nome o nominativo completo da cercare.
     * @return {Operatore|null} L'istanza dell'Operatore trovato o null.
     */
    static getByName(searchName) {
        if (!searchName) return null;
        const cleanSearch = searchName.toLowerCase().trim();
        const list = OperatoreRepository.getAll();

        return list.find(op => {
            const fullName = (op.name + " " + op.surname).toLowerCase().trim();
            return fullName === cleanSearch || op.name.toLowerCase().trim() === cleanSearch;
        }) || null;
    }

    /**
     * Mappa gli indici delle colonne del foglio "Operatori" in base ai possibili nomi dell'intestazione.
     * @private
     * @param {string[]} headers - Intestazioni della prima riga del foglio.
     * @return {Record<string, number>} Mappa nomeColonna -> indice (0-based).
     */
    static _getColIndexes(headers) {
        return {
            nome: findHeaderIndex(headers, ["nome"]),
            cognome: findHeaderIndex(headers, ["cognome"]),
            cf: findHeaderIndex(headers, ["codice fiscale", "cf"]),
            dataNascita: findHeaderIndex(headers, ["data di nascita", "data nascita"]),
            luogoNascita: findHeaderIndex(headers, ["luogo di nascita", "luogo nascita"]),
            operatore: findHeaderIndex(headers, ["operatore"]),
            qualifica: findHeaderIndex(headers, ["qualifica"]),
            ruolo: findHeaderIndex(headers, ["ruolo"]),
            firma: findHeaderIndex(headers, ["firma", "firma id"]),
            email: findHeaderIndex(headers, ["email", "mail"]),
            stato: findHeaderIndex(headers, ["stato", "attivo"]),
            oreSettimanali: findHeaderIndex(headers, ["ore", "ore settimanali"])
        };
    }
}
