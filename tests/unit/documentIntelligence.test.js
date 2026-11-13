/**
 * @file documentIntelligence.test.js
 * @description Test unitari per DocumentIntelligence.js:
 * Verifica la resilienza a errori 503 (sovraccarico), timeout di rete,
 * cascata automatica su tier generici (Flash -> Flash-Lite -> Pro) e normalizzazione dei metadati.
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
          MODEL: 'gemini-flash-latest',
          getApiKey: () => 'test-api-key-1234567890',
          getModel: () => 'gemini-flash-latest'
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

  it('estrae con successo i dati quando Gemini restituisce HTTP 200 al primo tentativo con gemini-flash-latest', () => {
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
      assert.ok(url.includes('gemini-flash-latest'));
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify(mockGeminiJson)
      };
    };

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'image/jpeg', 'cie.jpg');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, true);
    assert.equal(result.modelUsed, 'gemini-flash-latest');
    assert.equal(result.data.datiPersona.nome, 'Mario');
    assert.equal(result.data.datiPersona.cognome, 'Rossi');
    assert.equal(result.data.datiPersona.codiceFiscale, 'RSSMRA85M01H501Z');
    assert.equal(result.data.documenti.length, 1);
    assert.equal(result.data.documenti[0].tipoDocumento, "Carta d'Identità");
  });

  it('gestisce errore HTTP 503 (sovraccarico) effettuando fallback automatico su gemini-flash-lite-latest', () => {
    let callCount = 0;
    const requestedModels = [];

    context.UrlFetchApp.fetch = (url, options) => {
      callCount++;
      const modelMatch = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = modelMatch ? modelMatch[1] : '';
      requestedModels.push(modelName);

      // Il primo modello (gemini-flash-latest) restituisce 503 sovraccarico
      if (modelName === 'gemini-flash-latest') {
        return {
          getResponseCode: () => 503,
          getContentText: () => JSON.stringify({ error: { message: 'The model is overloaded. Please try again later.' } })
        };
      }

      // Il modello fallback (gemini-flash-lite-latest) risponde con successo 200
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
    assert.equal(result.modelUsed, 'gemini-flash-lite-latest');
    assert.equal(result.data.datiPersona.nome, 'Luigi');
    assert.equal(result.data.valoreISEE, 12500);
    assert.ok(requestedModels.includes('gemini-flash-latest'));
    assert.ok(requestedModels.includes('gemini-flash-lite-latest'));
  });

  it('gestisce timeout di rete su UrlFetchApp effettuando fallback automatico sul modello successivo', () => {
    const requestedModels = [];

    context.UrlFetchApp.fetch = (url, options) => {
      const modelMatch = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = modelMatch ? modelMatch[1] : '';
      requestedModels.push(modelName);

      // Il primo modello va in timeout
      if (modelName === 'gemini-flash-latest') {
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
    assert.equal(result.modelUsed, 'gemini-flash-lite-latest');
  });

  it('gestisce errore HTTP 404 effettuando fallback automatico su gemini-flash-lite-latest', () => {
    const requestedModels = [];

    context.UrlFetchApp.fetch = (url, options) => {
      const modelMatch = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = modelMatch ? modelMatch[1] : '';
      requestedModels.push(modelName);

      if (modelName === 'gemini-flash-latest') {
        return {
          getResponseCode: () => 404,
          getContentText: () => JSON.stringify({ error: { code: 404, message: 'models/gemini-flash-latest is not found' } })
        };
      }

      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  datiPersona: { nome: 'GIOVANNI', cognome: 'ROSSI' },
                  documenti: []
                })
              }]
            }
          }]
        })
      };
    };

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'image/jpeg', 'doc.jpg');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, true);
    assert.equal(result.modelUsed, 'gemini-flash-lite-latest');
    assert.equal(result.data.datiPersona.nome, 'Giovanni');
    assert.ok(requestedModels.includes('gemini-flash-latest'));
    assert.ok(requestedModels.includes('gemini-flash-lite-latest'));
  });

  it('gestisce doppio fallimento (Flash e Flash-Lite) effettuando fallback su gemini-pro-latest', () => {
    const requestedModels = [];

    context.UrlFetchApp.fetch = (url, options) => {
      const modelMatch = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = modelMatch ? modelMatch[1] : '';
      requestedModels.push(modelName);

      if (modelName === 'gemini-flash-latest' || modelName === 'gemini-flash-lite-latest') {
        return {
          getResponseCode: () => 503,
          getContentText: () => JSON.stringify({ error: { message: 'Overloaded' } })
        };
      }

      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  datiPersona: { nome: 'FRANCESCO', cognome: 'NERI' },
                  documenti: []
                })
              }]
            }
          }]
        })
      };
    };

    const dummyBlob = context.Utilities.newBlob(Buffer.from('dummy'), 'image/jpeg', 'doc.jpg');
    const result = context.DocumentIntelligence.analyzeBlobs([dummyBlob]);

    assert.equal(result.success, true);
    assert.equal(result.modelUsed, 'gemini-pro-latest');
    assert.equal(result.data.datiPersona.nome, 'Francesco');
    assert.ok(requestedModels.includes('gemini-flash-latest'));
    assert.ok(requestedModels.includes('gemini-flash-lite-latest'));
    assert.ok(requestedModels.includes('gemini-pro-latest'));
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
