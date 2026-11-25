# Design

## Context

`Dockerfile` (three stages, pinned images) and `docker-compose.yml` (project and container `drohnenverwaltung`, port 8080, volume `drohnenverwaltung-data`) exist since `docker-container` (REQ-032). The repository is public on GitHub. The app already takes the database path from configuration and runs migrations at start.

## Decisions

1. **Compose variables with defaults.** `${DROHNENVERWALTUNG_PORT:-8080}` and `${DROHNENVERWALTUNG_IMAGE:-drohnenverwaltung}`; Docker Compose reads `.env` next to the file. `.env` stays out of Git, `.env.example` documents it.
2. **Separate server compose file.** `docker-compose.server.yml` has no `build` and uses `${DROHNENVERWALTUNG_IMAGE:-ghcr.io/antongschwendtner/drohnenverwaltung:latest}` with `pull_policy: always` on `up`. A server needs only this file (and optionally `.env`).
3. **Multi-platform build without emulating the toolchains.** The frontend and backend stages run on `$BUILDPLATFORM`; `dotnet publish -a $TARGETARCH` produces the framework-dependent app for the target, the browser files are platform-independent. Only the runtime stage uses the target platform, so an arm64 image builds fast on amd64 runners.
4. **Workflow.** `.github/workflows/docker-image.yml`: on push to `main` and manually; `docker/setup-qemu-action`, `docker/setup-buildx-action`, `docker/login-action` with `GITHUB_TOKEN` and `packages: write`, `docker/metadata-action` (tags `latest` and `sha-<short>`), `docker/build-push-action` with `linux/amd64,linux/arm64` and the GitHub Actions cache. Pull requests only build (no push), so a broken Dockerfile shows before the merge.
5. **Health.** `GET /api/health` calls `Database.CanConnectAsync()` and answers `{ "status": "healthy" }` or 503 ProblemDetails. No extra package. The runtime image has no curl, so the compose files define no Docker `HEALTHCHECK`; monitoring or a reverse proxy calls the endpoint.

## Risks / Trade-offs

- [The GHCR package of a new repository may be private] → README: make the package public once in the GitHub package settings, or `docker login ghcr.io` on the server.
- [Building on push uses CI minutes] → Public repositories have free minutes; the cache keeps builds short.
