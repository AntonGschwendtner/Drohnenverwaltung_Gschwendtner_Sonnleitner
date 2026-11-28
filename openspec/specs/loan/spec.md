# loan Specification

## Purpose

Records which student group has which drone and accessories, from the loan through the return, and keeps every past loan as history.

## Requirements

### Requirement: Loan drone
An available drone SHALL be loaned to a student group. The system SHALL set the current date as loan date (REQ-004). The loan form SHALL offer only available drones, by name and without a status; loaned and defective drones are not offered.

#### Scenario: Loan form offers only available drones
- **GIVEN** "TELLO-07" is available, "TELLO-08" is loaned and "TELLO-09" is Defective
- **WHEN** the loan form is opened
- **THEN** the drone choice offers only "TELLO-07"

#### Scenario: Loan an available drone
- **GIVEN** the drone "TELLO-07" is available
- **AND** the student group "Group 3" exists
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** an active loan is created with the current date as loan date
- **AND** "TELLO-07" is Loaned

#### Scenario: Unknown drone
- **GIVEN** the student group "Group 3" exists
- **WHEN** a loan is created for a drone that does not exist
- **THEN** the loan is rejected

#### Scenario: Unknown student group
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** a loan is created for a student group that does not exist
- **THEN** the loan is rejected

### Requirement: No double loan
A drone SHALL have at most one active loan (REQ-005).

#### Scenario: Drone is already loaned
- **GIVEN** "TELLO-07" already has an active loan
- **WHEN** another group tries to loan it
- **THEN** the loan is rejected
- **AND** the existing loan stays unchanged

#### Scenario: Two loans at the same time
- **GIVEN** "TELLO-07" is available
- **WHEN** two groups try to loan it at the same time
- **THEN** exactly one active loan exists afterwards

### Requirement: Loan accessories
A loan SHALL be able to include batteries and propellers as quantities. Quantities SHALL be whole numbers greater than or equal to 0, and each accessory type SHALL appear at most once per loan (REQ-006).

#### Scenario: Loan with accessories
- **GIVEN** the drone "TELLO-07" is available
- **AND** the student group "Group 3" exists
- **WHEN** "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers
- **THEN** the active loan contains 4 batteries and 8 propellers

#### Scenario: Quantity of zero
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** it is loaned with 0 batteries and 0 propellers
- **THEN** the loan is created

#### Scenario: Negative quantity
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** it is loaned with -1 batteries
- **THEN** the loan is rejected
- **AND** "TELLO-07" stays available

#### Scenario: Quantity is not a whole number
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** it is loaned with 1.5 propellers
- **THEN** the loan is rejected

#### Scenario: Unknown accessory type
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** it is loaned with an accessory type other than Battery or Propeller
- **THEN** the loan is rejected

#### Scenario: Accessory type appears twice
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** it is loaned with two separate battery entries
- **THEN** the loan is rejected

### Requirement: List active loans
The system SHALL list all active loans with student group, drone, number of batteries, number of propellers and loan date (REQ-007).

#### Scenario: List active loans
- **GIVEN** "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers on 19.08.2026
- **WHEN** the active loans are listed
- **THEN** the list shows Group 3, TELLO-07, 4, 8 and 19.08.2026

#### Scenario: Returned loan is not active
- **GIVEN** a loan has been returned
- **WHEN** the active loans are listed
- **THEN** the returned loan is not shown

### Requirement: Return loan
An active loan SHALL be able to be returned. The return SHALL change the loan from Active to Returned (REQ-008). The drone SHALL become available again, unless a defect is reported with the return; then the drone SHALL become Defective (REQ-024).

#### Scenario: Return a loan
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned
- **THEN** the loan is marked as returned
- **AND** "TELLO-07" becomes available again

#### Scenario: Return with a defect
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned with the defect "Propeller gebrochen"
- **THEN** the loan is marked as returned
- **AND** "TELLO-07" is Defective

#### Scenario: Loan is already returned
- **GIVEN** a loan has been returned
- **WHEN** the loan is returned again
- **THEN** the return is rejected
- **AND** the return date stays unchanged

#### Scenario: Unknown loan
- **GIVEN** no loan with the given identity exists
- **WHEN** the loan is returned
- **THEN** the return is rejected

### Requirement: Store return date
The system SHALL store the current date as return date when a loan is returned. An active loan SHALL have no return date (REQ-009).

#### Scenario: Return date is stored
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned
- **THEN** the current date is stored as return date

#### Scenario: Active loan has no return date
- **GIVEN** a drone is available
- **WHEN** a loan is created for it
- **THEN** the loan has no return date

