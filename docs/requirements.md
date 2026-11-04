# Anforderungen: Drohnenverwaltung

Drohnen und Zubehör werden an Schülergruppen ausgeliehen. Die Anwendung ersetzt den Zettel an der Schranktür und macht nachvollziehbar, welche Drohnen es gibt, wer was ausgeliehen hat und welche Ausleihen es in der Vergangenheit gab.

Dieses Dokument ist der Input für OpenSpec. Die Begriffe stehen in [domain-model.md](domain-model.md).

## REQ-001 Drohne anlegen

The system SHALL allow a drone to be created with a name and a free-text description.

**Scenario: Create a drone**
- GIVEN no drone named "TELLO-07" exists
- WHEN a drone is created with the name "TELLO-07" and the description "SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt"
- THEN the drone is stored
- AND the drone is available

**Scenario: Name is missing**
- WHEN a drone is created without a name
- THEN the creation is rejected

**Scenario: Name already exists**
- GIVEN a drone named "TELLO-07" exists
- WHEN another drone is created with the name "TELLO-07"
- THEN the creation is rejected

## REQ-002 Drohnen anzeigen

The system SHALL list all drones with name, status and description. The status SHALL be Available or Loaned and SHALL follow from the active loan.

**Scenario: Drone without an active loan**
- GIVEN the drone "TELLO-07" has no active loan
- WHEN the drones are listed
- THEN "TELLO-07" is shown as Available

**Scenario: Drone with an active loan**
- GIVEN the drone "TELLO-07" has an active loan
- WHEN the drones are listed
- THEN "TELLO-07" is shown as Loaned

## REQ-003 Schülergruppe anlegen

The system SHALL allow a student group to be created with a name and SHALL list all student groups, so that a group can be chosen for a loan.

**Scenario: List student groups**
- GIVEN the student group "Group 3" exists
- WHEN the student groups are listed
- THEN the list contains "Group 3"

**Scenario: Create a student group**
- GIVEN no student group named "Group 3" exists
- WHEN a student group is created with the name "Group 3"
- THEN the student group is stored

**Scenario: Name is missing**
- WHEN a student group is created without a name
- THEN the creation is rejected

**Scenario: Name already exists**
- GIVEN a student group named "Group 3" exists
- WHEN another student group is created with the name "Group 3"
- THEN the creation is rejected

## REQ-004 Drohne ausleihen

An available drone SHALL be loaned to a student group. The loan date SHALL be set by the system.

**Scenario: Loan an available drone**
- GIVEN the drone "TELLO-07" is available
- AND the student group "Group 3" exists
- WHEN "TELLO-07" is loaned to "Group 3"
- THEN an active loan is created with the current date as loan date
- AND "TELLO-07" is Loaned

**Scenario: Unknown drone or student group**
- WHEN a loan is created for a drone or student group that does not exist
- THEN the loan is rejected

## REQ-005 Keine doppelte Ausleihe

A drone SHALL have at most one active loan.

**Scenario: Drone is already loaned**
- GIVEN "TELLO-07" already has an active loan
- WHEN another group tries to loan it
- THEN the loan is rejected
- AND the existing loan stays unchanged

## REQ-006 Zubehör ausleihen

A loan SHALL be able to include batteries and propellers as quantities. Quantities SHALL be whole numbers greater than or equal to 0. Accessories SHALL NOT be tracked individually.

**Scenario: Loan with accessories**
- GIVEN the drone "TELLO-07" is available
- AND the student group "Group 3" exists
- WHEN "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers
- THEN the active loan contains 4 batteries and 8 propellers

**Scenario: Quantity of zero**
- WHEN a drone is loaned with 0 batteries and 0 propellers
- THEN the loan is created

**Scenario: Negative quantity**
- WHEN a drone is loaned with -1 batteries
- THEN the loan is rejected

**Scenario: Quantity is not a whole number**
- WHEN a drone is loaned with 1.5 propellers
- THEN the loan is rejected

