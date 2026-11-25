# drone Specification

## Purpose

Manages the drones that can be loaned and shows at any time whether each drone is available or loaned.

## Requirements

### Requirement: Create drone
The system SHALL allow a drone to be created with a unique name and a free-text description (REQ-001). The name of a drone in the trash stays taken (REQ-034).

#### Scenario: Create a drone
- **GIVEN** no drone named "TELLO-07" exists
- **WHEN** a drone is created with the name "TELLO-07" and the description "SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt"
- **THEN** the drone is stored
- **AND** the drone is available

#### Scenario: Name is missing
- **GIVEN** the system is running
- **WHEN** a drone is created without a name
- **THEN** the creation is rejected

#### Scenario: Name already exists
- **GIVEN** a drone named "TELLO-07" exists
- **WHEN** another drone is created with the name "TELLO-07"
- **THEN** the creation is rejected

#### Scenario: Name of a drone in the trash
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** a drone is created with the name "TELLO-07"
- **THEN** the creation is rejected with a message that "TELLO-07" is in the trash

### Requirement: List drones
The system SHALL list all drones that are not in the trash with name, status and description (REQ-034). The status SHALL be Available, Loaned or Defective (REQ-002, REQ-024). A drone with a reported defect SHALL be Defective. Otherwise the status SHALL follow from the active loan.

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

#### Scenario: Drone in the trash is not listed
- **GIVEN** "TELLO-07" is in the trash and "TELLO-08" is not
- **WHEN** the drones are listed
- **THEN** the list contains "TELLO-08" and not "TELLO-07"

### Requirement: Search and filter drones
The drone list SHALL be narrowed by a name search and by a status filter (REQ-011). The name search SHALL ignore upper and lower case and match parts of the name. Both conditions SHALL apply together. When no drone matches, the list SHALL say so.

#### Scenario: Search by part of the name
- **GIVEN** the drones "TELLO-07" and "MAVIC-02" exist
- **WHEN** the user searches for "tello"
- **THEN** only "TELLO-07" is shown

#### Scenario: Filter by status
- **GIVEN** "TELLO-07" is Loaned and "MAVIC-02" is Available
- **WHEN** the user filters by Available
- **THEN** only "MAVIC-02" is shown

#### Scenario: No drone matches
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** the user searches for "xyz"
- **THEN** the list shows that no drone matches the search

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

### Requirement: Edit drone
The system SHALL allow the name and the description of an existing drone to be changed (REQ-015). The same rules as for creating a drone SHALL apply: the name is required and unique, and the name of a drone in the trash stays taken (REQ-034). Editing SHALL NOT change the status of the drone or its loans.

#### Scenario: Correct a name
- **GIVEN** the drone "TELO-07" exists
- **WHEN** its name is changed to "TELLO-07"
- **THEN** the drone is listed as "TELLO-07"

#### Scenario: Edit a loaned drone
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** its description is changed
- **THEN** the description is stored
- **AND** "TELLO-07" stays Loaned

#### Scenario: Name already used
- **GIVEN** the drones "TELLO-07" and "TELLO-08" exist
- **WHEN** the name of "TELLO-08" is changed to "TELLO-07"
- **THEN** the change is rejected

#### Scenario: Unknown drone
- **GIVEN** no drone with the given identity exists
- **WHEN** the drone is edited
- **THEN** the change is rejected as not found

### Requirement: Delete drone
The system SHALL move a deleted drone into the trash with its loans (REQ-016, REQ-034). A loaned drone SHALL NOT be deleted.

#### Scenario: Delete a drone without loans
- **GIVEN** the drone "TELLO-09" has never been loaned
- **WHEN** "TELLO-09" is deleted
- **THEN** "TELLO-09" is no longer listed
- **AND** "TELLO-09" is in the trash

#### Scenario: Drone has a returned loan
- **GIVEN** "TELLO-07" was loaned to "Group 3" and returned
- **WHEN** "TELLO-07" is deleted
- **THEN** "TELLO-07" is no longer listed and is in the trash
- **AND** the returned loan stays in the history

