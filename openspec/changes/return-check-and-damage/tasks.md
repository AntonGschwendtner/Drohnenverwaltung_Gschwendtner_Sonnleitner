# Tasks

## 1. Data (REQ-023, REQ-024)

- [x] 1.1 Add `Drone.DefectNote` and `LoanItem.ReturnedQuantity` with a migration that fills `ReturnedQuantity` for old returns; entity tests (#145)

## 2. Defects (REQ-024)

- [ ] 2.1 Status Defective in the drone list; tests for all three "List drones" scenarios (#146)
- [ ] 2.2 `POST /api/drones/{id}/defect` and `/repair`; tests for "Report a defect", "Description is missing", "Drone is loaned", "Repair a drone" (#147)
- [ ] 2.3 Reject loans of defective drones; test for "Loan a defective drone" (#148)

## 3. Return check (REQ-023, REQ-024)

- [ ] 3.1 Return body with returned quantities, missing parts in the loan response; tests for "Everything returned", "Battery missing", "More returned than loaned", "Negative quantity" (#149)
- [ ] 3.2 Defect with the return in one transaction; tests for "Return a loan" and "Return with a defect", plus the existing return tests (#150)

## 4. Frontend

- [ ] 4.1 Return dialog with quantities and a damage field, English and German; component tests for "Dialog suggests the loaned quantities", a full return, a missing battery and a defect (#151)
- [ ] 4.2 Defective badge, status filter and overview count, report and repair actions on the drone page; missing parts in the history; component tests including "Overview counts defective drones" (#152)

## 5. Documentation

- [ ] 5.1 Domain model, domain rules in `openspec/config.yaml`, Out of Scope in `docs/requirements.md`, README (#153)
