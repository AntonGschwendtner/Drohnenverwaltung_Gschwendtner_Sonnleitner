# Tasks

## 1. Backend (REQ-018, REQ-019)

- [x] 1.1 `GET /api/drones/{id}` and `GET /api/student-groups/{id}`; tests for "Drone that was never loaned", "Unknown drone", "Unknown student group" (#114)
- [x] 1.2 Filter `GET /api/loans` by `droneId` and `studentGroupId`, `status` optional with a filter; tests for "Loans of one drone", "Loans of one student group" and the order rule (#115)

## 2. Detail pages (REQ-018, REQ-019)

- [ ] 2.1 Drone detail page with active loan and history, linked from all lists; component tests for "Drone with an active and a returned loan" (#116)
- [ ] 2.2 Student group detail page, linked from all lists; component tests for "Group with active and returned loans" (#117)

## 3. Sorting (REQ-020)

- [x] 3.1 Shared sort helper with unit tests for names (case-insensitive), numbers and dates (#118)
- [ ] 3.2 Sortable headers with `aria-sort` on all four lists; component tests for "Sort by name", "Reverse the order", "Sort the history by return date" (#119)

## 4. Documentation

- [ ] 4.1 README (features, API table) (#120)
