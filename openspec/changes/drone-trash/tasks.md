# Tasks

## 1. Backend (REQ-034)

- [x] 1.1 `Drone.DeletedAt`, optional `Loan.DroneId`, `Loan.FormerDroneName`, migration; delete to the trash, trash list, restore, permanent delete with history choice, refusals for drones in the trash, no loan of a drone in the trash; tests for every scenario of the drone and loan deltas (#216)

## 2. Frontend (REQ-034)

- [x] 2.1 Delete dialog text, drone trash section with restore and permanent delete, trash hint on the drone detail page, drone names without link; component tests for "Show the drone trash", "Empty drone trash", "Restore a drone", both permanent choices, "Open a drone in the trash", "Drone deleted, history kept" (#217)

## 3. Documentation

- [ ] 3.1 REQ-034 in `docs/requirements.md`, domain model and rules, `openspec/config.yaml`, README, `AGENTS.md` (several tasks per branch) (#218)
