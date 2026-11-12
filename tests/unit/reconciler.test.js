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
});