### Requirement: Loan history
Returned loans SHALL stay stored and SHALL NOT be deleted, except when a user deletes a student group (REQ-033) or a drone (REQ-034) permanently together with its history, deletes the history (REQ-040) or chooses it in the general reset (REQ-038). The system SHALL list returned loans with student group, drone, accessory quantities, loan date and return date (REQ-010). A loan of a permanently deleted group or drone whose history was kept SHALL keep showing its name.

#### Scenario: Returned loan stays in the history
- **GIVEN** "TELLO-07" was loaned to "Group 3" with 4 batteries and 8 propellers
- **WHEN** the loan is returned
- **AND** the loan history is listed
- **THEN** the history shows the loan with its accessories, loan date and return date

#### Scenario: Same drone is loaned again
- **GIVEN** a returned loan of "TELLO-07" exists
- **WHEN** "TELLO-07" is loaned again
- **THEN** the returned loan stays unchanged in the history

#### Scenario: Loans cannot be deleted
- **GIVEN** a returned loan exists
- **WHEN** a client tries to delete the loan
- **THEN** the request is rejected
- **AND** the loan stays in the history

#### Scenario: Group deleted, history kept
- **GIVEN** "Group 3" returned "TELLO-07" and was deleted permanently with the history kept
- **WHEN** the loan history is listed or exported
- **THEN** the loan of "TELLO-07" is shown with the student group "Group 3"
- **AND** the group name is not a link

#### Scenario: Group deleted with its history
- **GIVEN** "Group 3" returned "TELLO-07" and was deleted permanently together with its history
- **WHEN** the loan history is listed
- **THEN** the loan of "TELLO-07" by "Group 3" is no longer shown

#### Scenario: Drone deleted, history kept
- **GIVEN** "Group 3" returned "TELLO-07" and "TELLO-07" was deleted permanently with the history kept
- **WHEN** the loan history is listed or exported
- **THEN** the loan is shown with the drone "TELLO-07"
- **AND** the drone name is not a link

### Requirement: Loan duration
Every active loan SHALL show how many full days have passed since its loan date (REQ-012). An active loan without a planned return date running longer than 7 full days SHALL be marked as long-running. An active loan with a planned return date SHALL NOT be marked as long-running; the overdue mark replaces it (REQ-022). Returned loans SHALL NOT be marked.

#### Scenario: New loan
- **GIVEN** "TELLO-07" was loaned to "Group 3" today
- **WHEN** the active loans are listed
- **THEN** the loan shows 0 days and is not marked as long-running

#### Scenario: Loan running exactly 7 days
- **GIVEN** "TELLO-07" was loaned to "Group 3" 7 days ago
- **WHEN** the active loans are listed
- **THEN** the loan shows 7 days and is not marked as long-running

#### Scenario: Long-running loan
- **GIVEN** "TELLO-07" was loaned to "Group 3" 9 days ago
- **WHEN** the active loans are listed
- **THEN** the loan shows 9 days and is marked as long-running

#### Scenario: Long loan with a planned return date
- **GIVEN** "TELLO-07" was loaned to "Group 3" 9 days ago with a planned return date that has not passed
- **WHEN** the active loans are listed
- **THEN** the loan shows 9 days and is neither long-running nor overdue

### Requirement: Confirm return
Before a loan is returned, the system SHALL ask for confirmation in a dialog that names the drone and the student group (REQ-013). The dialog SHALL offer the returned quantities, prefilled with the loaned quantities, and an optional defect (REQ-023, REQ-024). Only a confirmed return SHALL be saved.

#### Scenario: Confirm the return
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the user chooses Return and confirms
- **THEN** the loan is returned

#### Scenario: Cancel the return
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the user chooses Return and then cancels
- **THEN** the loan stays active and nothing is sent to the server

#### Scenario: Dialog suggests the loaned quantities
- **GIVEN** "TELLO-07" was loaned to "Group 3" with 4 batteries and 8 propellers
- **WHEN** the user chooses Return
- **THEN** the dialog shows 4 batteries and 8 propellers as returned quantities

### Requirement: Search loan history
The loan history SHALL be narrowed by a search that matches the drone name or the student group name, ignoring upper and lower case (REQ-011). When no loan matches, the history SHALL say so.

#### Scenario: Search by student group
- **GIVEN** returned loans of "Group 3" and "Robotics Club" exist
- **WHEN** the user searches for "robotics"
- **THEN** only the loans of "Robotics Club" are shown

#### Scenario: No loan matches
- **GIVEN** a returned loan of "TELLO-07" exists
- **WHEN** the user searches for "xyz"
- **THEN** the history shows that no loan matches the search

