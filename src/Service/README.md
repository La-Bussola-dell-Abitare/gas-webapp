# Layer dei Servizi Applicativi (`src/Service`)

## 1. Responsabilità Architetturale

La cartella `src/Service` ospita i servizi specializzati responsabili dell'interazione con l'ecosistema cloud di Google Workspace e l'Intelligenza Artificiale:
- **`GDrive/`**: gestione gerarchica delle cartelle, archiviazione firme autografe, diagnostica e riconciliazione automatica del file system.
- **`Document/`**: intelligenza documentale multimodale con Google Gemini (`gemini-3.8-flash`) e automazione della modulistica ufficiale (Fogli Firme e Diari).
- **`GDocs/`**: servizi specifici per l'interazione con l'API Google Docs.
- **`GSheet/`**: utilità di esportazione e formattazione per Google Sheets.

---

## 2. Panoramica dei Servizi

```mermaid
flowchart TD
    UI["Frontend Web App"] --> Ctrl["Controller Backend"]
    
    subgraph ServiceLayer ["Service Layer (src/Service)"]
        DM["GDrive/DriveManager.js<br/>• Creazione cartelle gerarchiche<br/>• Salvataggio firma PNG trasparente<br/>• Scansione documenti con metadati"]
        DR["GDrive/DriveReconciler.js<br/>• Audit diagnostico anomalie<br/>• Spostamento file fuori posto<br/>• Ridenominazione standard<br/>• Censimento file orfani"]
        DI["Document/DocumentIntelligence.js<br/>• Google Gemini Flash (3.8)<br/>• Vision & OCR multimodale<br/>• Schema JSON forzato<br/>• Smart Form-Filling in 1s"]
    end
    
    Ctrl --> DM
    Ctrl --> DR
    Ctrl --> DI
    
    DM --> GDrive[("Google Drive")]
    DR --> GDrive
    DR --> GSheet[("Google Sheets")]
    DI --> GeminiAPI[("Google Gemini REST API")]
```
