# Drohnenverwaltung

Drohnen und Zubehör werden an Schülergruppen ausgeliehen, und bisher ist ein Zettel an der Schranktür die einzige Aufzeichnung. Diese Anwendung ersetzt den Zettel: Sie zeigt, welche Drohnen verfügbar sind, wer was ausgeliehen hat und welche Ausleihen es früher gab.

Schulprojekt im Fach SYP, 4. INF, 2026/27, von Gschwendtner und Sonnleitner. Betreuung: DI (FH) Markus Falkensteiner.

## Stand

Die Anwendung ist noch in Arbeit und kann fachlich noch nichts. Fertig sind die Grundlagen: API-Grundgerüst, Datenbank mit Migrationen und Testprojekt. Das Frontend zeigt noch die Angular-Startseite.

Der aktuelle Fortschritt steht in [tasks.md](openspec/changes/initial-drone-lending-system/tasks.md) und im [GitHub Project](https://github.com/users/AntonGschwendtner/projects/4).

## Geplanter Funktionsumfang

- Drohnen anlegen und mit ihrem Status anzeigen. Der Status „Available“ oder „Loaned“ ergibt sich aus der aktiven Ausleihe und wird nie eingegeben.
- Schülergruppen anlegen und anzeigen.
- Eine verfügbare Drohne an eine Gruppe ausleihen, mit Akkus und Propellern als Mengenangabe.
- Eine zweite aktive Ausleihe derselben Drohne und ungültige Mengen ablehnen.
- Aktive Ausleihen anzeigen und zurückgeben. Das Rückgabedatum setzt das System.
- Zurückgegebene Ausleihen dauerhaft als Historie behalten.

Nicht geplant sind Login und Rollen, einzeln erfasste Akkus, Reservierungen, Schadensverwaltung und Auswertungen.

## Technik

```text
Angular-Frontend (frontend/drone-inventory-ui)
    |
    | REST/JSON
    v
ASP.NET Core 10 Web API (backend/DroneInventory.Api)
    |
    v
Entity Framework Core mit SQLite
```

Die Regeln und die Validierung liegen im Backend. Das Frontend greift nie direkt auf die Datenbank zu.

## Starten

Getestet mit .NET SDK 10.0.402, Node.js 26.8.2 und npm 11.19.1.

**Backend** (läuft auf http://localhost:5067):

```powershell
dotnet run --project backend/DroneInventory.Api --launch-profile http
```

Beim ersten Start entsteht die Datenbank `backend/DroneInventory.Api/droneinventory.db`. Sie kommt nicht ins Repository. Die API-Beschreibung steht unter http://localhost:5067/openapi/v1.json.

**Frontend** (läuft auf http://localhost:4200):

```powershell
cd frontend/drone-inventory-ui
npm install
npm start
```

Frontend und Backend sind noch nicht verbunden. Das folgt mit Task 5.1.

## Testen

```powershell
dotnet test backend/DroneInventory.Api.Tests
```

```powershell
cd frontend/drone-inventory-ui
npm test -- --watch=false
```

Die Backend-Tests starten die API mit einer eigenen Datenbank im Arbeitsspeicher und dem festen Datum 19.08.2026. Sie verändern die lokale Datenbank nicht.

Für neue Migrationen wird das Werkzeug `dotnet-ef` gebraucht. Das Einrichten funktioniert nur im Ordner `backend`:

```powershell
cd backend
dotnet tool restore
```

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Anforderungen REQ-001 bis REQ-010 mit Szenarien |
| [docs/domain-model.md](docs/domain-model.md) | Begriffe und Datenmodell |
| [proposal.md](openspec/changes/initial-drone-lending-system/proposal.md) | Warum es die Änderung gibt und was dazugehört |
| [design.md](openspec/changes/initial-drone-lending-system/design.md) | Technische Entscheidungen und geplante REST-API |
| [tasks.md](openspec/changes/initial-drone-lending-system/tasks.md) | Alle Tasks mit Anforderung und Issue |
| [AGENTS.md](AGENTS.md) | Regeln für die Arbeit im Projekt |

## Arbeitsweise

Das Projekt wird KI-gestützt mit Claude Code und spezifikationsgetrieben mit [OpenSpec](https://github.com/Fission-AI/OpenSpec) entwickelt. Jede Änderung lässt sich so zurückverfolgen:

```text
Anforderung -> Spec -> Task -> Issue -> Branch -> Pull Request -> Code und Tests
```

- Pro Task gibt es ein Issue, einen Branch `feature/<issue>-<name>` und einen Pull Request.
- Jeder Pull Request wird vor dem Merge gegen die Spec geprüft. Dieses Review macht derzeit eine KI und steht als gekennzeichneter Kommentar im Pull Request.
- Eine Verhaltensänderung beginnt immer in der Spec.