### Requirement: Loans of one drone or one student group
The system SHALL list the loans of a single drone or of a single student group, active and returned together, the active loan first and then the newest return first (REQ-018, REQ-019).

#### Scenario: Loans of one drone
- **GIVEN** "TELLO-07" and "TELLO-08" each have a returned loan
- **WHEN** the loans of "TELLO-07" are listed
- **THEN** only the loan of "TELLO-07" is shown

#### Scenario: Loans of one student group
- **GIVEN** "Group 3" and "Group 4" each have an active loan
- **WHEN** the loans of "Group 3" are listed
- **THEN** only the loan of "Group 3" is shown

### Requirement: Sort lists
The user SHALL be able to sort the drone list, the student group list, the active loans and the loan history by a column by choosing its header. Choosing the same header again SHALL reverse the order. Names SHALL be sorted ignoring upper and lower case, dates by time (REQ-020).

#### Scenario: Sort by name
- **GIVEN** the drones "TELLO-08" and "mavic-02" exist
- **WHEN** the user sorts the drones by name
- **THEN** "mavic-02" is shown before "TELLO-08"

#### Scenario: Reverse the order
- **GIVEN** the drones are sorted by name
- **WHEN** the user chooses the name header again
- **THEN** "TELLO-08" is shown before "mavic-02"

#### Scenario: Sort the history by return date
- **GIVEN** returned loans with the return dates 10.09.2026 and 20.08.2026
- **WHEN** the user sorts the history by return date in ascending order
- **THEN** the loan returned on 20.08.2026 is shown first

### Requirement: Loan note
A loan SHALL accept an optional free-text note of at most 500 characters (REQ-021). The note SHALL be shown with the active loan and in the history. A longer note SHALL be rejected.

#### Scenario: Loan with a note
- **GIVEN** "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned to "Group 3" with the note "Projekt Vermessung"
- **THEN** the active loan shows the note "Projekt Vermessung"

#### Scenario: Loan without a note
- **GIVEN** "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned to "Group 3" without a note
- **THEN** the loan is created without a note

#### Scenario: Note too long
- **GIVEN** "TELLO-07" is available
- **WHEN** a loan is created with a note of 501 characters
- **THEN** the loan is rejected

### Requirement: Planned return date
A loan SHALL accept an optional planned return date (REQ-022). The planned return date SHALL NOT lie before the loan date. An active loan SHALL be marked as overdue when the current date is after its planned return date. A returned loan SHALL NOT be marked as overdue.

#### Scenario: Loan with a planned return date
- **GIVEN** today is 19.08.2026
- **WHEN** "TELLO-07" is loaned with the planned return date 26.08.2026
- **THEN** the active loan shows the planned return date 26.08.2026
- **AND** the loan is not overdue

#### Scenario: Planned return date in the past
- **GIVEN** today is 19.08.2026
- **WHEN** a loan is created with the planned return date 18.08.2026
- **THEN** the loan is rejected

#### Scenario: Return on the planned day
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 26.08.2026
- **THEN** the loan is not overdue

#### Scenario: Overdue loan
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 27.08.2026
- **THEN** the loan is marked as overdue

#### Scenario: Returned late
- **GIVEN** a loan with the planned return date 26.08.2026 was returned on 28.08.2026
- **WHEN** the history is listed
- **THEN** the loan shows its planned return date and is not marked as overdue

### Requirement: Check accessories on return
A return SHALL accept the returned quantity of each loaned accessory type (REQ-023). Without a returned quantity, the loaned quantity SHALL be assumed. A returned quantity SHALL be a whole number from 0 up to the loaned quantity. The history SHALL show the missing quantity of each type.

#### Scenario: Everything returned
- **GIVEN** "TELLO-07" was loaned with 4 batteries and 8 propellers
- **WHEN** the loan is returned without quantities
- **THEN** the history shows no missing parts

#### Scenario: Battery missing
- **GIVEN** "TELLO-07" was loaned with 4 batteries and 8 propellers
- **WHEN** the loan is returned with 3 batteries and 8 propellers
- **THEN** the history shows 1 missing battery

#### Scenario: More returned than loaned
- **GIVEN** "TELLO-07" was loaned with 4 batteries
- **WHEN** the loan is returned with 5 batteries
- **THEN** the return is rejected
- **AND** the loan stays active

#### Scenario: Negative quantity
- **GIVEN** "TELLO-07" was loaned with 4 batteries
- **WHEN** the loan is returned with -1 batteries
- **THEN** the return is rejected

### Requirement: No loan for a group in the trash
The system SHALL reject a loan for a student group in the trash (REQ-033).

#### Scenario: Loan for a group in the trash
- **GIVEN** "Group 3" is in the trash and "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** the loan is rejected
- **AND** "TELLO-07" stays available

