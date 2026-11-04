# Projektauftrag Drohnenverwaltung (Kurzfassung)

Quelle: Folien `INF4_SYP_19_Projektauftrag_Drohnenverwaltung`, SYP 4. INF, 2026/27, DI (FH) Markus Falkensteiner.
Bewertet werden Verstaendnis, Nachvollziehbarkeit und Tests, nicht die Menge an Code.

## Ziel und Technik

Drohnen und Zubehoer werden an Schuelergruppen ausgeliehen. Die Anwendung ersetzt den Zettel an der Schranktuer.

- Frontend: Angular/TypeScript in `frontend/drone-inventory-ui`
- Backend: ASP.NET Core 10 Web API in `backend/DroneInventory.Api`, EF Core, SQLite
- Das Frontend spricht nur ueber REST/JSON mit dem Backend und greift nie direkt auf die Datenbank zu.
- Geschaeftslogik und Validierung liegen im Backend.
- Werkzeuge: Git, GitHub CLI `gh`, GitHub Project (Spalten Backlog, Ready, In Progress, Review, Done), OpenSpec.

## Domaene

Begriffe ueberall gleich verwenden. Keine Synonyme wie "Verleih", "Ausgabe" oder "Buchung".

- `Drone`: Id, Name, Description. Zustand Available oder Loaned, wird nie eingegeben.
- `StudentGroup`: Id, Name
- `Loan`: Id, DroneId, StudentGroupId, LoanDate, ReturnDate, Status (Active oder Returned)
- `LoanItem`: Id, LoanId, Type (Battery oder Propeller), Quantity. Existiert nur innerhalb eines Loan.

Regeln:

- Eine Drohne hat hoechstens eine aktive Ausleihe.
- Nur verfuegbare Drohnen duerfen ausgeliehen werden.
- Eine Rueckgabe macht die Drohne wieder verfuegbar.
- Zubehoermengen sind ganzzahlig und nie negativ. Das Backend lehnt negative Mengen ab.
- Zurueckgegebene Ausleihen bleiben gespeichert und werden nie geloescht.
- Akkus und Propeller werden nur als Menge gefuehrt.
- Die Verfuegbarkeit ergibt sich aus der aktiven Ausleihe. Architekturfrage aus den Folien: Status speichern oder berechnen? Zwei Wahrheiten sind eine Fehlerquelle.

## Anforderungen

Jede mit SHALL und mindestens einem Given/When/Then-Szenario formulieren. Sie kommen als Dokument ins Repository und sind der Input fuer OpenSpec.

| ID | Inhalt |
|---|---|
| REQ-001 | Drohne anlegen. Beispiel: Name `TELLO-07`, Description `SSID: TELLO-9FA21B, rechter Propellerschutz beschaedigt` |
| REQ-002 | Drohnen anzeigen: Name, Status (Available oder Loaned), Beschreibung |
| REQ-003 | Schuelergruppe anlegen. Beispiel: `Group 3` |
| REQ-004 | Eine verfuegbare Drohne SHALL an eine Gruppe ausgeliehen werden. Ergebnis: aktive Ausleihe |
| REQ-005 | Eine Drohne SHALL hoechstens eine aktive Ausleihe haben. Weitere Ausleihe wird abgelehnt |
| REQ-006 | Zubehoer ausleihen: Battery, Propeller, ganzzahlig und >= 0. Beispiel: 4 Batteries, 8 Propellers |
| REQ-007 | Aktive Ausleihen anzeigen: Group, Drone, Batteries, Propellers, Loan Date |
| REQ-008 | Ausleihe zurueckgeben: Loan Active zu Returned, Drone Loaned zu Available |
| REQ-009 | Rueckgabedatum (ReturnDate) speichern |
| REQ-010 | Ausleihhistorie anzeigen. Zurueckgegebene Ausleihen bleiben erhalten |

Pruefbeispiel: Group 3, TELLO-07, 19.08.2026, Active, 4 Batteries, 8 Propellers. Nach der Rueckgabe aendern sich nur Status und ReturnDate.

Out of Scope, ausdruecklich in Anforderungen und `proposal.md` nennen: Login, Benutzerkonten und Rollen; einzelne Akkus (BAT-001); Reservierungen; Schadensverwaltung und Rueckgabedifferenzen; Auswertungen, Statistiken und Exporte.

