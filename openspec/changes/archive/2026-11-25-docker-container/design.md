# Design

## Context

The backend (`backend/DroneInventory.Api`) runs migrations at startup and reads its SQLite connection string `DroneInventory` from configuration. The Angular app builds to `frontend/drone-inventory-ui/dist/drone-inventory-ui/browser` and calls the API with relative `/api` addresses; in development `proxy.conf.json` forwards them to port 5067. The app uses path routes (`/drones/7`), so the server must answer such paths with `index.html`.

## Goals / Non-Goals

**Goals:**
- `docker compose up --build` is the only command needed.
- Same image for the presentation laptop and a school server.

**Non-Goals:**
- HTTPS, registry publishing, CI builds (see proposal).

## Decisions

1. **Multi-stage `Dockerfile` in the repository root.** Stage 1 (Node image, version pinned to the one in the README) runs `npm ci` and `ng build`. Stage 2 (.NET SDK 10 image, exact tag) runs `dotnet publish -c Release`. Stage 3 (ASP.NET 10 runtime image, exact tag) copies the published backend and the built app into `wwwroot`. Alternative: nginx for the frontend plus the backend - rejected, the user asked for one container and one port is simpler for the QR codes.
2. **Serving the app from the backend.** `UseDefaultFiles` and `UseStaticFiles`, then a fallback to `index.html` for every path that does not start with `/api` and has no file extension. Unknown `/api` paths keep the normal 404 ProblemDetails. When `wwwroot` is missing (development), nothing changes.
3. **Data directory `/data`.** The image sets `ConnectionStrings__DroneInventory=Data Source=/data/droneinventory.db`; `docker-compose.yml` mounts the named volume `drohnenverwaltung-data` on `/data`. The directory belongs to the non-root `app` user of the runtime image.
4. **Port 8080.** The runtime image listens on 8080 by default; compose publishes `8080:8080`. `UseHttpsRedirection` stays: without an HTTPS port it does nothing.
5. **`.dockerignore`.** Excludes `node_modules`, `dist`, `.angular`, `bin`, `obj`, `*.db`, `.git` and `.claude`, so the build context is small and no local database ends up in the image.
6. **Verification.** The fallback and the `/api` 404 are covered by integration tests with a temporary `wwwroot`. The container scenarios are checked by building and running the image and calling it with HTTP requests; the commands and their output go into the pull request.

## Risks / Trade-offs

- [Docker Desktop must be running to build] → README says so; local development without Docker stays possible.
- [Image size from two toolchains] → Only the runtime stage ends up in the image.
- [Phone scanning needs the PC address instead of localhost] → README explains opening the app via the PC address in the same network.
