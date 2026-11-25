## ADDED Requirements

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
