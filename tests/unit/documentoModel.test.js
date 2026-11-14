const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('Models/Documenti/Documento.js - Modello e Semafori Scadenze', () => {
  before(() => {
    loadScript('src/Domain/documents.js');
    loadScript('src/Models/Documenti/Documento.js');
  });

  describe('Creazione Istanza e Deduplicazione Categoria', () => {
    it('costruisce correttamente un documento deducendo la categoria dal catalogo SSOT', () => {
      const doc = new Documento({
        id: 1,
        intestatario: 'RSSMRA80A01F205X',
        tipo: 'Attestazione ISEE',
        valore: 8500.50,
        dataScadenza: '2026-12-31'
      });

      assert.strictEqual(doc.id, 1);
      assert.strictEqual(doc.intestatario, 'RSSMRA80A01F205X');
      assert.strictEqual(doc.tipo, 'Attestazione ISEE');
      assert.strictEqual(doc.categoria, 'Economica');
      assert.strictEqual(doc.valore, 8500.50);
      assert.strictEqual(doc.dataScadenza, '2026-12-31');
    });

    it('normalizza correttamente le date in formato YYYY-MM-DD da vari formati (Date, DD/MM/YYYY)', () => {
      assert.strictEqual(Documento._normalizeDateString('15/05/2030'), '2030-05-15');
      assert.strictEqual(Documento._normalizeDateString('2030-05-15T12:00:00Z'), '2030-05-15');
      assert.strictEqual(Documento._normalizeDateString(new Date(2030, 4, 15)), '2030-05-15');
      assert.strictEqual(Documento._normalizeDateString(''), '');
      assert.strictEqual(Documento._normalizeDateString(null), '');
    });
  });

  describe('Calcolo Semafori Scadenza (getStatoScadenza)', () => {
    it('restituisce PERMANENTE se il documento non ha data di scadenza', () => {
      const doc = new Documento({
        tipo: 'Firma Autografa',
        intestatario: 'RSSMRA80A01F205X'
      });
      assert.strictEqual(doc.getStatoScadenza(), 'PERMANENTE');
      assert.strictEqual(doc.getGiorniAllaScadenza(), null);
    });

    it('restituisce SCADUTO se la data di scadenza è passata', () => {
      const refDate = new Date('2026-06-01');
      const doc = new Documento({
        tipo: "Carta d'Identità",
        dataScadenza: '2026-05-01'
      });
      assert.strictEqual(doc.getStatoScadenza(refDate), 'SCADUTO');
      assert.ok(doc.getGiorniAllaScadenza(refDate) < 0);
    });

    it('restituisce IN_SCADENZA se la scadenza è entro la soglia di 60 giorni', () => {
      const refDate = new Date('2026-06-01');
      const doc = new Documento({
        tipo: "Carta d'Identità",
        dataScadenza: '2026-06-25' // 24 giorni dopo
      });
      assert.strictEqual(doc.getStatoScadenza(refDate, 60), 'IN_SCADENZA');
      assert.strictEqual(doc.getGiorniAllaScadenza(refDate), 24);
    });

    it('restituisce VALIDO se la scadenza supera la soglia di 60 giorni', () => {
      const refDate = new Date('2026-06-01');
      const doc = new Documento({
        tipo: "Carta d'Identità",
        dataScadenza: '2026-12-31'
      });
      assert.strictEqual(doc.getStatoScadenza(refDate, 60), 'VALIDO');
      assert.ok(doc.getGiorniAllaScadenza(refDate) > 60);
    });
  });

  describe('Qualità Documento e Qualità Fascicolo Beneficiario', () => {
    it('inizializza la qualità del documento con default OTTIMALE o con valore custom', () => {
      const docDefault = new Documento({ tipo: "Carta d'Identità" });
      assert.strictEqual(docDefault.qualita, '🟢 OTTIMALE');
      assert.strictEqual(docDefault.toObject().qualita, '🟢 OTTIMALE');

      const docCustom = new Documento({
        tipo: "Carta d'Identità",
        qualita: '⚠️ DA UNIFICARE'
      });
      assert.strictEqual(docCustom.qualita, '⚠️ DA UNIFICARE');
      assert.strictEqual(docCustom.toObject().qualita, '⚠️ DA UNIFICARE');
    });

    it('evaluateBeneficiaryDocQuality calcola correttamente lo stato qualitativo del fascicolo', () => {
      // Caso 1: Nessun documento di riconoscimento -> INCOMPLETO
      const benSenzaDoc = { cf: 'RSSMRA80A01H501Z', documents: {} };
      assert.strictEqual(evaluateBeneficiaryDocQuality(benSenzaDoc, []), '🔴 INCOMPLETO');

      // Caso 2: Documento presente ma con qualità DA UNIFICARE
      const benDaUnificare = { cf: 'RSSMRA80A01H501Z' };
      const docsDaUnificare = [
        { tipo: "Carta d'Identità", qualita: "⚠️ DA UNIFICARE" }
      ];
      assert.strictEqual(evaluateBeneficiaryDocQuality(benDaUnificare, docsDaUnificare), '⚠️ DA UNIFICARE');

      // Caso 3: Documento presente ma con foto grezza -> DA PERFEZIONARE
      const benGrezzo = { cf: 'RSSMRA80A01H501Z' };
      const docsGrezzi = [
        { tipo: "Carta d'Identità", qualita: "🟡 FOTO GREZZA" }
      ];
      assert.strictEqual(evaluateBeneficiaryDocQuality(benGrezzo, docsGrezzi), '🟡 DA PERFEZIONARE');

      // Caso 4: Tutti i documenti standard e completi -> OTTIMALE
      const benOttimale = { cf: 'RSSMRA80A01H501Z' };
      const docsOttimali = [
        { tipo: "Carta d'Identità", qualita: "🟢 OTTIMALE" },
        { tipo: "Tessera Sanitaria", qualita: "🟢 OTTIMALE" }
      ];
      assert.strictEqual(evaluateBeneficiaryDocQuality(benOttimale, docsOttimali), '🟢 OTTIMALE');
    });

    it('aggiorna lo stato di qualità con DocumentoRepository.updateQuality', () => {
      loadScript('src/Repository/Documento.js');
      const fakeSheet = {
        getLastRow: () => 3,
        getLastColumn: () => 11,
        getRange: (r, c, numR, numC) => {
          if (r === 1) {
            return {
              getValues: () => [[
                "ID Documento", "Intestatario", "Tipo", "Categoria", "Valore",
                "Data Emissione", "Data Scadenza", "Qualità Documento", "ID Drive", "Note", "Data Inserimento"
              ]]
            };
          }
          if (c === 1) { // colonna ID
            return {
              getValues: () => [[1], [2]]
            };
          }
          // range per setValue
          return {
            setValue: (val) => { fakeSheet._updatedVal = val; }
          };
        }
      };

      global.SpreadsheetApp = {
        getActiveSpreadsheet: () => ({
          getSheetByName: () => fakeSheet
        })
      };
      global.findHeaderIndex = (headers, names) => {
        const lowerHeaders = headers.map(h => String(h).trim().toLowerCase());
        for (let i = 0; i < lowerHeaders.length; i++) {
          for (let k = 0; k < names.length; k++) {
            if (lowerHeaders[i].includes(names[k])) return i;
          }
        }
        return -1;
      };

      const res = DocumentoRepository.updateQuality(2, '🟢 OTTIMALE');
      assert.strictEqual(res.success, true);
      assert.strictEqual(fakeSheet._updatedVal, '🟢 OTTIMALE');
    });
  });
});
