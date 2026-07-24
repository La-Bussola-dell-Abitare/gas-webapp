/**
 * Repository per gestire le operazioni di persistenza e lettura degli Operatori.
 */
class OperatoreRepository {
    /**
     * Ottiene tutti gli operatori.
     * @return {Operatore[]}
     */
    static getAll() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName("Operatori");
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
     * Trova un operatore per nome completo (nome cognome) o solo per nome.
     * @param {string} searchName - Nome da cercare
     * @return {Operatore|null}
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
     * Mappa gli indici delle colonne in base alle intestazioni.
     * @private
     * @param {string[]} headers
     * @return {Record<string, number>}
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
            firma: findHeaderIndex(headers, ["firma", "firma id"])
        };
    }
}
