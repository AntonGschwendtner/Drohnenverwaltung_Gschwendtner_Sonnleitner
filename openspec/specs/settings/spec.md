# settings Specification

## Purpose
Collects the settings of the application in one pop-up: language, light or dark mode, the general reset and backup and restore of all data.

## Requirements

### Requirement: Settings dialog
The settings SHALL open as a dialog in the middle of the screen from a button in the header, without changing the address (REQ-037). An X at the top right SHALL close it without changes; "Apply" SHALL apply the choices and close it. The dialog SHALL offer the language (German, English) and the mode (light, dark).

#### Scenario: Open the settings
- **GIVEN** the drone page is open
- **WHEN** the user clicks the settings button
- **THEN** the settings dialog is shown
- **AND** the address of the page stays the same

#### Scenario: Close without changes
- **GIVEN** the settings dialog is open in English and the user chose German
- **WHEN** the user clicks the X
- **THEN** the dialog closes and the app stays in English

#### Scenario: Apply language and mode
- **GIVEN** the settings dialog is open in English and light mode
- **WHEN** the user chooses German and dark mode and clicks "Apply"
- **THEN** the dialog closes and the app is shown in German and dark mode

### Requirement: General reset
The settings SHALL offer a general reset with the separate choices "Return all drones", "Delete all drones", "Delete all student groups" and "Delete the whole history" (REQ-038). Only the chosen parts SHALL be done, after a confirmation that lists them. Deleting drones or student groups SHALL delete their active loans and keep their returned loans in the history under their names.

#### Scenario: Return all drones
- **GIVEN** "TELLO-07" and "TELLO-08" are loaned
- **WHEN** the general reset with "Return all drones" is applied and confirmed
- **THEN** no loan is active and both loans are in the history with today's return date

#### Scenario: Delete all drones and groups
- **GIVEN** "TELLO-07" was returned by "Group 3", and "TELLO-08" and "Group 4" exist
- **WHEN** the general reset with "Delete all drones" and "Delete all student groups" is applied and confirmed
- **THEN** no drone and no student group is listed and the trash is empty
- **AND** the history still shows the loan of "TELLO-07" by "Group 3"

#### Scenario: Delete everything
- **GIVEN** drones, student groups and loans exist
- **WHEN** the general reset with all four choices is applied and confirmed
- **THEN** no drone, student group or loan is stored

#### Scenario: Nothing chosen
- **GIVEN** no reset choice is ticked
- **WHEN** a general reset is requested
- **THEN** the request is rejected and nothing changes

#### Scenario: Reset not confirmed
- **GIVEN** "Delete all drones" is ticked in the settings
- **WHEN** the user clicks "Apply" and cancels the confirmation
- **THEN** nothing is deleted

### Requirement: Backup and restore
The settings SHALL download a backup of all data as one file (REQ-039). Restoring a chosen backup file SHALL replace all data after a confirmation. Only a backup of this application SHALL be accepted; a backup of an older version SHALL be brought up to date.

#### Scenario: Download a backup
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** the user downloads a backup
- **THEN** a file is saved that contains "TELLO-07"

#### Scenario: Restore a backup
- **GIVEN** a backup was downloaded while "TELLO-07" existed, and afterwards "TELLO-07" was deleted and "TELLO-08" created
- **WHEN** the backup is restored
- **THEN** "TELLO-07" is listed and "TELLO-08" is not

#### Scenario: Not a backup
- **GIVEN** a text file or a database of another application
- **WHEN** it is restored
- **THEN** the restore is rejected and the data stays unchanged
