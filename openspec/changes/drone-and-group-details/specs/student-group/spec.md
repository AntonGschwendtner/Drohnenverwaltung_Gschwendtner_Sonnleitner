## ADDED Requirements

### Requirement: Student group details
The system SHALL show a single student group with its active loans and all its returned loans with drone, accessories, loan date and return date, the newest return first (REQ-019).

#### Scenario: Group with active and returned loans
- **GIVEN** "Group 3" has loaned "TELLO-07" and has returned "TELLO-08"
- **WHEN** the details of "Group 3" are shown
- **THEN** "TELLO-07" is shown as active
- **AND** "TELLO-08" is listed as returned

#### Scenario: Unknown student group
- **GIVEN** no student group with the given identity exists
- **WHEN** its details are requested
- **THEN** the request is answered as not found
