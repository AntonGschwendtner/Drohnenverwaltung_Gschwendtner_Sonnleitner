# Spec Delta

## Purpose

Manages the student groups that can loan drones and are responsible for what they have loaned.

## ADDED Requirements

### Requirement: Create student group
The system SHALL allow a student group to be created with a unique name (REQ-003).

#### Scenario: Create a student group
- **GIVEN** no student group named "Group 3" exists
- **WHEN** a student group is created with the name "Group 3"
- **THEN** the student group is stored

#### Scenario: Name is missing
- **GIVEN** the system is running
- **WHEN** a student group is created without a name
- **THEN** the creation is rejected

#### Scenario: Name already exists
- **GIVEN** a student group named "Group 3" exists
- **WHEN** another student group is created with the name "Group 3"
- **THEN** the creation is rejected

### Requirement: List student groups
The system SHALL list all student groups with their names, so that a group can be chosen for a loan (REQ-003).

#### Scenario: List student groups
- **GIVEN** the student group "Group 3" exists
- **WHEN** the student groups are listed
- **THEN** the list contains "Group 3"
