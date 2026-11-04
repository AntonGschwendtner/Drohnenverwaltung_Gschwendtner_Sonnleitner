# Project Architecture

## Technology Stack
- Backend: C#, ASP.NET Core 10 Web API
- Persistence: Entity Framework Core, SQLite
- Frontend: Angular, TypeScript
- API: REST/JSON

## Architecture Overview

```text
Angular Frontend (frontend/drone-inventory-ui)
    |
    | REST/JSON
    v
ASP.NET Core Web API (backend/DroneInventory.Api)
    |
    v
Entity Framework Core
    |
    v
SQLite
```

## Rules
- Business logic and validation belong in the backend.
- The frontend must never access the database directly.
- Use dependency injection in the backend.
- Use async APIs where appropriate.
- OpenSpec specifications are the source of truth for requirements.
- Changing behavior means changing the spec first.
- Use the domain terms Drone, StudentGroup, Loan and LoanItem everywhere.

## Project Management
- Requirements are managed in OpenSpec.
- Use GitHub Issues and the GitHub Project `Gschwendtner_Sonnleitner_Drohnenverwaltung` (number 4, owner `AntonGschwendtner`) for all work.
- Create issues with `/openspec-to-github`, implement with `/openspec-apply-with-github`, archive with `/openspec-archive-with-github`.
- Implement one task per run: one issue, one branch, one pull request.
- Create a new branch from `main` for every feature, named after it, such as `feature/16-loan-api`.
- Merge into `main` through the pull request as soon as the feature is finished, its tests pass and its review has no open findings.
- Review every pull request against its spec before merging. The review may be done by an AI, is posted as a pull request comment and is labeled as an AI review.
