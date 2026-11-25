# Drohnenverwaltung

Drohnen und Zubehör werden an Schülergruppen ausgeliehen, und bisher ist ein Zettel an der Schranktür die einzige Aufzeichnung. Diese Anwendung ersetzt den Zettel: Sie zeigt, welche Drohnen verfügbar sind, wer was ausgeliehen hat und welche Ausleihen es früher gab.

Schulprojekt im Fach SYP, 4. INF, 2026/27, von Gschwendtner und Sonnleitner. Betreuung: DI (FH) Markus Falkensteiner.

## Funktionsumfang

- Drohnen anlegen und mit ihrem Status anzeigen. Der Status „Available“ oder „Loaned“ ergibt sich aus der aktiven Ausleihe und wird nie eingegeben.
- Schülergruppen anlegen und anzeigen.
- Die Personen einer Gruppe festhalten: Der Knopf „Mitglieder“ in der Gruppenliste zeigt die Namen, dort werden Mitglieder hinzugefügt und entfernt und ein Gruppenleiter bestimmt. Die Liste zeigt den Gruppenleiter, die Suche findet Gruppen auch über Mitglieder, die Detailseite listet alle Mitglieder. Gespeichert wird nur der Name.
- Drohnen und Schülergruppen direkt in der Liste bearbeiten. Eine Drohne lässt sich nur löschen, solange sie nie ausgeliehen war.
- Schülergruppen löschen, auch mit Ausleihen: „Löschen“ verschiebt die Gruppe in den **Papierkorb** unter der Gruppenliste. Dort lässt sie sich wiederherstellen oder endgültig löschen, wahlweise mit „Historie behalten“ (die Ausleihen bleiben unter dem Gruppennamen) oder „Auch die Historie löschen“. Eine Gruppe, die gerade eine Drohne hat, muss sie zuerst zurückgeben.
- Eine verfügbare Drohne an eine Gruppe ausleihen, mit Akkus und Propellern als Mengenangabe.
- Eine zweite aktive Ausleihe derselben Drohne und ungültige Mengen ablehnen, auch wenn zwei Anfragen gleichzeitig kommen.
- Aktive Ausleihen anzeigen und zurückgeben. Ausleih- und Rückgabedatum setzt das System.
- Zurückgegebene Ausleihen dauerhaft als Historie behalten.
- Listen durchsuchen: Drohnen nach Name und Status, Schülergruppen nach Name, die Historie nach Drohne oder Gruppe.
- Listen per Klick auf den Spaltenkopf sortieren, ein zweiter Klick dreht die Reihenfolge um.
- Eine Detailseite pro Drohne und pro Schülergruppe mit aktiver Ausleihe und allen früheren Ausleihen. Die Namen in den Listen führen dorthin.
- Bei jeder aktiven Ausleihe anzeigen, seit wie vielen Tagen sie läuft. Ausleihen über 7 Tage werden als „Long loan“ markiert.
- Vor der Rückgabe in einem Dialog mit Drohne und Gruppe nachfragen.
- Bei der Rückgabe die zurückgegebenen Akkus und Propeller erfassen. Fehlteile stehen danach in der Historie.
- Einen Schaden melden, bei der Rückgabe oder jederzeit auf der Drohnenseite. Eine defekte Drohne hat den Status „Defective“ und lässt sich erst nach „Repaired“ wieder ausleihen.
- Beim Ausleihen eine Notiz (zum Beispiel das Projekt) und ein geplantes Rückgabedatum angeben. Ist das Datum vorbei, wird die Ausleihe als „Overdue“ markiert. Mit geplantem Datum ersetzt das die 7-Tage-Markierung.
- Über der Drohnenliste zählen, wie viele Drohnen es gibt und wie viele davon verfügbar und ausgeliehen sind.
- Die ganze Anwendung als ein Docker-Container `drohnenverwaltung` starten, mit dauerhafter Datenbank im Volume.

Nicht enthalten sind Login und Rollen sowie einzeln erfasste Akkus. Sie können später als eigener Change Request folgen.

