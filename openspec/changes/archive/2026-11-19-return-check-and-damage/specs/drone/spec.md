## MODIFIED Requirements

### Requirement: List drones
The system SHALL list all drones with name, status and description. The status SHALL be Available, Loaned or Defective (REQ-002, REQ-024). A drone with a reported defect SHALL be Defective. Otherwise the status SHALL follow from the active loan.

#### Scenario: Drone without an active loan
- **GIVEN** the drone "TELLO-07" has no active loan
- **WHEN** the drones are listed
- **THEN** "TELLO-07" is shown as Available

#### Scenario: Drone with an active loan
- **GIVEN** the drone "TELLO-07" has an active loan
- **WHEN** the drones are listed
- **THEN** "TELLO-07" is shown as Loaned

#### Scenario: Drone with a reported defect
- **GIVEN** a defect was reported for "TELLO-07"
- **WHEN** the drones are listed
- **THEN** "TELLO-07" is shown as Defective with the defect description

### Requirement: Drone status overview
The drone page SHALL show the number of all drones, of available drones, of loaned drones and of defective drones (REQ-014, REQ-024). The numbers SHALL count all drones, independent of the search and the filter.

#### Scenario: Overview after a loan
- **GIVEN** three drones exist and one of them is loaned
- **WHEN** the drone page is shown
- **THEN** the overview shows 3 drones, 2 available and 1 loaned

#### Scenario: Overview ignores the search
- **GIVEN** three drones exist
- **WHEN** the user searches for a name that matches one drone
- **THEN** the overview still shows 3 drones

#### Scenario: Overview counts defective drones
- **GIVEN** three drones exist, one is loaned and one is Defective
- **WHEN** the drone page is shown
- **THEN** the overview shows 3 drones, 1 available, 1 loaned and 1 defective

## ADDED Requirements

### Requirement: Report and repair a defect
The system SHALL allow a defect with a required description of at most 500 characters to be reported for a drone that is not loaned (REQ-024). A defective drone SHALL be marked as repaired, which removes the defect and makes it available again.

#### Scenario: Report a defect
- **GIVEN** "TELLO-07" is available
- **WHEN** a defect "Motor 3 dreht nicht" is reported for "TELLO-07"
- **THEN** "TELLO-07" is Defective

#### Scenario: Description is missing
- **GIVEN** "TELLO-07" is available
- **WHEN** a defect without description is reported
- **THEN** the report is rejected

#### Scenario: Drone is loaned
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** a defect is reported for "TELLO-07" without returning it
- **THEN** the report is rejected

#### Scenario: Repair a drone
- **GIVEN** "TELLO-07" is Defective
- **WHEN** "TELLO-07" is marked as repaired
- **THEN** "TELLO-07" is Available

### Requirement: Defective drone cannot be loaned
A defective drone SHALL NOT be loaned (REQ-024).

#### Scenario: Loan a defective drone
- **GIVEN** "TELLO-07" is Defective
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** the loan is rejected
