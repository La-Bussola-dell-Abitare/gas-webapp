const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('Domain/documents.js - Catalogo SSOT Documenti & Naming Standard', () => {
  before(() => {
    loadScript('src/Domain/documents.js');
  });

  describe('Catalogo SSOT Documents', () => {
    it('espone un array immutabile di tipologie documentali', () => {
      assert.strictEqual(Array.isArray(Documents), true);
      assert.ok(Documents.length >= 15);
      assert.strictEqual(Object.isFrozen(Documents), true);
    });

    it('contiene le definizioni complete per i documenti chiave', () => {
      const cie = Documents.find(d => d.id === 'CARTA_IDENTITA');
      assert.ok(cie);
      assert.strictEqual(cie.categoria, 'Anagrafica');
      assert.strictEqual(cie.archetipo, 'SCADENZA');
      assert.strictEqual(cie.scope, 'persona');

      const isee = Documents.find(d => d.id === 'ISEE');
      assert.ok(isee);
      assert.strictEqual(isee.categoria, 'Economica');
      assert.strictEqual(isee.archetipo, 'ANNUALE');
      assert.strictEqual(isee.scope, 'nucleo');

      const firma = Documents.find(d => d.id === 'FIRMA');
      assert.ok(firma);
      assert.strictEqual(firma.archetipo, 'UNICO');
    });
  });

  describe('findDocumentType', () => {
    it('trova il documento per ID costante esatto', () => {
      const doc = findDocumentType('ISEE');
      assert.strictEqual(doc.id, 'ISEE');
      assert.strictEqual(doc.name, 'Attestazione ISEE');
    });

    it('trova il documento per Nome visualizzato esatto', () => {
      const doc = findDocumentType("Carta d'Identità");
      assert.strictEqual(doc.id, 'CARTA_IDENTITA');
    });

    it('trova il documento tramite matching regex su abbreviazioni o testo sporco', () => {
      assert.strictEqual(findDocumentType('c.i. fronte retro').id, 'CARTA_IDENTITA');
      assert.strictEqual(findDocumentType('ricevuta rinnovo pds').id, 'PERMESSO_SOGGIORNO');
      assert.strictEqual(findDocumentType('dichiarazione isee 2024').id, 'ISEE');
      assert.strictEqual(findDocumentType('patente di guida b').id, 'PATENTE');
    });

    it('restituisce il fallback ALTRO in caso di testo non riconosciuto o vuoto', () => {
      const fallback = findDocumentType('qualcosa di totalmente sconosciuto');
      assert.strictEqual(fallback.id, 'ALTRO');
    });
  });

  describe('buildDocumentFileName', () => {
    it('genera correttamente il nome standard per archetipo SCADENZA', () => {
      const name = buildDocumentFileName(
        { tipo: "Carta d'Identità", dataScadenza: '2034-05-15' },
        'Mario Rossi',
        'pdf'
      );
      assert.strictEqual(name, "Carta d'Identità (scad. 2034) - Mario Rossi.pdf");
    });

    it('genera correttamente il nome standard per archetipo ANNUALE', () => {
      const name = buildDocumentFileName(
        { tipo: 'Attestazione ISEE', anno: '2025' },
        'Mario Rossi',
        'pdf'
      );
      assert.strictEqual(name, 'Attestazione ISEE 2025 - Mario Rossi.pdf');
    });

    it('genera correttamente il nome standard per archetipo UNICO (Firma Autografa)', () => {
      const name = buildDocumentFileName(
        { tipo: 'Firma Autografa' },
        'Mario Rossi',
        'png'
      );
      assert.strictEqual(name, 'Firma Autografa - Mario Rossi.png');
    });
  });
});
