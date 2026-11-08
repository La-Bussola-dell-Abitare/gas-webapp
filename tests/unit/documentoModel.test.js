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
});
