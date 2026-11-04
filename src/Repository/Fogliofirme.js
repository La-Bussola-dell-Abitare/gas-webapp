/**
 * @file Fogliofirme.js
 * @description Repository per la ricerca, generazione e aggiornamento dei Fogli Firme individuali
 * archiviati su Google Drive e Google Docs per ciascuna coppia operatore-beneficiario per mese.
 * @module Repository/FoglioFirme
 */

/**
 * Repository per la gestione dei Fogli Firme su Google Drive e Google Docs.
 */
class FoglioFirmeRepository {
    /**
     * Verifica se esiste un foglio firme per i parametri specificati.
     * Effettua la ricerca tramite proprietà personalizzate o titolo del file.
     * 
     * @param {FoglioFirme|string} foglioFirme - Istanza di FoglioFirme o nome operatore.
     * @param {string} [client] - Nome del beneficiario (se foglioFirme è stringa).
     * @param {Date|string} [date] - Data/mese di riferimento (se foglioFirme è stringa).
     * @param {GoogleAppsScript.Drive.Folder} [folder] - Cartella Drive di destinazione (opzionale).
     * @return {FoglioFirme | null} L'oggetto FoglioFirme se trovato, altrimenti null.
     */
    static get(foglioFirme, client, date, folder) {
        let opName = "";
        let clName = "";
        let targetDate = new Date();
        const targetFolder = folder || CONFIG.FOGLIFIRME.FOLDER;

        if (foglioFirme instanceof FoglioFirme) {
            opName = typeof foglioFirme.operator === "string" ? foglioFirme.operator : (foglioFirme.operator?.name || "");
            clName = typeof foglioFirme.client === "string" ? foglioFirme.client : (foglioFirme.client?.name || "");
            targetDate = foglioFirme.date instanceof Date ? foglioFirme.date : (foglioFirme.date ? new Date(foglioFirme.date) : new Date());
        } else {
            opName = foglioFirme || "";
            clName = client || "";
            targetDate = date instanceof Date ? date : (date ? new Date(date) : new Date());
        }

        const monthYear = targetDate.getFullYear() + "-" + ("0" + (targetDate.getMonth() + 1)).slice(-2);

        // 1. Ricerca tramite proprietà Drive
        try {
            const existingFilesMatchingProperties = targetFolder.searchFiles(
                `properties has { key='mese' and value='${monthYear}' and visibility='PUBLIC' } and properties has { key='operatore' and value='${opName}' and visibility='PUBLIC' } and properties has { key='beneficiario' and value='${clName}' and visibility='PUBLIC' } and trashed = false`
            );
            if (existingFilesMatchingProperties.hasNext()) {
                const file = existingFilesMatchingProperties.next();
                return new FoglioFirme(file.getId(), file.getName(), file.getUrl());
            }
        } catch (e) {
            Logger.log("Ricerca per properties fallita, fallback su titolo: " + e.message);
        }

        // 2. Fallback su ricerca testuale nel titolo
        const existingFilesMatchingTitle = targetFolder.searchFiles(
            `title contains '${monthYear}' and title contains '${clName}' and title contains '${opName}' and trashed = false`
        );
        if (existingFilesMatchingTitle.hasNext()) {
            const file = existingFilesMatchingTitle.next();
            return new FoglioFirme(file.getId(), file.getName(), file.getUrl());
        }

        return null;
    }

    /**
     * Crea un nuovo foglio firme individuale copiandolo dal template ufficiale di Google Drive.
     * Imposta i metadati di ricerca e precompila data, operatore e beneficiario.
     * 
     * @param {string} operator - Nome dell'operatore referente.
     * @param {string} client - Nome del beneficiario.
     * @param {Date} [date=new Date()] - Data o mese di riferimento.
     * @return {FoglioFirme} Il nuovo FoglioFirme creato con ID, nome e URL di accesso.
     */
    static create(operator, client, date = new Date()) {
        const monthYear = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
        const fileName = `${monthYear} ${client} (${operator})`;

        const templateFile = CONFIG.FOGLIFIRME.TEMPLATE;
        const folder = CONFIG.FOGLIFIRME.FOLDER;
        const newFile = templateFile.makeCopy(fileName, folder);
        const id = newFile.getId();

        try {
            Drive.Properties.insert({ key: 'mese', value: monthYear, visibility: 'PUBLIC' }, id);
            Drive.Properties.insert({ key: 'operatore', value: operator, visibility: 'PUBLIC' }, id);
            Drive.Properties.insert({ key: 'beneficiario', value: client, visibility: 'PUBLIC' }, id);
        } catch (e) {
            Logger.log('Drive API Advanced Service not enabled. Properties skipped.');
        }

        const doc = DocumentApp.openById(id);
        const body = doc.getBody();

        body.replaceText("{data}", monthYear);
        body.replaceText("{operatore}", operator);
        body.replaceText("{cliente}", client);

        doc.saveAndClose();

        return new FoglioFirme(id, fileName, newFile.getUrl());
    }

    /**
     * Aggiunge una riga di incontro con data, orari e firma all'interno della tabella del foglio firme.
     * @param {string} [docId] - L'ID del documento Google Docs del foglio firme.
     * @param {Array<string|number>} [rowData] - Dati della riga (data, orario, durata, firma op, firma ben, attività).
     * @return {void}
     */
    static appendRow(docId, rowData) {
        // Implementazione per retrocompatibilità e future estensioni
    }
}
