# deployment Specification

## Purpose
Runs the whole drone lending application, user interface and REST API, as one container whose data lasts across restarts.

## Requirements

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

### Requirement: Server operation by configuration
The port and the image of the container SHALL be set by configuration, without changing code or the compose files (REQ-041). Without configuration the container SHALL use port 8080 and the locally built image.

#### Scenario: Other port
- **GIVEN** the configuration sets the port 9000
- **WHEN** the container is started
- **THEN** the app is reachable on port 9000

#### Scenario: Default configuration
- **GIVEN** there is no configuration
- **WHEN** the container is started
- **THEN** the app is reachable on port 8080

### Requirement: Published image
Every change merged into the main branch SHALL publish a ready-made image of the application for the platforms linux/amd64 and linux/arm64, so that a server can start the application without the source code (REQ-041).

#### Scenario: Start on a server without source code
- **GIVEN** a server with Docker, the server compose file and the published image
- **WHEN** the application is started with the server compose file
- **THEN** the app is reachable and keeps its data in the volume

#### Scenario: Update on a server
- **GIVEN** a newer image was published
- **WHEN** the server pulls the image and starts the container again
- **THEN** the new version runs with the same data

### Requirement: Health check
The application SHALL answer a health request with success when it and its database work, and with "service unavailable" otherwise (REQ-041).

#### Scenario: Healthy
- **GIVEN** the app and its database are running
- **WHEN** the health is requested
- **THEN** the answer is success

#### Scenario: Database not reachable
- **GIVEN** the database cannot be opened
- **WHEN** the health is requested
- **THEN** the answer is "service unavailable"
