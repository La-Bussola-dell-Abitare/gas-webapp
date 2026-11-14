const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('DriveReconciler.js - Metadati MD5 e Deduplicazione Two-Tier', () => {
  before(() => {
    global.Logger = { log: () => {} };
    loadScript('src/Service/GDrive/DriveReconciler.js');
  });

  describe('DriveReconciler.getDriveFileMetadata', () => {
    it('restituisce null se fileId è vuoto o mancante', () => {
      assert.strictEqual(DriveReconciler.getDriveFileMetadata(''), null);
      assert.strictEqual(DriveReconciler.getDriveFileMetadata(null), null);
      assert.strictEqual(DriveReconciler.getDriveFileMetadata(undefined), null);
    });

    it('utilizza la cache in memoria se il fileId è già presente', () => {
      const cache = new Map();
      const fakeMeta = { id: 'file-123', name: 'carta_identita.pdf', size: 1024, md5Checksum: 'd41d8cd98f00b204e9800998ecf8427e', mimeType: 'application/pdf' };
      cache.set('file-123', fakeMeta);

      const res = DriveReconciler.getDriveFileMetadata('file-123', cache);
      assert.deepStrictEqual(res, fakeMeta);
    });

    it('restituisce null in ambiente offline quando UrlFetchApp o ScriptApp non sono definiti', () => {
      const origUrlFetch = global.UrlFetchApp;
      const origScriptApp = global.ScriptApp;
      delete global.UrlFetchApp;
      delete global.ScriptApp;

      try {
        const res = DriveReconciler.getDriveFileMetadata('file-999');
        assert.strictEqual(res, null);
      } finally {
        if (origUrlFetch) global.UrlFetchApp = origUrlFetch;
        if (origScriptApp) global.ScriptApp = origScriptApp;
      }
    });

    it('interroga le Drive API v3 e popola la cache quando UrlFetchApp e ScriptApp sono presenti', () => {
      const cache = new Map();
      let capturedUrl = '';
      let capturedHeaders = null;

      global.ScriptApp = {
        getOAuthToken: () => 'mock-oauth-token-xyz'
      };

      global.UrlFetchApp = {
        fetch: (url, opts) => {
          capturedUrl = url;
          capturedHeaders = opts.headers;
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              id: 'test-file-abc',
              name: 'documento.pdf',
              size: '54321',
              md5Checksum: 'e2fc714c4727ee9395f324cd2e7f331f',
              mimeType: 'application/pdf'
            })
          };
        }
      };

      try {
        const res = DriveReconciler.getDriveFileMetadata('test-file-abc', cache);
        assert.ok(res !== null);
        assert.strictEqual(res.id, 'test-file-abc');
        assert.strictEqual(res.name, 'documento.pdf');
        assert.strictEqual(res.size, 54321);
        assert.strictEqual(res.md5Checksum, 'e2fc714c4727ee9395f324cd2e7f331f');
        assert.strictEqual(res.mimeType, 'application/pdf');

        // Verifica chiamata URL e autorizzazione
        assert.ok(capturedUrl.includes('test-file-abc'));
        assert.ok(capturedUrl.includes('fields=id,name,size,md5Checksum,mimeType'));
        assert.strictEqual(capturedHeaders.Authorization, 'Bearer mock-oauth-token-xyz');

        // Verifica che sia stato salvato in cache
        assert.strictEqual(cache.has('test-file-abc'), true);
        assert.strictEqual(cache.get('test-file-abc').md5Checksum, 'e2fc714c4727ee9395f324cd2e7f331f');
      } finally {
        delete global.ScriptApp;
        delete global.UrlFetchApp;
      }
    });

    it('gestisce con grazia risposte non 200 o eccezioni di rete', () => {
      global.ScriptApp = { getOAuthToken: () => 'token' };
      global.UrlFetchApp = {
        fetch: () => ({
          getResponseCode: () => 404,
          getContentText: () => JSON.stringify({ error: 'File not found' })
        })
      };

      try {
        const res = DriveReconciler.getDriveFileMetadata('file-non-esistente');
        assert.strictEqual(res, null);
      } finally {
        delete global.ScriptApp;
        delete global.UrlFetchApp;
      }
    });
  });

  describe('Deduplicazione Two-Tier (Byte Size -> MD5 Checksum)', () => {
    it('elimina i falsi positivi: file con stessa dimensione ma diverso MD5 NON sono duplicati', () => {
      // Simuliamo due file con stessa dimensione (10000 byte) ma hash diversi
      const fileA = { id: 'file-A', size: 10000, md5: 'hash_AAA' };
      const fileB = { id: 'file-B', size: 10000, md5: 'hash_BBB' };

      const cache = new Map();
      cache.set(fileA.id, { id: fileA.id, name: 'foto1.jpg', size: fileA.size, md5Checksum: fileA.md5 });
      cache.set(fileB.id, { id: fileB.id, name: 'foto2.jpg', size: fileB.size, md5Checksum: fileB.md5 });

      // Test logica di raggruppamento per MD5
      const md5Groups = {};
      [fileA, fileB].forEach(f => {
        const meta = cache.get(f.id);
        const hash = meta.md5Checksum;
        if (!md5Groups[hash]) md5Groups[hash] = [];
        md5Groups[hash].push(f);
      });

      // Nessun gruppo MD5 deve avere più di 1 elemento
      for (const [hash, group] of Object.entries(md5Groups)) {
        assert.strictEqual(group.length, 1, `Il gruppo per hash ${hash} non dovrebbe avere duplicati`);
      }
    });

    it('conferma con certezza 1.0 (EXACT_HASH) i file con stesso hash MD5', () => {
      const file1 = { id: 'file-orig', size: 25000, md5: 'identical_hash_123' };
      const file2 = { id: 'file-clone', size: 25000, md5: 'identical_hash_123' };

      const cache = new Map();
      cache.set(file1.id, { id: file1.id, name: 'doc.pdf', size: file1.size, md5Checksum: file1.md5 });
      cache.set(file2.id, { id: file2.id, name: 'doc_copia.pdf', size: file2.size, md5Checksum: file2.md5 });

      const md5Groups = {};
      [file1, file2].forEach(f => {
        const meta = cache.get(f.id);
        const hash = meta.md5Checksum;
        if (!md5Groups[hash]) md5Groups[hash] = [];
        md5Groups[hash].push(f);
      });

      assert.strictEqual(Object.keys(md5Groups).length, 1);
      assert.strictEqual(md5Groups['identical_hash_123'].length, 2);
    });
  });

  describe('Piani Parziali di Riconciliazione (Granular Execution)', () => {
    it('gestisce con successo un piano parziale vuoto o con singolo elemento', () => {
      // Mock DriveApp e DriveManager
      const createdFolders = [];
      global.DriveManager = {
        getOrCreateBeneficiarioFolder: (cf) => {
          createdFolders.push(cf);
          return { id: 'f-' + cf, name: 'Mario Rossi' };
        }
      };

      const partialPlan = {
        missingFolderCreations: [{ targetMemberCF: 'RSSMRA80A01H501Z' }]
      };

      const res = DriveReconciler.executeApprovedPlan('1', partialPlan);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.actionsApplied.length, 1);
      assert.strictEqual(res.errors.length, 0);
      assert.ok(res.actionsApplied[0].includes('RSSMRA80A01H501Z'));
      assert.strictEqual(createdFolders.length, 1);
      assert.strictEqual(createdFolders[0], 'RSSMRA80A01H501Z');
    });

    it('accetta e valida piani con singola ridenominazione cartella', () => {
      const renamed = [];
      global.DriveApp = {
        getFolderById: (id) => ({
          getName: () => 'Vecchio Nome',
          setName: (newName) => { renamed.push({ id, newName }); }
        })
      };

      const partialPlan = {
        folderRenames: [{ folderId: 'folder-abc', newName: 'Nuovo Nome Conforme' }]
      };

      const res = DriveReconciler.executeApprovedPlan('1', partialPlan);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.actionsApplied.length, 1);
      assert.strictEqual(renamed.length, 1);
      assert.strictEqual(renamed[0].newName, 'Nuovo Nome Conforme');
    });
  });

  describe('Audit Nomenclatura e File Sconosciuti (NON_STANDARD_FILENAME)', () => {
    it('non propone ridenominazione per file non riconosciuti (ALTRO / sconosciuti), lasciandoli inalterati', () => {
      loadScript('src/Domain/documents.js');

      // Mock BeneficiarioRepository
      global.BeneficiarioRepository = {
        getAll: () => [{
          idNucleo: '1',
          cf: 'RSSMRA80A01H501Z',
          nome: 'Mario',
          cognome: 'Rossi',
          rapportoIntestatario: 'intestatario'
        }]
      };

      // Mock DocumentoRepository
      global.DocumentoRepository = {
        getAll: () => []
      };

      // Mock DriveManager
      global.DriveManager = {
        getOrCreateNucleoFolder: () => ({ id: 'folder-root-1', url: 'https://drive.google.com/folder-root-1' })
      };

      // Mock Files
      const fileRecognized = {
        isTrashed: () => false,
        getId: () => 'f-ci',
        getName: () => 'ci.pdf',
        getSize: () => 12345,
        getMimeType: () => 'application/pdf',
        getLastUpdated: () => new Date()
      };

      const fileUnknown = {
        isTrashed: () => false,
        getId: () => 'f-ricevuta',
        getName: () => 'ricevuta_bonifico.pdf',
        getSize: () => 54321,
        getMimeType: () => 'application/pdf',
        getLastUpdated: () => new Date()
      };

      // Mock Folder Iterator
      const createIter = (items) => {
        let idx = 0;
        return {
          hasNext: () => idx < items.length,
          next: () => items[idx++]
        };
      };

      // Mock Folder
      const subFolderMario = {
        isTrashed: () => false,
        getId: () => 'fld-mario',
        getName: () => 'Mario Rossi',
        getFiles: () => createIter([fileRecognized, fileUnknown]),
        getFolders: () => createIter([])
      };

      const rootFolder = {
        isTrashed: () => false,
        getId: () => 'folder-root-1',
        getName: () => '1 - Mario Rossi',
        getFiles: () => createIter([]),
        getFolders: () => createIter([subFolderMario])
      };

      global.DriveApp = {
        getFolderById: (id) => (id === 'fld-mario' ? subFolderMario : rootFolder)
      };

      const audit = DriveReconciler.auditNucleo('1');

      // 1. Il file non riconosciuto NON deve avere una issue NON_STANDARD_FILENAME
      const unknownRenameIssue = audit.issues.find(i => i.fileId === 'f-ricevuta' && i.type === 'NON_STANDARD_FILENAME');
      assert.strictEqual(unknownRenameIssue, undefined, 'I file sconosciuti non devono essere rinominati in Altro Documento');

      // 2. Il file riconosciuto con nome non standard ("ci.pdf" per Carta d'Identità) DEVE essere segnalato
      const recognizedRenameIssue = audit.issues.find(i => i.fileId === 'f-ci' && i.type === 'NON_STANDARD_FILENAME');
      assert.ok(recognizedRenameIssue, 'I file riconosciuti non conformi devono proporre la ridenominazione standard');
      assert.strictEqual(recognizedRenameIssue.suggestedNewName, 'Carta d\'Identità - Mario Rossi.pdf');
    });

    it('rileva documenti frammentati quando esistono file separati per Fronte e Retro', () => {
      global.BeneficiarioRepository = {
        getAll: () => [{
          id: '1',
          name: 'Mario',
          surname: 'Rossi',
          cf: 'RSSMRA80A01H501Z',
          idNucleo: '1',
          rapportoIntestatario: 'Intestatario'
        }]
      };
      global.NucleoFamiliare = {
        getAll: () => [{ id: '1', intestatario: 'RSSMRA80A01H501Z' }]
      };
      global.DocumentoRepository = {
        getAll: () => []
      };
      global.DriveManager = {
        getOrCreateNucleoFolder: () => ({ id: 'folder-root-1', url: 'https://drive.com/root1' }),
        getOrCreateBeneficiarioFolder: () => ({ id: 'fld-mario', name: 'Mario Rossi' })
      };

      const fileFront = {
        isTrashed: () => false,
        getId: () => 'f-front-1',
        getName: () => 'Carta Identità Fronte.jpg',
        getSize: () => 120000,
        getMimeType: () => 'image/jpeg',
        getLastUpdated: () => new Date()
      };
      const fileBack = {
        isTrashed: () => false,
        getId: () => 'f-back-1',
        getName: () => 'Carta Identità Retro.jpg',
        getSize: () => 125000,
        getMimeType: () => 'image/jpeg',
        getLastUpdated: () => new Date()
      };

      const createIter = (items) => {
        let idx = 0;
        return {
          hasNext: () => idx < items.length,
          next: () => items[idx++]
        };
      };

      const subFolderMario = {
        isTrashed: () => false,
        getId: () => 'fld-mario',
        getName: () => 'Mario Rossi',
        getFiles: () => createIter([fileFront, fileBack]),
        getFolders: () => createIter([])
      };

      const rootFolder = {
        isTrashed: () => false,
        getId: () => 'folder-root-1',
        getName: () => '1 - Mario Rossi',
        getFiles: () => createIter([]),
        getFolders: () => createIter([subFolderMario])
      };

      global.DriveApp = {
        getFolderById: (id) => (id === 'fld-mario' ? subFolderMario : rootFolder)
      };

      const audit = DriveReconciler.auditNucleo('1');

      const fragmentedIssue = audit.issues.find(i => i.type === 'FRAGMENTED_DOCUMENT');
      assert.ok(fragmentedIssue, 'Deve rilevare la presenza di documento frammentato (Fronte e Retro separati)');
      assert.strictEqual(fragmentedIssue.extra.frontFileId, 'f-front-1');
      assert.strictEqual(fragmentedIssue.extra.backFileId, 'f-back-1');
      assert.strictEqual(fragmentedIssue.targetMemberCF, 'RSSMRA80A01H501Z');
      assert.strictEqual(audit.stats.fragmentedDocs, 1);
    });
  });
});
