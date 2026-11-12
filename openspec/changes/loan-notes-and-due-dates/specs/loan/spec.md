## ADDED Requirements

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
