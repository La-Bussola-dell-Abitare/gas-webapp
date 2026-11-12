/**
 * @file documentIntelligence.test.js
 * @description Test unitari per DocumentIntelligence.js:
 * Verifica la resilienza a errori 503 (sovraccarico), timeout di rete,
 * cascata automatica su modelli fallback e normalizzazione dei metadati.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DocumentIntelligence.js - Resilienza IA e Cascata Fallback', () => {
  let context;

  beforeEach(() => {
    context = {
      Logger: {
        log: () => {}
      },
      CONFIG: {
        GEMINI: {
          MODEL: 'gemini-2.0-flash',
          getApiKey: () => 'test-api-key-1234567890',
          getModel: () => 'gemini-2.0-flash'
        }
      },
      Utilities: {
        base64Encode: (bytes) => Buffer.from(bytes || '').toString('base64'),
        base64Decode: (str) => Buffer.from(str || '', 'base64'),
        newBlob: (bytes, mime, name) => ({
          getBytes: () => bytes,
          getContentType: () => mime || 'application/pdf',
          getName: () => name || 'doc.pdf'
        }),
        sleep: () => {}
      },
      UrlFetchApp: {
        fetch: () => {}
      },
      findDocumentType: (tipo) => {
        if (/carta.*identit/i.test(tipo)) {
          return { name: "Carta d'Identità", categoria: "Riconoscimento", scope: "personale" };
        }
        if (/isee/i.test(tipo)) {
          return { name: "Attestazione ISEE", categoria: "Economica", scope: "nucleo" };
        }
        return { name: "Altro", categoria: "Altro", scope: "personale" };
      },
      normalizeProperCase: (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '',
      normalizeCity: (str) => str || '',
      normalizeAddress: (str) => str || '',
      normalizeFiscalCode: (str) => (str || '').toUpperCase().trim(),
      console: console
    };

    const docIntelCode = fs.readFileSync(
      path.join(__dirname, '../../src/Service/Document/DocumentIntelligence.js'),
      'utf8'
    );
    vm.createContext(context);
    vm.runInContext(docIntelCode + '\nthis.DocumentIntelligence = DocumentIntelligence;', context);
  });

  it('verifica disponibilità del servizio in base alla presenza della chiave API', () => {
    const isAvail = context.DocumentIntelligence.isAvailable();
    assert.equal(isAvail, true);

    context.CONFIG.GEMINI.getApiKey = () => '';
    assert.equal(context.DocumentIntelligence.isAvailable(), false);
  });

  it('estrae con successo i dati quando Gemini restituisce HTTP 200 al primo tentativo', () => {
    const mockGeminiJson = {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              datiPersona: {
                nome: 'MARIO',
                cognome: 'ROSSI',
                codiceFiscale: 'RSSMRA85M01H501Z'
              },
              documenti: [{
                tipoDocumento: "Carta d'Identità",
                numeroDocumento: 'CA12345AA',
                dataScadenza: '2030-01-01'
              }]
            })
          }]
        }
      }]
    };

    context.UrlFetchApp.fetch = (url, options) => {
      assert.ok(url.includes('gemini-2.0-flash'));
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify(mockGeminiJson)
      };
    };

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'image/jpeg', 'cie.jpg');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, true);
    assert.equal(result.data.datiPersona.nome, 'Mario');
    assert.equal(result.data.datiPersona.cognome, 'Rossi');
    assert.equal(result.data.datiPersona.codiceFiscale, 'RSSMRA85M01H501Z');
    assert.equal(result.data.documenti.length, 1);
    assert.equal(result.data.documenti[0].tipoDocumento, "Carta d'Identità");
  });

  it('gestisce errore HTTP 503 (sovraccarico) effettuando fallback automatico sul modello successivo', () => {
    let callCount = 0;
    const requestedModels = [];

    context.UrlFetchApp.fetch = (url, options) => {
      callCount++;
      const modelMatch = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = modelMatch ? modelMatch[1] : '';
      requestedModels.push(modelName);

      // Il primo modello (es. gemini-2.0-flash) restituisce 503 sovraccarico
      if (modelName === 'gemini-2.0-flash') {
        return {
          getResponseCode: () => 503,
          getContentText: () => JSON.stringify({ error: { message: 'The model is overloaded. Please try again later.' } })
        };
      }

      // Il modello fallback (gemini-2.5-flash) risponde con successo 200
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  datiPersona: { nome: 'LUIGI', cognome: 'VERDI' },
                  documenti: [{ tipoDocumento: 'Attestazione ISEE', valore: 12500 }]
                })
              }]
            }
          }]
        })
      };
    };

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'application/pdf', 'isee.pdf');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, true);
    assert.equal(result.modelUsed, 'gemini-2.5-flash');
    assert.equal(result.data.datiPersona.nome, 'Luigi');
    assert.equal(result.data.valoreISEE, 12500);
    assert.ok(requestedModels.includes('gemini-2.0-flash'));
    assert.ok(requestedModels.includes('gemini-2.5-flash'));
  });

  it('gestisce timeout di rete su UrlFetchApp effettuando fallback automatico sul modello successivo', () => {
    const requestedModels = [];

    context.UrlFetchApp.fetch = (url, options) => {
      const modelMatch = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = modelMatch ? modelMatch[1] : '';
      requestedModels.push(modelName);

      // Il primo modello va in timeout
      if (modelName === 'gemini-2.0-flash') {
        throw new Error('Timeout exceeded while fetching URL');
      }

      // Il modello successivo risponde
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  datiPersona: { nome: 'ANNA', cognome: 'BIANCHI' },
                  documenti: []
                })
              }]
            }
          }]
        })
      };
    };

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'image/png', 'doc.png');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, true);
    assert.equal(result.data.datiPersona.nome, 'Anna');
    assert.equal(result.modelUsed, 'gemini-2.5-flash');
  });

  it('restituisce un messaggio chiaro di congestione temporanea se tutti i modelli nella cascata falliscono', () => {
    context.UrlFetchApp.fetch = () => ({
      getResponseCode: () => 503,
      getContentText: () => JSON.stringify({ error: { message: 'Service Unavailable' } })
    });

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'image/png', 'doc.png');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, false);
    assert.match(result.message, /temporaneamente congestionati/i);
    assert.match(result.message, /503/);
  });
});
