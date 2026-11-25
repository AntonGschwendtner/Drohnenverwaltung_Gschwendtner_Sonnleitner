## ADDED Requirements

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
