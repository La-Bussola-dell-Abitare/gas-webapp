/**
 * @file Diariogiornaliero.js
 * @description Servizio di business logic per l'orchestrazione e l'automazione dei Diari Giornalieri.
 * Coordina la raccolta presenze giornaliere, l'estrazione delle ore lavorate e l'aggiornamento
 * del documento Google Docs del diario tramite DiarioGiornalieroRepository.
 * @module Service/Document/DiarioGiornaliero
 */

/**
 * Service per la logica applicativa relativa ai Diari Giornalieri.
 */
class DiarioGiornalieroService {
    /**
     * Genera e inizializza il diario giornaliero per la data specificata.
     * @param {string} [dateStr] - Data in formato YYYY-MM-DD. Se omessa, usa la data odierna.
     * @return {DiarioGiornaliero} Il diario giornaliero generato o recuperato.
     */
    static getOrCreateDiario(dateStr) {
        const targetDate = dateStr || new Date().toISOString().split('T')[0];
        return DiarioGiornalieroRepository.create(targetDate);
    }
}