## Fahrplan

1. Anforderungen erstellen
2. Domaene und Begriffe klaeren
3. DDD-Modell skizzieren
4. Repository und Project anlegen
5. Backend und Frontend anlegen, einmal starten, committen
6. `openspec init`
7. `openspec/config.yaml` und `AGENTS.md` fuellen und einchecken
8. GitHub CLI einrichten (`gh auth refresh -h github.com -s project`)
9. Skills anlegen: `openspec-to-github`, `openspec-apply-with-github`, `openspec-archive-with-github`
10. `/opsx:propose initial-drone-lending-system`
11. Specs gemeinsam reviewen, noch kein Code
12. `tasks.md` pruefen: Tasks klein, unabhaengig, einzeln testbar, rund 20 Stueck
13. Issues erzeugen und Board fuellen: `/openspec-to-github`, zweimal ausfuehren darf keine Duplikate erzeugen
14. Issue umsetzen: Branch wie `feature/16-loan-api`, nur an Issues auf "In Progress" arbeiten
15. Tests ausfuehren (`dotnet test`, `ng test`). Jedes Given/When/Then-Szenario braucht einen Test
16. Pull Request und Review, das die Spec-Konformitaet prueft
17. Merge
18. `/opsx:archive`, erst wenn implementiert, getestet und gemergt
19. Change Request, zurueck zu 10. Bei unklaren Aenderungen zuerst `/opsx:explore`
20. Abgabe und Praesentation

Moegliche Change Requests im Semester: beschaedigte Drohnen, verantwortlicher Schueler, Gruppenmitglieder, einzelne Akkus, fehlendes Zubehoer bei Rueckgabe, Schadensmeldung bei Rueckgabe, SSID als eigenes Feld. Sie kommen erst im Laufe des Projekts, also nicht vorab einbauen.

## Vorlage: Beispiel Student Website

Das Dokument `OpenSpec Student Website` zeigt denselben Ablauf am Beispiel einer Website. Uebernommen sind die Reihenfolge, der Aufbau von `openspec/config.yaml` und der Agentenregeln und die drei GitHub-Skills.

Nicht uebernommen, weil es hier nicht passt: Python, FastAPI, HTML ohne Framework, die Website-Seiten und die ToDo-Liste; GitHub Copilot und `githubCopilot.cloudAgent`; Skills unter `.github/skills` (hier `.claude/skills`, Regeln in `AGENTS.md` statt `copilot-instructions.md`). Die Token-Schritte entfallen, weil `gh` bereits mit dem Recht `project` angemeldet ist.

Ablauf je Change:

1. `/opsx:propose <name>` mit der fachlichen Beschreibung, keine Implementierung
2. Specs und `tasks.md` reviewen
3. `/openspec-to-github`: Issues anlegen und ins Board aufnehmen
4. `/openspec-apply-with-github` je Issue: "In progress", Branch, Umsetzung, Tests, Pull Request, Merge, "In review"
5. `/openspec-archive-with-github`, wenn alles gemergt ist: Issues auf "Done", Change archivieren

Erster Change laut Folie 29:

```text
/opsx:propose initial-drone-lending-system

Create the initial Drone Lending System. The system shall manage drones, student
groups, drone loans, batteries and propellers as quantities, returns and loan
history. Use the requirements and domain rules from the context.
```

## Spielregeln

- Verhalten aendern heisst: zuerst die Spec aendern.
- Immer nur einen Task pro Agentenlauf umsetzen lassen.
- Ein Issue, ein Branch, ein Pull Request.
- `git diff` vor jedem Commit lesen und verstehen.
- Manuelle Nacharbeit ist erlaubt, muss aber sichtbar sein.
- Keine Issues loeschen, keine Tasks ungeprueft abhaken.
- Der Agent schlaegt vor, die Entscheidung trifft das Team.
- Traceability bis zur Abgabe: REQ, Spec, Task, Issue, Branch, Pull Request, Code und Tests.
- Abgabe: Repository, `openspec/specs` und archivierte Changes, Issues und gefuelltes Project, Pull Requests mit Reviews, lauffaehige Anwendung und Tests.