**Scenario: Unknown accessory type**
- WHEN a drone is loaned with an accessory type other than Battery or Propeller
- THEN the loan is rejected

**Scenario: Accessory type appears twice**
- WHEN a drone is loaned with two separate battery entries
- THEN the loan is rejected

## REQ-007 Aktive Ausleihen anzeigen

The system SHALL list all active loans with student group, drone, number of batteries, number of propellers and loan date.

**Scenario: List active loans**
- GIVEN "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers on 19.08.2026
- WHEN the active loans are listed
- THEN the list shows Group 3, TELLO-07, 4, 8 and 19.08.2026

**Scenario: Returned loan is not active**
- GIVEN a loan has been returned
- WHEN the active loans are listed
- THEN the returned loan is not shown

## REQ-008 Ausleihe zurückgeben

An active loan SHALL be able to be returned. The return SHALL change the loan from Active to Returned and make the drone available again.

**Scenario: Return a loan**
- GIVEN "TELLO-07" is loaned to "Group 3"
- WHEN the loan is returned
- THEN the loan is marked as returned
- AND "TELLO-07" becomes available again

**Scenario: Loan is already returned**
- GIVEN a loan has been returned
- WHEN the loan is returned again
- THEN the return is rejected
- AND the return date stays unchanged

## REQ-009 Rückgabedatum speichern

The system SHALL store the return date of a loan. The return date SHALL be set by the system.

**Scenario: Return date is stored**
- GIVEN "TELLO-07" is loaned to "Group 3"
- WHEN the loan is returned
- THEN the current date is stored as return date

**Scenario: Active loan has no return date**
- WHEN a loan is created
- THEN the loan has no return date

## REQ-010 Ausleihhistorie anzeigen

Returned loans SHALL stay stored and SHALL NOT be deleted. The system SHALL list past loans with student group, drone, accessory quantities, loan date and return date.

**Scenario: Returned loan stays in the history**
- GIVEN "TELLO-07" was loaned to "Group 3" with 4 batteries and 8 propellers
- WHEN the loan is returned
- AND the loan history is listed
- THEN the history shows the loan with its accessories, loan date and return date

**Scenario: Same drone is loaned again**
- GIVEN a returned loan of "TELLO-07" exists
- WHEN "TELLO-07" is loaned again
- THEN the returned loan stays unchanged in the history

## Out of Scope

- Login, Benutzerkonten und Rollen
- Einzelinventarisierung von Akkus (BAT-001 ...)
- Reservierungen im Voraus
- Schadensverwaltung und Rückgabedifferenzen
- Auswertungen, Statistiken und Exporte

Diese Punkte kommen bei Bedarf später als eigener Change Request.

## Entscheidungen zu offenen Punkten

Die Folien lassen diese Punkte offen. So sind sie hier festgelegt:

| Punkt | Entscheidung | Grund |
|---|---|---|
| Doppelte Namen | Drohnen und Gruppen haben eindeutige Namen | Die Listen zeigen nur den Namen, zwei gleiche "TELLO-07" wären nicht unterscheidbar |
| Datum | Ausleih- und Rückgabedatum setzt das System | Ein eingegebenes Datum könnte die Historie verfälschen |
| Ausleihe ohne Zubehör | Erlaubt, Mengen ab 0 | REQ-006 erlaubt Mengen >= 0 |
| Mengen beim Zurückgeben | Werden nicht erfasst | Rückgabedifferenzen sind Out of Scope |

## Prüfbeispiel

Jede Spec wird gegen dieses Beispiel geprüft:

```text
Student Group:  Group 3
Drone:          TELLO-07
Loan Date:      19.08.2026
Status:         Active
Accessories:    4 Batteries, 8 Propellers
```

Nach der Rückgabe ändern sich nur Status und ReturnDate. Der Datensatz bleibt bestehen.
