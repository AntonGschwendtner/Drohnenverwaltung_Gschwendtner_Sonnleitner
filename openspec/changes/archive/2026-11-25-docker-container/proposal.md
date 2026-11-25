# Proposal

## Why

Starting the application needs the .NET SDK, Node.js, two terminals and the right order. For the presentation, for the teacher and for a school server, it should start with one command on any machine with Docker. A single address also makes the QR codes on the drone cases work from a phone in the same network.

## What Changes

- A container image **drohnenverwaltung** contains frontend and backend together (REQ-032).
- The backend serves the built Angular app and the REST API on one port; addresses of the app such as `/drones/7` or `/loans?drone=7` open the app directly, unknown `/api` addresses stay "not found".
- The SQLite database lives in a data directory that is kept in a Docker volume, so data survives restarts and updates of the container. The first start creates an empty database.
- A `docker-compose.yml` starts the container `drohnenverwaltung` with port and volume; a `Dockerfile` builds the image from the repository.
- Local development (`dotnet run` and `npm start`) stays as it is.

## Capabilities

### New Capabilities

- `deployment`: running the whole application as one container with lasting data.

### Modified Capabilities

None. Drones, student groups and loans behave the same inside the container.

## Impact

- Backend: serving static files and the app fallback in `Program.cs`, only when the built frontend is present; the database path comes from configuration as before.
- New files: `Dockerfile`, `.dockerignore`, `docker-compose.yml` in the repository root.
- Docs: REQ-032, README section "Mit Docker starten".

## Out of Scope

- HTTPS inside the container; a school server would put a reverse proxy in front.
- Publishing the image to a registry (Docker Hub, GitHub Packages) and automatic builds in CI.
- Separate containers for frontend and backend, other databases than SQLite.
- Backups of the volume.
