# Tasks

## 1. Backend serves the app (REQ-032)

- [ ] 1.1 Static files and app fallback outside `/api` when the built app is present; integration tests for "Open a page directly", "Unknown API address" and unchanged behavior without the built app (#184)

## 2. Container (REQ-032)

- [ ] 2.1 `Dockerfile` (multi-stage, pinned images), `.dockerignore` and `docker-compose.yml` with the volume `drohnenverwaltung-data`; build and run the image and check "Open the app", "Open a page directly", "Unknown API address", "First start" and "Restart the container" with HTTP requests (#185)

## 3. Documentation

- [ ] 3.1 README section "Mit Docker starten" (including phone access in the same network), REQ-032 in `docs/requirements.md`; check "Start without Docker" by following the README (#186)
