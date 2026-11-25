## Purpose

Runs the whole drone lending application, user interface and REST API, as one container whose data lasts across restarts.

## ADDED Requirements

### Requirement: One container for the application
The application SHALL be delivered as one container image named "drohnenverwaltung" that serves the user interface and the REST API under the same address and port (REQ-032).

#### Scenario: Open the app
- **GIVEN** the container "drohnenverwaltung" is running and publishes port 8080
- **WHEN** a browser opens http://localhost:8080
- **THEN** the drone lending app is shown
- **AND** its lists are loaded from the REST API under the same address

#### Scenario: Open a page directly
- **GIVEN** the container is running and the drone with the identity 7 exists
- **WHEN** a browser opens http://localhost:8080/drones/7 directly, for example from a bookmark or a QR code
- **THEN** the app shows the details of that drone

#### Scenario: Unknown API address
- **GIVEN** the container is running
- **WHEN** a request is sent to an address below /api that does not exist
- **THEN** the request is answered as not found
- **AND** the answer is not the app page

### Requirement: Data lasts across restarts
The container SHALL store its database in a data directory that can be kept outside the container, so that drones, student groups and loans survive a restart or a new version of the image (REQ-032). A first start with an empty data directory SHALL create an empty database.

#### Scenario: First start
- **GIVEN** the data directory is empty
- **WHEN** the container starts
- **THEN** the app shows no drones, no student groups and no loans

#### Scenario: Restart the container
- **GIVEN** the drone "TELLO-07" was created and the data directory is kept in a volume
- **WHEN** the container is removed and started again with the same volume
- **THEN** "TELLO-07" is still listed

### Requirement: Local development unchanged
Starting the backend and the frontend separately for development SHALL keep working as before, without Docker (REQ-032).

#### Scenario: Start without Docker
- **GIVEN** the .NET SDK and Node.js are installed
- **WHEN** the backend and the frontend are started as described in the README
- **THEN** the app is shown on the development address and reaches the REST API
