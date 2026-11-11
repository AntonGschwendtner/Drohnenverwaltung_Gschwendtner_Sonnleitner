# drone Specification

## Purpose

Manages the drones that can be loaned and shows at any time whether each drone is available or loaned.

## Requirements

### Requirement: Create drone
The system SHALL allow a drone to be created with a unique name and a free-text description (REQ-001).

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

### Requirement: List drones
The system SHALL list all drones with name, status and description. The status SHALL be Available or Loaned and SHALL follow from the active loan (REQ-002).

#### Scenario: Drone without an active loan
- **GIVEN** the drone "TELLO-07" has no active loan
- **WHEN** the drones are listed
- **THEN** "TELLO-07" is shown as Available

#### Scenario: Drone with an active loan
- **GIVEN** the drone "TELLO-07" has an active loan
- **WHEN** the drones are listed
- **THEN** "TELLO-07" is shown as Loaned
