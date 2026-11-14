const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('DriveDiscoveryService.js - Discovery e Importazione Nuclei da Google Drive (Drive -> Sheets)', () => {
  before(() => {
    global.Logger = { log: () => {} };
    loadScript('src/Domain/documents.js');
    loadScript('src/Service/GDrive/DriveDiscoveryService.js');
  });

  describe('DriveDiscoveryService.getUncatalogedDriveNuclei', () => {
    it('rileva correttamente le cartelle non catalogate e scarta quelle già censite o di sistema', () => {
      // Mock CONFIG
      global.CONFIG = {
        FOLDER_BENEFICIARI_ROOT_ID: 'root-beneficiari-123'
      };

      // Mock NucleoFamiliare (Nucleo #1 e #3 già censiti)
      global.NucleoFamiliare = {
        getAll: () => [
          { id: '1', intestatario: 'Mario Rossi', idCartella: 'fld-nucleo-1' },
          { id: '3', intestatario: 'Lorenzo Mazza', idCartella: 'fld-nucleo-3' }
        ]
      };

      // Mock BeneficiarioRepository
      global.BeneficiarioRepository = {
        getAll: () => [
          { nome: 'Mario', cognome: 'Rossi', cf: 'RSSMRA80A01H501Z', idCartella: 'fld-sub-mario' }
        ]
      };

      // Creazione mock cartelle Drive
      const folderCataloged1 = {
        isTrashed: () => false,
        getId: () => 'fld-nucleo-1',
        getName: () => '1 - Mario Rossi',
        getUrl: () => 'https://drive.google.com/fld-nucleo-1',
        getFiles: () => ({ hasNext: () => false, next: () => null }),
        getFolders: () => ({ hasNext: () => false, next: () => null })
      };

      const folderSystem = {
        isTrashed: () => false,
        getId: () => 'fld-archivio',
        getName: () => '_Archivio',
        getUrl: () => 'https://drive.google.com/fld-archivio',
        getFiles: () => ({ hasNext: () => false, next: () => null }),
        getFolders: () => ({ hasNext: () => false, next: () => null })
      };

      // Cartella non catalogata con ID esplicito "12 - Famiglia Rossi"
      const subFolderFranco = {
        isTrashed: () => false,
        getId: () => 'fld-sub-franco',
        getName: () => 'Franco Rossi',
        getFiles: () => {
          let idx = 0;
          const files = [{
            isTrashed: () => false,
            getId: () => 'f-ci-franco',
            getName: () => 'Carta Identita RSSFNC75A01H501U.pdf',
            getSize: () => 1024
          }];
          return {
            hasNext: () => idx < files.length,
            next: () => files[idx++]
          };
        }
      };

      const folderUncataloged12 = {
        isTrashed: () => false,
        getId: () => 'fld-nucleo-12',
        getName: () => '12 - Famiglia Rossi',
        getUrl: () => 'https://drive.google.com/fld-nucleo-12',
        getFiles: () => {
          let idx = 0;
          const rFiles = [{
            isTrashed: () => false,
            getId: () => 'f-isee-12',
            getName: () => 'Attestazione ISEE 2026.pdf',
            getSize: () => 2048
          }];
          return {
            hasNext: () => idx < rFiles.length,
            next: () => rFiles[idx++]
          };
        },
        getFolders: () => {
          let idx = 0;
          const sub = [subFolderFranco];
          return {
            hasNext: () => idx < sub.length,
            next: () => sub[idx++]
          };
        }
      };

      // Cartella non catalogata senza ID prefisso "Ahmed Mansour"
      const folderUncatalogedAhmed = {
        isTrashed: () => false,
        getId: () => 'fld-ahmed',
        getName: () => 'Ahmed Mansour',
        getUrl: () => 'https://drive.google.com/fld-ahmed',
        getFiles: () => ({ hasNext: () => false, next: () => null }),
        getFolders: () => ({ hasNext: () => false, next: () => null })
      };

      const allDriveFolders = [folderCataloged1, folderSystem, folderUncataloged12, folderUncatalogedAhmed];
      let rootIterIdx = 0;

      global.DriveApp = {
        getFolderById: (id) => ({
          getFolders: () => ({
            hasNext: () => rootIterIdx < allDriveFolders.length,
            next: () => allDriveFolders[rootIterIdx++]
          })
        })
      };

      const res = DriveDiscoveryService.getUncatalogedDriveNuclei();

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.totalDriveFolders, 4);
      assert.strictEqual(res.catalogedFolders, 1); // solo folderCataloged1
      assert.strictEqual(res.uncatalogedNuclei.length, 2); // 12 e Ahmed

      // Verifica nucleo #12
      const n12 = res.uncatalogedNuclei.find(n => n.folderId === 'fld-nucleo-12');
      assert.ok(n12);
      assert.strictEqual(n12.detectedId, '12');
      assert.strictEqual(n12.suggestedId, '12');
      assert.strictEqual(n12.members.length, 1);
      assert.strictEqual(n12.members[0].name, 'Franco Rossi');
      assert.strictEqual(n12.members[0].cf, 'RSSFNC75A01H501U');
      assert.strictEqual(n12.rootDocuments.length, 1);
      assert.strictEqual(n12.rootDocuments[0].tipo, 'Attestazione ISEE');

      // Verifica nucleo Ahmed (senza ID prefisso)
      const nAhmed = res.uncatalogedNuclei.find(n => n.folderId === 'fld-ahmed');
      assert.ok(nAhmed);
      assert.strictEqual(nAhmed.detectedId, null);
      assert.strictEqual(nAhmed.suggestedData.nome, 'Ahmed');
      assert.strictEqual(nAhmed.suggestedData.cognome, 'Mansour');
    });
  });

  describe('DriveDiscoveryService.importNuclei', () => {
    it('importa transazionalmente i nuclei selezionati, registra beneficiari e documenti e normalizza nome cartella', () => {
      const savedNuclei = [];
      const addedBeneficiari = [];
      const addedDocuments = [];
      const renamedFolders = [];

      global.NucleoFamiliare = {
        generateNextId: () => '14',
        save: (data) => { savedNuclei.push(data); }
      };

      global.BeneficiarioRepository = {
        add: (data) => { addedBeneficiari.push(data); }
      };

      global.DocumentoRepository = {
        add: (data) => { addedDocuments.push(data); }
      };

      global.DriveApp = {
        getFolderById: (id) => ({
          getName: () => 'Mario Rossi', // nome originale senza ID
          setName: (newName) => { renamedFolders.push({ id, newName }); }
        })
      };

      global.LockService = {
        getScriptLock: () => ({
          waitLock: () => {},
          releaseLock: () => {}
        })
      };

      const approvedList = [
        {
          folderId: 'fld-123',
          folderName: 'Mario Rossi',
          suggestedData: {
            id: '14',
            nome: 'Mario',
            cognome: 'Rossi',
            cf: 'RSSMRA80A01H501Z',
            residenza: 'Via Roma 10'
          },
          members: [
            {
              name: 'Mario Rossi',
              cf: 'RSSMRA80A01H501Z',
              isIntestatario: true,
              folderId: 'fld-sub-mario',
              documents: [
                { fileId: 'doc-ci-1', fileName: 'ci.pdf', tipo: 'Carta d\'Identità', categoria: 'Identità' }
              ]
            },
            {
              name: 'Anna Bianchi',
              cf: 'BNCNNA85B41H501X',
              isIntestatario: false,
              folderId: 'fld-sub-anna',
              documents: []
            }
          ],
          rootDocuments: [
            { fileId: 'doc-isee-1', fileName: 'isee.pdf', tipo: 'Attestazione ISEE', categoria: 'Economica' }
          ]
        }
      ];

      const res = DriveDiscoveryService.importNuclei(approvedList);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.importedNucleiCount, 1);
      assert.strictEqual(res.importedBeneficiariCount, 2);
      assert.strictEqual(res.importedDocumentsCount, 2);

      // Verifica salvataggio nucleo
      assert.strictEqual(savedNuclei.length, 1);
      assert.strictEqual(savedNuclei[0].id, '14');
      assert.strictEqual(savedNuclei[0].intestatario, 'RSSMRA80A01H501Z');
      assert.strictEqual(savedNuclei[0].idCartella, 'fld-123');

      // Verifica salvataggio beneficiari
      assert.strictEqual(addedBeneficiari.length, 2);
      assert.strictEqual(addedBeneficiari[0].nome, 'Mario');
      assert.strictEqual(addedBeneficiari[0].cognome, 'Rossi');
      assert.strictEqual(addedBeneficiari[0].rapportoIntestatario, 'Intestatario');
      assert.strictEqual(addedBeneficiari[1].nome, 'Anna');
      assert.strictEqual(addedBeneficiari[1].cognome, 'Bianchi');
      assert.strictEqual(addedBeneficiari[1].rapportoIntestatario, 'Convivente');

      // Verifica documenti
      assert.strictEqual(addedDocuments.length, 2);
      assert.strictEqual(addedDocuments[0].idDrive, 'doc-isee-1');
      assert.strictEqual(addedDocuments[1].idDrive, 'doc-ci-1');

      // Verifica ridenominazione cartella Drive in formato canonico '14 - Mario Rossi'
      assert.strictEqual(renamedFolders.length, 1);
      assert.strictEqual(renamedFolders[0].newName, '14 - Mario Rossi');
    });
  });
});