Die Changes `initial-drone-lending-system`, `improve-lending-overview`, `manage-drones-and-groups`, `drone-and-group-details`, `loan-notes-and-due-dates`, `return-check-and-damage`, `student-group-members`, `docker-container` und `student-group-trash` sind abgeschlossen und archiviert. Die geltenden Anforderungen stehen in [openspec/specs](openspec/specs), die erledigten Aufgaben im [GitHub Project](https://github.com/users/AntonGschwendtner/projects/4).

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

Die Regeln und die Validierung liegen im Backend. Das Frontend zeigt die Meldungen des Backends an und greift nie direkt auf die Datenbank zu.

## Starten

Getestet mit .NET SDK 10.0.402, Node.js 26.8.2 und npm 11.19.1. Backend und Frontend laufen in zwei Terminals.

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

Das Frontend leitet alle Anfragen an `/api` an das Backend weiter (`proxy.conf.json`). Dafür muss das Backend laufen. Danach http://localhost:4200 im Browser öffnen. Oben rechts lässt sich zwischen Deutsch und Englisch sowie zwischen hellem und dunklem Modus wechseln. Die Meldungen des Backends kommen in der gewählten Sprache.

### Mit Docker starten

Ohne .NET und Node.js geht es auch mit Docker. Frontend und Backend laufen dann zusammen in einem Container `drohnenverwaltung`. Docker Desktop muss laufen.

```powershell
docker compose up --build -d
```

Danach http://localhost:8080 öffnen. Das Backend liefert die App und die REST-API unter derselben Adresse aus, Seiten wie `/drones/7` und die Links aus den QR-Codes (`/loans?drone=7`) öffnen direkt die richtige Seite. Beim ersten Start ist die Datenbank leer.

- Die Datenbank liegt im Docker-Volume `drohnenverwaltung-data`. Sie bleibt bei `docker compose down`, beim Neustart und bei einem neuen Image erhalten. Erst `docker compose down -v` löscht sie.
- Nach Änderungen am Code baut `docker compose up --build -d` das Image neu.
- Mit `docker compose logs -f` siehst du die Ausgabe des Backends, mit `docker compose down` hältst du den Container an.
- **QR-Codes mit dem Handy:** Das Handy muss im selben WLAN sein und die App über die Adresse des PCs erreichen, zum Beispiel http://192.168.0.15:8080 (die eigene Adresse zeigt `ipconfig`). Die App am PC über diese Adresse öffnen, dann enthalten die QR-Etiketten einen Link, den das Handy erreicht. Eventuell muss die Windows-Firewall Port 8080 erlauben.

Die Docker-Variante nutzt eine eigene Datenbank, nicht `backend/DroneInventory.Api/droneinventory.db`.

## Bedienung am Beispiel

So läuft das Prüfbeispiel aus [docs/requirements.md](docs/requirements.md) durch:

1. **Drones:** Drohne `TELLO-07` mit der Beschreibung `SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt` anlegen. Sie erscheint mit dem Status `Available`, die Übersicht oben zählt 1 Drohne, 1 verfügbar.
2. **Student groups:** Gruppe `Group 3` anlegen.
3. **Loans:** `TELLO-07` an `Group 3` mit 4 Akkus und 8 Propellern ausleihen. Die Ausleihe erscheint unter „Active loans“ mit dem heutigen Datum und „0 days“, unter „Drones“ steht `TELLO-07` jetzt auf `Loaned`.
4. **Loans:** Dieselbe Drohne noch einmal ausleihen. Das wird abgelehnt: „The drone "TELLO-07" is already loaned.“
5. **Loans:** Bei der Ausleihe auf `Return` klicken. Ein Dialog fragt „Return TELLO-07?“ und nennt `Group 3`. Mit `Cancel` bleibt alles, wie es ist. Nach `Return` verschwindet sie aus den aktiven Ausleihen, und `TELLO-07` ist wieder `Available`.
6. **Loan history:** Die Ausleihe steht dort mit 4 Akkus, 8 Propellern, Ausleih- und Rückgabedatum. Die Suche `group` findet sie, `xyz` zeigt „No loan matches the search.“

## Testen

```powershell
dotnet test backend/DroneInventory.Api.Tests
```

```powershell
cd frontend/drone-inventory-ui
npm test -- --watch=false
```

Die Backend-Tests prüfen jedes Szenario der Specs über die HTTP-API. Sie starten die API mit einer eigenen Datenbank im Arbeitsspeicher und dem festen Datum 19.08.2026 und verändern die lokale Datenbank nicht. Die Frontend-Tests prüfen die Ansichten gegen ein simuliertes Backend.

Für neue Migrationen wird das Werkzeug `dotnet-ef` gebraucht. Das Einrichten funktioniert nur im Ordner `backend`:

```powershell
cd backend
dotnet tool restore
```

## REST-API

| Methode und Pfad | Zweck |
|---|---|
| `GET /api/drones` | Drohnen mit Status |
| `GET /api/drones/{id}` | Eine Drohne mit Status |
| `POST /api/drones` | Drohne anlegen |
| `PUT /api/drones/{id}` | Name und Beschreibung ändern |
| `DELETE /api/drones/{id}` | Drohne ohne Ausleihen löschen |
| `POST /api/drones/{id}/defect` | Schaden melden (`{ description }`), nicht bei verliehener Drohne |
| `POST /api/drones/{id}/repair` | Defekte Drohne als repariert markieren |
| `GET /api/student-groups` | Schülergruppen |
| `GET /api/student-groups/{id}` | Eine Schülergruppe |
| `POST /api/student-groups` | Schülergruppe anlegen |
| `PUT /api/student-groups/{id}` | Namen ändern |
| `DELETE /api/student-groups/{id}` | Schülergruppe in den Papierkorb verschieben (nicht bei aktiver Ausleihe) |
| `GET /api/student-groups/trash` | Gruppen im Papierkorb mit Löschdatum, Ausleihen und Mitgliedern |
| `POST /api/student-groups/{id}/restore` | Gruppe aus dem Papierkorb wiederherstellen |
| `DELETE /api/student-groups/{id}/permanent?history=keep\|delete` | Gruppe aus dem Papierkorb endgültig löschen, Historie behalten oder mitlöschen |
| `POST /api/student-groups/{id}/members` | Mitglied hinzufügen |
| `DELETE /api/student-groups/{id}/members/{memberId}` | Mitglied entfernen |
| `PUT /api/student-groups/{id}/leader` | Gruppenleiter bestimmen (`memberId`) oder entfernen (`null`) |
| `POST /api/loans` | Drohne mit Zubehör ausleihen |
| `GET /api/loans?status=Active` | Aktive Ausleihen |
| `POST /api/loans/{id}/return` | Ausleihe zurückgeben, optional mit `{ items: [{ type, returnedQuantity }], defect }` |
| `GET /api/loans?status=Returned` | Historie, neueste Rückgabe zuerst |
| `GET /api/loans?droneId=7` oder `?studentGroupId=3` | Ausleihen einer Drohne oder Gruppe, aktive zuerst; mit `status` kombinierbar |

Jede Ausleihe enthält `daysActive` (volle Tage seit dem Ausleihdatum, nur bei aktiven Ausleihen, sonst `null`), `isLongRunning` (mehr als 7 Tage, nur ohne geplantes Rückgabedatum), `note`, `dueDate` und `isOverdue` (aktiv und das geplante Datum ist vorbei). Die Markierungen berechnet das Backend beim Lesen. Beim Anlegen sind `note` (höchstens 500 Zeichen) und `dueDate` (nicht vor heute) optional. Nach der Rückgabe zeigen `missingBatteries` und `missingPropellers` die Fehlteile. Drohnen haben den Status `Available`, `Loaned` oder `Defective` und bei einem Schaden `defectNote`.

Ablehnungen kommen als ProblemDetails mit lesbarer Meldung: 400 bei ungültiger Eingabe (auch ohne `history` beim endgültigen Löschen), 404 bei unbekannter Drohne, Gruppe oder Ausleihe, 409 bei doppeltem Namen (auch wenn die Gruppe mit dem Namen im Papierkorb liegt), bereits ausgeliehener Drohne, bereits zurückgegebener Ausleihe, beim Löschen einer Drohne mit Ausleihen, beim Löschen einer Gruppe mit aktiver Ausleihe oder bei Änderungen an einer Gruppe im Papierkorb. Nach dem Umbenennen zeigt auch die Historie den neuen Namen.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Anforderungen mit Szenarien und Entscheidungen; REQ-001 bis REQ-024 sind umgesetzt, REQ-025 bis REQ-030 beschlossen |
| [docs/domain-model.md](docs/domain-model.md) | Begriffe und Datenmodell |
| [openspec/specs](openspec/specs) | Geltende Specs für `drone`, `student-group` und `loan` |
| [proposal.md](openspec/changes/archive/2026-11-11-initial-drone-lending-system/proposal.md) | Warum es den ersten Change gab und was dazugehörte |
| [design.md](openspec/changes/archive/2026-11-11-initial-drone-lending-system/design.md) | Technische Entscheidungen |
| [tasks.md](openspec/changes/archive/2026-11-11-initial-drone-lending-system/tasks.md) | Alle Tasks mit Anforderung und Issue |
| [openspec/changes](openspec/changes) | Laufende und archivierte Changes mit Proposal, Specs, Design und Tasks |
| [AGENTS.md](AGENTS.md) | Regeln für die Arbeit im Projekt |

## Arbeitsweise

Das Projekt wird KI-gestützt mit Claude Code und spezifikationsgetrieben mit [OpenSpec](https://github.com/Fission-AI/OpenSpec) entwickelt. Jede Änderung lässt sich so zurückverfolgen:

```text
Anforderung -> Spec -> Task -> Issue -> Branch -> Pull Request -> Code und Tests
```

- Pro Task gibt es ein Issue, einen Branch `feature/<issue>-<name>` und einen Pull Request.
- Jeder Pull Request wird vor dem Merge gegen die Spec geprüft. Dieses Review macht eine KI, es steht als gekennzeichneter Kommentar im Pull Request.
- Eine Verhaltensänderung beginnt immer in der Spec.
