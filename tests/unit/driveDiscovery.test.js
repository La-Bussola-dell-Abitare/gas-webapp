const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('DriveDiscoveryService.js - Discovery e Importazione Nuclei da Google Drive (Drive -> Sheets)', () => {
  before(() => {
    global.Logger = { log: () => {} };
    loadScript('src/Utils/Utils.js');
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
    it('importa transazionalmente i nuclei selezionati chiamando NucleoFamiliare.add, registra beneficiari e documenti e normalizza nome cartella', () => {
      const savedNuclei = [];
      const addedBeneficiari = [];
      const addedDocuments = [];
      const renamedFolders = [];

      global.NucleoFamiliare = {
        generateNextId: () => '14',
        add: (data) => {
          savedNuclei.push(data);
          return { success: true, id: data.id };
        }
      };

      global.BeneficiarioRepository = {
        getAll: () => [],
        add: (data) => { addedBeneficiari.push(data); }
      };

      global.DocumentoRepository = {
        getAll: () => [],
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

      // Verifica salvataggio nucleo tramite NucleoFamiliare.add
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

    it('gestisce in modo idempotente beneficiari e documenti già presenti senza errori né duplicazioni', () => {
      const savedNuclei = [];
      const updatedBeneficiari = [];
      const addedDocuments = [];

      global.NucleoFamiliare = {
        save: (data) => {
          savedNuclei.push(data);
          return { success: true, id: data.id };
        }
      };

      global.BeneficiarioRepository = {
        // Beneficiario già nel foglio con ID nucleo vuoto (caso orfano da import interrotto)
        getAll: () => [
          { nome: 'Mario', cognome: 'Rossi', cf: 'RSSMRA80A01H501Z', idNucleo: '', idCartella: '' }
        ],
        add: (data) => {
          if (data.isUpdate) {
            updatedBeneficiari.push(data);
          }
        }
      };

      global.DocumentoRepository = {
        // Documento con ID Drive doc-isee-1 già esistente
        getAll: () => [
          { id: 1, idDrive: 'doc-isee-1', tipo: 'Attestazione ISEE' }
        ],
        add: (data) => { addedDocuments.push(data); }
      };

      global.DriveApp = {
        getFolderById: () => ({
          getName: () => '14 - Mario Rossi',
          setName: () => {}
        })
      };

      const approvedList = [
        {
          folderId: 'fld-123',
          suggestedData: {
            id: '14',
            nome: 'Mario',
            cognome: 'Rossi',
            cf: 'RSSMRA80A01H501Z'
          },
          members: [
            {
              name: 'Mario Rossi',
              cf: 'RSSMRA80A01H501Z',
              isIntestatario: true,
              folderId: 'fld-sub-mario',
              documents: []
            }
          ],
          rootDocuments: [
            { fileId: 'doc-isee-1', fileName: 'isee.pdf' },
            { fileId: 'doc-nuovo-2', fileName: 'nuovo.pdf', tipo: 'Patente', categoria: 'Identità' }
          ]
        }
      ];

      const res = DriveDiscoveryService.importNuclei(approvedList);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.importedNucleiCount, 1);
      // Il beneficiario già presente è stato aggiornato, non reinserito
      assert.strictEqual(updatedBeneficiari.length, 1);
      assert.strictEqual(updatedBeneficiari[0].idNucleo, '14');
      // doc-isee-1 era già presente, quindi solo doc-nuovo-2 è stato inserito
      assert.strictEqual(addedDocuments.length, 1);
      assert.strictEqual(addedDocuments[0].idDrive, 'doc-nuovo-2');
    });

    it('estrarre con IA i dati anagrafici completi e applica le regole grammaticali Proper Case su beneficiari e documenti', () => {
      // Mock DocumentIntelligence per deepAIScan
      global.DocumentIntelligence = {
        isAvailable: () => true,
        analyzeBlobs: () => ({
          success: true,
          data: {
            tipoDocumento: 'Carta d\'Identità',
            categoria: 'Identità',
            datiPersona: {
              nome: 'GIUSEPPE',
              cognome: 'DE ROSSI',
              codiceFiscale: 'DRSGPP85M01H501K',
              dataNascita: '1985-08-01',
              luogoNascita: 'ROMA RM',
              residenza: 'VIA DEI CONDOTTI 15, 00187 ROMA RM',
              cittadinanza: 'ITALIANA'
            },
            datiDocumento: {
              numeroDocumento: 'CA12345AA',
              dataEmissione: '2020-08-01',
              dataScadenza: '2030-08-01',
              valore: null
            },
            valoreISEE: 9500
          }
        })
      };

      global.CONFIG = { FOLDER_BENEFICIARI_ROOT_ID: 'root-ai' };
      global.NucleoFamiliare = { getAll: () => [] };
      global.BeneficiarioRepository = { getAll: () => [] };

      const folderAI = {
        isTrashed: () => false,
        getId: () => 'fld-giuseppe',
        getName: () => 'giuseppe de rossi',
        getUrl: () => 'https://drive.google.com/fld-giuseppe',
        getFiles: () => {
          let idx = 0;
          const files = [{
            isTrashed: () => false,
            getId: () => 'f-ci-giuseppe',
            getName: () => 'carta identita.pdf',
            getSize: () => 1024,
            getBlob: () => ({})
          }];
          return {
            hasNext: () => idx < files.length,
            next: () => files[idx++]
          };
        },
        getFolders: () => ({ hasNext: () => false, next: () => null })
      };

      let iterIdx = 0;
      global.DriveApp = {
        getFolderById: () => ({
          getFolders: () => ({
            hasNext: () => iterIdx < 1,
            next: () => { iterIdx++; return folderAI; }
          })
        })
      };

      const discoveryRes = DriveDiscoveryService.getUncatalogedDriveNuclei({ deepAIScan: true });
      assert.strictEqual(discoveryRes.success, true);
      assert.strictEqual(discoveryRes.uncatalogedNuclei.length, 1);

      const nG = discoveryRes.uncatalogedNuclei[0];
      // Verifica normalizzazione Proper Case sul nome e cognome
      assert.strictEqual(nG.suggestedData.nome, 'Giuseppe');
      assert.strictEqual(nG.suggestedData.cognome, 'De Rossi');
      assert.strictEqual(nG.suggestedData.cf, 'DRSGPP85M01H501K');
      assert.strictEqual(nG.suggestedData.dataNascita, '1985-08-01');
      assert.strictEqual(nG.suggestedData.luogoNascita, 'Roma (RM)');
      assert.strictEqual(nG.suggestedData.residenza, 'Via dei Condotti 15, 00187 Roma (RM)');
      assert.strictEqual(nG.suggestedData.isee, 9500);

      // Ora importiamo ed esaminiamo la persistenza
      const savedNuclei = [];
      const addedBeneficiari = [];
      const addedDocs = [];

      global.NucleoFamiliare.save = (data) => { savedNuclei.push(data); return { id: data.id }; };
      global.BeneficiarioRepository.add = (data) => { addedBeneficiari.push(data); };
      global.DocumentoRepository = { getAll: () => [], add: (data) => { addedDocs.push(data); } };
      global.DriveApp.getFolderById = () => ({
        getName: () => 'giuseppe de rossi',
        setName: () => {}
      });

      const importRes = DriveDiscoveryService.importNuclei([nG]);
      assert.strictEqual(importRes.success, true);
      assert.strictEqual(importRes.importedNucleiCount, 1);
      assert.strictEqual(importRes.importedBeneficiariCount, 1);
      assert.strictEqual(importRes.importedDocumentsCount, 1);

      // Beneficiario ha tutti i campi anagrafici e Proper Case
      assert.strictEqual(addedBeneficiari[0].nome, 'Giuseppe');
      assert.strictEqual(addedBeneficiari[0].cognome, 'De Rossi');
      assert.strictEqual(addedBeneficiari[0].cf, 'DRSGPP85M01H501K');
      assert.strictEqual(addedBeneficiari[0].dataNascita, '1985-08-01');
      assert.strictEqual(addedBeneficiari[0].luogoNascita, 'Roma (RM)');
      assert.strictEqual(addedBeneficiari[0].residenza, 'Via dei Condotti 15, 00187 Roma (RM)');

      // Documento ha scadenza, emissione e note collegate
      assert.strictEqual(addedDocs[0].dataEmissione, '2020-08-01');
      assert.strictEqual(addedDocs[0].dataScadenza, '2030-08-01');
      assert.strictEqual(addedDocs[0].note, 'Doc n. CA12345AA');
    });
  });
});
