/**
 * @file Fogliofirme.js
 * @description Servizio applicativo per la gestione del ciclo di vita dei Fogli Firme Individuali.
 * Coordina la verifica dell'esistenza del documento mensile per la coppia operatore-beneficiario,
 * la generazione da template e l'accodamento delle righe relative ai singoli colloqui.
 * @module Service/Document/FoglioFirme
 */

/**
 * Service per la logica di business relativa ai Fogli Firme Individuali.
 */
class FoglioFirmeService {
    /**
     * Assicura l'esistenza di un foglio firme per l'operatore e il beneficiario nel mese di riferimento,
     * creandolo da template qualora non sia già presente su Google Drive.
     * 
     * @param {string} operator - Nome dell'operatore referente.
     * @param {string} client - Nome del beneficiario.
     * @param {Date} [date=new Date()] - Data dell'incontro o mese di riferimento.
     * @return {FoglioFirme} L'istanza del FoglioFirme esistente o appena creato.
     */
    static getOrCreate(operator, client, date = new Date()) {
        const existing = FoglioFirmeRepository.get(operator, client, date);
        if (existing) {
            return existing;
        }
        return FoglioFirmeRepository.create(operator, client, date);
    }
}
