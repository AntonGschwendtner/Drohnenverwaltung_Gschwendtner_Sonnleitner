## Purpose

Lets a student group reserve a drone for one day in advance, so the drone is kept for that group on that day, and lets reservations be listed and cancelled.

## ADDED Requirements

### Requirement: Create reservation
The system SHALL allow a drone to be reserved for a student group on one day (REQ-027). The day SHALL be today or later. A drone SHALL have at most one reservation per day. Drone and student group SHALL exist.

#### Scenario: Reserve a drone
- **GIVEN** today is 19.08.2026 and "TELLO-07" has no reservation on 21.08.2026
- **WHEN** "TELLO-07" is reserved for "Group 3" on 21.08.2026
- **THEN** the reservation is stored

#### Scenario: Day in the past
- **GIVEN** today is 19.08.2026
- **WHEN** "TELLO-07" is reserved for "Group 3" on 18.08.2026
- **THEN** the reservation is rejected

#### Scenario: Drone already reserved on that day
- **GIVEN** "TELLO-07" is reserved for "Group 3" on 21.08.2026
- **WHEN** "TELLO-07" is reserved for "Group 4" on 21.08.2026
- **THEN** the reservation is rejected

#### Scenario: Same drone on another day
- **GIVEN** "TELLO-07" is reserved for "Group 3" on 21.08.2026
- **WHEN** "TELLO-07" is reserved for "Group 4" on 22.08.2026
- **THEN** the reservation is stored

#### Scenario: Unknown drone or student group
- **GIVEN** the system is running
- **WHEN** a reservation is created for a drone or student group that does not exist
- **THEN** the reservation is rejected

#### Scenario: Two reservations at the same time
- **GIVEN** "TELLO-07" has no reservation on 21.08.2026
- **WHEN** two reservations of "TELLO-07" for 21.08.2026 are created at the same time
- **THEN** exactly one of them is stored

### Requirement: List and cancel reservations
The system SHALL list the reservations of today and later days with drone, student group and day, the earliest day first (REQ-028). A reservation SHALL be cancellable; a cancelled reservation SHALL no longer be listed or applied. Past reservations SHALL NOT be listed.

#### Scenario: List upcoming reservations
- **GIVEN** today is 19.08.2026
- **AND** reservations exist for 18.08.2026, 21.08.2026 and 20.08.2026
- **WHEN** the reservations are listed
- **THEN** the reservations of 20.08.2026 and 21.08.2026 are shown in this order

#### Scenario: Cancel a reservation
- **GIVEN** "TELLO-07" is reserved for "Group 3" on 21.08.2026
- **WHEN** the reservation is cancelled
- **THEN** it is no longer listed
- **AND** "TELLO-07" can be reserved for another group on 21.08.2026

#### Scenario: Reservation of a loaned drone
- **GIVEN** "TELLO-07" is loaned to "Group 4"
- **AND** "TELLO-07" is reserved for "Group 3" on 21.08.2026
- **WHEN** the reservations are listed
- **THEN** the reservation shows that "TELLO-07" is currently loaned
