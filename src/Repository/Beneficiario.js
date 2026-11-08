/**
 * @file Beneficiario.js
 * @description Repository per l'accesso e la persistenza dei dati dei Beneficiari sul foglio Google 'Beneficiari'.
 * Gestisce la lettura massiva (getAll), la mappatura dinamica delle intestazioni, l'inserimento/aggiornamento (add)
 * e la cancellazione (removeByCF) con controllo di unicità su codice fiscale e nominativo.
 * @module Repository/Beneficiario
 */

/**
 * Repository per gestire le operazioni di persistenza e lettura dei Beneficiari.
 */
class BeneficiarioRepository {
    /**
     * Ottiene tutti i beneficiari.
     * @return {Beneficiario[]}
     */
    static getAll() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        if (!ss) return [];
        let sheet = ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : 'Beneficiari');
        if (!sheet) sheet = ss.getSheetByName('Beneficiari');
        if (!sheet) sheet = ss.getSheetByName('Beneficiario');
        if (!sheet) sheet = ss.getSheetByName('Anagrafica');
        if (!sheet) return [];

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return [];

        const headers = data[0].map(h => h.toString().trim().toLowerCase());
        const idx = BeneficiarioRepository._getColIndexes(headers);

        const list = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const nome = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]) : "";
            const cognome = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]) : "";
            const cf = idx.cf >= 0 && idx.cf < row.length ? safeString(row[idx.cf]) : "";

            if (nome || cognome || cf) {
                try {
                    list.push(Beneficiario.fromRow(row, idx));
                } catch (rowErr) {
                    Logger.log("BeneficiarioRepository - Errore idratazione riga " + (i + 1) + ": " + (rowErr instanceof Error ? rowErr.message : String(rowErr)));
                }
            }
        }
        return list;
    }

    /**
     * Rimuove un beneficiario dal foglio cercando per codice fiscale.
     * @param {string} cf - Il codice fiscale del beneficiario da rimuovere.
     * @return {{ success: boolean; message: string }}
     */
    static removeByCF(cf) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(WA_SHEET_BENEFICIARI);
        if (!sheet) throw new Error("Foglio '" + WA_SHEET_BENEFICIARI + "' non trovato.");

        const targetCF = cf ? cf.toUpperCase().trim() : "";
        if (!targetCF) throw new Error("Codice Fiscale non valido per la rimozione.");

        const dataValues = sheet.getDataRange().getValues();
        if (dataValues.length > 1) {
            const headers = dataValues[0].map(h => h.toString().trim().toLowerCase());
            const idx = BeneficiarioRepository._getColIndexes(headers);
            if (idx.cf >= 0) {
                for (let i = 1; i < dataValues.length; i++) {
                    if (dataValues[i][idx.cf].toString().toUpperCase().trim() === targetCF) {
                        sheet.deleteRow(i + 1);

                        try {
                            if (typeof syncBeneficiaries === 'function') {
                                SpreadsheetApp.flush();
                                syncBeneficiaries();
                            }
                        } catch (e) { }

                        return { success: true, message: "Beneficiario rimosso con successo." };
                    }
                }
            }
        }
        throw new Error("Beneficiario con Codice Fiscale " + cf + " non trovato.");
    }

    /**
     * Registra un nuovo beneficiario nel foglio.
     * @param {Record<string, any>} data - Dati del beneficiario da registrare
     * @return {{ success: boolean; message: string }}
     */
    static add(data) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss ? ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : 'Beneficiari') : null;
        if (!sheet && ss) sheet = ss.getSheetByName('Beneficiari');
        if (!sheet) throw new Error("Foglio '" + (typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : 'Beneficiari') + "' non trovato.");

        const targetCF = data.cf ? data.cf.toUpperCase().trim() : "";
        const targetFullName = (((data.nome || "").trim()) + " " + ((data.cognome || "").trim())).toLowerCase();

        const dataValues = sheet.getDataRange().getValues();
        const headers = dataValues.length > 0 ? dataValues[0].map(h => h.toString().trim().toLowerCase()) : [];
        const idx = BeneficiarioRepository._getColIndexes(headers);

        let isUpdate = false;
        let targetRowIdx = -1;

        if (data.isUpdate && targetCF && idx.cf >= 0) {
            for (let i = 1; i < dataValues.length; i++) {
                if (safeString(dataValues[i][idx.cf]).toUpperCase().trim() === targetCF) {
                    isUpdate = true;
                    targetRowIdx = i + 1;
                    break;
                }
            }
        }

        // Validazione unicità (solo se NON è un aggiornamento)
        if (!isUpdate) {
            for (let i = 1; i < dataValues.length; i++) {
                const row = dataValues[i];
                const rowCF = idx.cf >= 0 && idx.cf < row.length ? safeString(row[idx.cf]).toUpperCase().trim() : "";
                const rowNome = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]).trim() : "";
                const rowCognome = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]).trim() : "";
                const rowFullName = (rowNome + " " + rowCognome).toLowerCase();

                if (targetCF && rowCF && rowCF === targetCF) {
                    throw new Error("Un beneficiario con questo Codice Fiscale è già registrato.");
                }
                if (targetFullName && rowFullName && rowFullName === targetFullName) {
                    throw new Error("Un beneficiario con questo Nome e Cognome è già registrato.");
                }
            }
        }

        // Ricerca della prima riga vuota nel foglio (evitando di andare all'ultima riga assoluta se ci sono righe vuote precedenti)
        let firstEmptyRowIdx = -1;
        for (let r = 1; r < dataValues.length; r++) {
            const row = dataValues[r];
            const cfVal = idx.cf >= 0 && idx.cf < row.length ? safeString(row[idx.cf]).trim() : "";
            const nomeVal = idx.nome >= 0 && idx.nome < row.length ? safeString(row[idx.nome]).trim() : "";
            const cognomeVal = idx.cognome >= 0 && idx.cognome < row.length ? safeString(row[idx.cognome]).trim() : "";

            if (!cfVal && !nomeVal && !cognomeVal) {
                firstEmptyRowIdx = r + 1; // 1-indexed riga di Google Sheets
                break;
            }
        }

        // Se nessuna riga intermedia è vuota, si posiziona sulla riga successiva a quelle presenti
        if (firstEmptyRowIdx < 0) {
            firstEmptyRowIdx = dataValues.length + 1;
        }

        const newRowIdx = isUpdate ? targetRowIdx : firstEmptyRowIdx;
        if (newRowIdx > sheet.getMaxRows()) {
            sheet.insertRowAfter(sheet.getMaxRows());
        }

        if (idx.nome >= 0) sheet.getRange(newRowIdx, idx.nome + 1).setValue((data.nome || "").trim());
        if (idx.cognome >= 0) sheet.getRange(newRowIdx, idx.cognome + 1).setValue((data.cognome || "").trim());
        if (idx.cf >= 0) sheet.getRange(newRowIdx, idx.cf + 1).setValue(targetCF);
        if (idx.dataNascita >= 0) sheet.getRange(newRowIdx, idx.dataNascita + 1).setValue(data.dataNascita || "");
        if (idx.luogoNascita >= 0) sheet.getRange(newRowIdx, idx.luogoNascita + 1).setValue((data.luogoNascita || "").trim());
        if (idx.email >= 0) sheet.getRange(newRowIdx, idx.email + 1).setValue((data.email || "").trim());
        if (idx.telefono >= 0) sheet.getRange(newRowIdx, idx.telefono + 1).setValue((data.telefono || "").trim());
        if (idx.statoLavorativo >= 0) sheet.getRange(newRowIdx, idx.statoLavorativo + 1).setValue(data.statoLavorativo || "");
        if (idx.titoloStudio >= 0) sheet.getRange(newRowIdx, idx.titoloStudio + 1).setValue(data.titoloStudio || "");
        if (idx.cittadinanza >= 0) sheet.getRange(newRowIdx, idx.cittadinanza + 1).setValue((data.cittadinanza || "").trim());
        if (idx.residenza >= 0) sheet.getRange(newRowIdx, idx.residenza + 1).setValue((data.residenza || "").trim());
        if (idx.domicilio >= 0) sheet.getRange(newRowIdx, idx.domicilio + 1).setValue((data.domicilio || "").trim());
        if (idx.assistenteSociale >= 0) sheet.getRange(newRowIdx, idx.assistenteSociale + 1).setValue(data.assistenteSociale || "No");
        if (idx.rapportoIntestatario >= 0) sheet.getRange(newRowIdx, idx.rapportoIntestatario + 1).setValue(data.rapportoIntestatario || "");
        if (idx.idNucleo >= 0) sheet.getRange(newRowIdx, idx.idNucleo + 1).setValue(data.idNucleo || "");
        // I vecchi flag documentali non vengono più scritti nel foglio Beneficiari: la gestione risiede esclusivamente nel foglio 'Documenti'
        if (idx.firma >= 0 && (data.firma !== undefined || data.documents?.firma !== undefined)) {
            const val = data.firma !== undefined ? data.firma : data.documents.firma;
            sheet.getRange(newRowIdx, idx.firma + 1).setValue(val || "");
        }
        if (idx.idCartella >= 0 && data.idCartella !== undefined) {
            sheet.getRange(newRowIdx, idx.idCartella + 1).setValue(data.idCartella || "");
        }
        if (idx.statoCivile >= 0) sheet.getRange(newRowIdx, idx.statoCivile + 1).setValue(data.statoCivile || "");
        if (idx.annoArrivo >= 0) {
            let annoVal = "";
            if (data.annoArrivo !== null && data.annoArrivo !== undefined && String(data.annoArrivo).trim() !== "") {
                const parsedInt = parseInt(data.annoArrivo, 10);
                if (!isNaN(parsedInt) && parsedInt > 0) {
                    annoVal = Math.trunc(parsedInt);
                }
            }
            sheet.getRange(newRowIdx, idx.annoArrivo + 1).setValue(annoVal);
        }

        if (idx.dataInserimento >= 0 && !isUpdate) {
            sheet.getRange(newRowIdx, idx.dataInserimento + 1).setValue(new Date());
        }

        try {
            SpreadsheetApp.flush();
        } catch (e) {}

        try {
            if (typeof syncBeneficiaries === 'function') {
                syncBeneficiaries();
            }
        } catch (e) {
            Logger.log("Sincronizzazione fallita in background: " + e.message);
        }

        return { success: true, message: "Beneficiario '" + data.nome + " " + data.cognome + "' salvato con successo." };
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
            email: findHeaderIndex(headers, ["email", "e-mail"]),
            telefono: findHeaderIndex(headers, ["telefono", "cellulare", "tel"]),
            statoLavorativo: findHeaderIndex(headers, ["stato lavorativo", "lavoro"]),
            titoloStudio: findHeaderIndex(headers, ["titolo di studio", "titolo studio"]),
            cittadinanza: findHeaderIndex(headers, ["cittadinanza"]),
            residenza: findHeaderIndex(headers, ["residenza"]),
            domicilio: findHeaderIndex(headers, ["domicilio"]),
            assistenteSociale: findHeaderIndex(headers, ["in carico ai servizi", "in carico", "servizi"]),
            rapportoIntestatario: findHeaderIndex(headers, ["rapporto con intestatario del nucleo familiare", "rapporto intestatario", "rapporto", "rapporto con intestatario nucleo familiare", "relazione", "ruolo nucleo", "ruolo"]),
            cartaIdentita: findHeaderIndex(headers, ["carta identità", "carta d'identità", "ci"]),
            passaporto: findHeaderIndex(headers, ["passaporto"]),
            patente: findHeaderIndex(headers, ["patente"]),
            permessoSoggiorno: findHeaderIndex(headers, ["permesso di soggiorno", "permesso soggiorno"]),
            tesseraSanitaria: findHeaderIndex(headers, ["tessera sanitaria"]),
            statoCivile: findHeaderIndex(headers, ["stato civile"]),
            annoArrivo: findHeaderIndex(headers, ["anno arrivo in italia", "anno arrivo", "arrivo italia"]),
            dataInserimento: findHeaderIndex(headers, ["data inserimento", "data di inserimento", "inserimento"]),
            firma: findHeaderIndex(headers, ["firma", "id firma", "firma id", "firma autografa"]),
            idCartella: findHeaderIndex(headers, ["id cartella drive", "id cartella", "cartella drive", "cartella", "id_cartella"]),
            idNucleo: findHeaderIndex(headers, ["nucleo familiare", "id nucleo", "nucleo", "id_nucleo", "id nucleo familiare", "id_nucleo_familiare", "famiglia", "id famiglia", "codice nucleo", "scheda nucleo", "nucleo id"])
        };
    }

    /**
     * Aggiorna in modo mirato gli identificativi Drive (ID cartella, ID firma o ID documenti) per un beneficiario cercato per CF.
     * Crea le colonne nel foglio se non ancora esistenti.
     * @param {string} cf - Codice Fiscale del beneficiario.
     * @param {Record<string, any>} updates - Mappa dei campi da aggiornare (es. { idCartella, firma, patente, ... }).
     * @return {boolean} true se aggiornato con successo.
     */
    static updateDriveInfo(cf, updates) {
        if (!cf) return false;
        const targetCF = cf.toUpperCase().trim();
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(typeof WA_SHEET_BENEFICIARI !== 'undefined' ? WA_SHEET_BENEFICIARI : 'Beneficiari')
            || ss.getSheetByName('Beneficiari') || ss.getSheetByName('Beneficiario');
        if (!sheet) return false;

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return false;

        const headers = data[0].map(h => h.toString().trim().toLowerCase());
        const idx = BeneficiarioRepository._getColIndexes(headers);
        if (idx.cf < 0) return false;

        let rowIdx = -1;
        for (let i = 1; i < data.length; i++) {
            const rowCF = safeString(data[i][idx.cf]).toUpperCase().trim();
            if (rowCF === targetCF) {
                rowIdx = i + 1; // 1-based index
                break;
            }
        }
        if (rowIdx < 0) return false;

        for (const [key, val] of Object.entries(updates)) {
            let colIdx = idx[key];
            if (colIdx < 0) {
                // Assicura l'esistenza della colonna nel foglio
                let headerName = key;
                if (key === "idCartella") headerName = "ID Cartella Drive";
                else if (key === "firma") headerName = "Firma";
                colIdx = ensureHeaderIndex(sheet, headerName);
                idx[key] = colIdx;
            }
            sheet.getRange(rowIdx, colIdx + 1).setValue(val || "");
        }
        return true;
    }
}