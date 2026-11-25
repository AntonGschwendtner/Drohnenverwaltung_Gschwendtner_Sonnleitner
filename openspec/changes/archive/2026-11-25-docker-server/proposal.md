# Proposal

## Why

The container runs on any machine with Docker, but only from the source code and only on port 8080: changing the port means editing `docker-compose.yml`, and a server needs the whole repository to build the image. The user wants to load it onto a server without changing any code afterwards.

## What Changes

- **Server operation by configuration (REQ-041).** Port and image come from an `.env` file (`DROHNENVERWALTUNG_PORT`, `DROHNENVERWALTUNG_IMAGE`) with the current values as defaults; `.env.example` shows them.
- **Ready-made image.** A GitHub Actions workflow builds the image on every merge to `main` for `linux/amd64` and `linux/arm64` (for example a Raspberry Pi) and publishes it as `ghcr.io/antongschwendtner/drohnenverwaltung` with the tags `latest` and the commit. A `docker-compose.server.yml` starts it without source code: `docker compose -f docker-compose.server.yml up -d`; an update is `pull` and `up -d` again.
- **Health check.** `GET /api/health` answers 200 when the app and its database work, 503 otherwise, for monitoring or a reverse proxy.
- README: section "Auf einem Server betreiben" with both ways (with and without source code), update, port, HTTPS through a reverse proxy, backup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment`: configurable port and image, published multi-platform image, health check.

## Impact

- `docker-compose.yml` (variables), new `docker-compose.server.yml`, `.env.example`, `.github/workflows/docker-image.yml`; `Dockerfile` builds frontend and backend on the build platform for every target platform.
- Backend: `GET /api/health`.
- Docs: REQ-041, README.

## Out of Scope

- HTTPS inside the container (a reverse proxy in front, as before).
- Automatic updates on the server, orchestration such as Kubernetes.
- Login for the admin functions; the app stays for the school network.

## Decision (2026-11-25)

The user asked whether the image can be loaded onto a server, and if not, to make it so that no code has to change afterwards; built without a further question.
