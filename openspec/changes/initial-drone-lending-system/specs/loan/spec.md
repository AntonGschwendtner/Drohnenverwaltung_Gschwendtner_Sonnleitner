# Spec Delta

## Purpose

Records which student group has which drone and accessories, from the loan through the return, and keeps every past loan as history.

## ADDED Requirements

### Requirement: Loan drone
An available drone SHALL be loaned to a student group. The system SHALL set the current date as loan date (REQ-004).

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
An active loan SHALL be able to be returned. The return SHALL change the loan from Active to Returned and make the drone available again (REQ-008).

#### Scenario: Return a loan
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned
- **THEN** the loan is marked as returned
- **AND** "TELLO-07" becomes available again

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
Returned loans SHALL stay stored and SHALL NOT be deleted. The system SHALL list returned loans with student group, drone, accessory quantities, loan date and return date (REQ-010).

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