### Requirement: No loan of a drone in the trash
The system SHALL reject a loan of a drone in the trash (REQ-034).

#### Scenario: Loan a drone in the trash
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** the loan is rejected

### Requirement: Due today and days overdue
An active loan whose planned return date is today SHALL be marked as due today (REQ-035). An overdue active loan SHALL show for how many full days it is overdue. The list of active loans SHALL mark loans due today and overdue loans in different colours. Returned loans and loans without a planned return date SHALL have neither mark.

#### Scenario: Due today
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 26.08.2026
- **THEN** the loan is marked as due today and not as overdue

#### Scenario: Overdue for days
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 29.08.2026
- **THEN** the loan is marked as overdue for 3 days

#### Scenario: Overdue for one day
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 27.08.2026
- **THEN** the loan is marked as overdue for 1 day

#### Scenario: Not due yet
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 25.08.2026
- **THEN** the loan is neither due today nor overdue

#### Scenario: Returned or without a planned date
- **GIVEN** a returned loan and an active loan without a planned return date
- **WHEN** the loans are listed
- **THEN** neither loan is marked as due today or overdue

### Requirement: Delete the history
The history page SHALL offer to delete all returned loans at once after a confirmation (REQ-040). Active loans SHALL stay.

#### Scenario: Delete the history
- **GIVEN** two returned loans and one active loan exist
- **WHEN** the user deletes the history and confirms
- **THEN** the history is empty
- **AND** the active loan is still listed

#### Scenario: Cancel deleting the history
- **GIVEN** returned loans exist
- **WHEN** the user clicks "Delete history" and cancels the confirmation
- **THEN** the history stays unchanged

### Requirement: Export loan history
The system SHALL provide the returned loans as a CSV file with one row per loan and the columns student group, drone, batteries, propellers, loan date and return date, in the order of the history (REQ-025). The file SHALL open correctly in a spreadsheet program with German settings, including umlauts.

#### Scenario: Export the history
- **GIVEN** "TELLO-07" was loaned to "Group 3" on 19.08.2026 with 4 batteries and 8 propellers and returned on 26.08.2026
- **WHEN** the history is exported
- **THEN** the file contains a header row and the row "Group 3", "TELLO-07", 4, 8, 19.08.2026, 26.08.2026

#### Scenario: Export without returned loans
- **GIVEN** no loan has been returned
- **WHEN** the history is exported
- **THEN** the file contains only the header row

#### Scenario: Value with a separator
- **GIVEN** a returned loan of the student group "Gruppe 3; Robotik"
- **WHEN** the history is exported
- **THEN** the group name stays one value in the file

### Requirement: Print loan history
The loan history SHALL have a print layout that shows only the title, the print date and the table, readable in black and white (REQ-025).

#### Scenario: Print the history
- **GIVEN** the history contains returned loans
- **WHEN** the user prints the history page
- **THEN** the printout contains the table without navigation, buttons or background effects

### Requirement: Open the loan page for one drone
The loan page SHALL accept a drone in its address and choose it in the loan form (REQ-026). If the drone is not available, the page SHALL say so and choose nothing.

#### Scenario: Available drone from a QR code
- **GIVEN** "TELLO-07" is available
- **WHEN** the loan page is opened for "TELLO-07"
- **THEN** "TELLO-07" is chosen in the loan form

#### Scenario: Loaned drone from a QR code
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan page is opened for "TELLO-07"
- **THEN** the page says that "TELLO-07" is loaned to "Group 3"
- **AND** no drone is chosen

### Requirement: Respect reservations when loaning
On a day for which a drone is reserved, the drone SHALL only be loaned to the reserving student group (REQ-029). On other days reservations SHALL NOT restrict loans. The loan form SHALL show the next reservation of the chosen drone.

#### Scenario: Reserving group loans on the reserved day
- **GIVEN** today is 21.08.2026
- **AND** "TELLO-07" is available and reserved for "Group 3" today
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** the loan is created

#### Scenario: Other group on the reserved day
- **GIVEN** today is 21.08.2026
- **AND** "TELLO-07" is available and reserved for "Group 3" today
- **WHEN** "TELLO-07" is loaned to "Group 4"
- **THEN** the loan is rejected with the hint that "TELLO-07" is reserved for "Group 3"

#### Scenario: Loan before the reserved day
- **GIVEN** today is 19.08.2026
- **AND** "TELLO-07" is available and reserved for "Group 3" on 21.08.2026
- **WHEN** "TELLO-07" is loaned to "Group 4"
- **THEN** the loan is created
- **AND** the loan form showed the reservation on 21.08.2026 before saving