#### Scenario: Drone is loaned
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** "TELLO-07" is deleted
- **THEN** the deletion is rejected with a message that "TELLO-07" has to be returned first

#### Scenario: Drone is already in the trash
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** "TELLO-07" is deleted again
- **THEN** the request is answered as not found

### Requirement: Drone details
The system SHALL show a single drone with name, description and status, its active loan if there is one, and all its returned loans with student group, accessories, loan date and return date, the newest return first (REQ-018).

#### Scenario: Drone with an active and a returned loan
- **GIVEN** "TELLO-07" was loaned to "Group 4" and returned
- **AND** "TELLO-07" is now loaned to "Group 3"
- **WHEN** the details of "TELLO-07" are shown
- **THEN** the active loan of "Group 3" is shown
- **AND** the returned loan of "Group 4" is listed below it

#### Scenario: Drone that was never loaned
- **GIVEN** "TELLO-09" has never been loaned
- **WHEN** the details of "TELLO-09" are shown
- **THEN** "TELLO-09" is shown as Available without loans

#### Scenario: Unknown drone
- **GIVEN** no drone with the given identity exists
- **WHEN** its details are requested
- **THEN** the request is answered as not found

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

### Requirement: Drone trash
The system SHALL show the drones in the trash with their name, the date they were deleted and how many loans they have, the most recently deleted first (REQ-034). The details of a drone in the trash SHALL say that it is in the trash.

#### Scenario: Show the drone trash
- **GIVEN** "TELLO-07" with 2 returned loans was deleted on 20.08.2026
- **WHEN** the drone trash is shown
- **THEN** it lists "TELLO-07" with the date 20.08.2026 and 2 loans

#### Scenario: Empty drone trash
- **GIVEN** no drone is in the trash
- **WHEN** the drone trash is shown
- **THEN** the trash says that it is empty

#### Scenario: Open a drone in the trash
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** the details of "TELLO-07" are opened
- **THEN** the details say that "TELLO-07" is in the trash
- **AND** its loans are still shown

### Requirement: Restore drone
The system SHALL restore a drone from the trash with its loans and its defect (REQ-034).

#### Scenario: Restore a drone
- **GIVEN** "TELLO-07" with a returned loan is in the trash
- **WHEN** "TELLO-07" is restored
- **THEN** "TELLO-07" is listed again with its status
- **AND** its returned loan is still in the history

#### Scenario: Drone is not in the trash
- **GIVEN** "TELLO-08" is not in the trash
- **WHEN** "TELLO-08" is restored
- **THEN** the request is answered as not found

### Requirement: Delete drone permanently
The system SHALL delete a drone from the trash for good (REQ-034). The user SHALL choose whether its loans stay in the history under the drone's name or are deleted with it. Only a drone in the trash without an active loan can be deleted permanently.

#### Scenario: Keep the drone history
- **GIVEN** "TELLO-07" with a returned loan by "Group 3" is in the trash
- **WHEN** "TELLO-07" is deleted permanently and the history is kept
- **THEN** "TELLO-07" is no longer stored and not in the trash
- **AND** the history still shows the loan of "TELLO-07" by "Group 3"

#### Scenario: Delete the drone with the history
- **GIVEN** "TELLO-07" with a returned loan is in the trash and "TELLO-08" has a returned loan
- **WHEN** "TELLO-07" is deleted permanently together with its history
- **THEN** "TELLO-07" and its loans are no longer stored
- **AND** the history still shows the loan of "TELLO-08"

#### Scenario: Drone is not in the trash for good
- **GIVEN** "TELLO-08" is not in the trash
- **WHEN** "TELLO-08" is deleted permanently
- **THEN** the deletion is rejected

#### Scenario: No choice about the drone history
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** "TELLO-07" is deleted permanently without saying what happens to its history
- **THEN** the deletion is rejected

### Requirement: No changes to a drone in the trash
The system SHALL reject renaming a drone in the trash and reporting or repairing its defect (REQ-034). The drone has to be restored first.

#### Scenario: Change a drone in the trash
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** "TELLO-07" is renamed, a defect is reported or it is repaired
- **THEN** each change is rejected with a message that "TELLO-07" is in the trash
