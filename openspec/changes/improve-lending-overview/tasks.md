# Tasks

## 1. Loan duration in the backend (REQ-012)

- [x] 1.1 Add `daysActive` and `isLongRunning` to the loan response, computed with `TimeProvider`; tests for 0, exactly 7 and 9 days and for returned loans (scenarios "New loan", "Loan running exactly 7 days", "Long-running loan") (#81)

## 2. Loan page (REQ-012, REQ-013)

- [ ] 2.1 Show the days and the long-running mark in the active loans list, English and German; component test for both cases (#82)
- [ ] 2.2 Add the return confirmation dialog with drone and group name; component tests for "Confirm the return" and "Cancel the return" (no request sent) (#83)

## 3. Search and filter (REQ-011)

- [ ] 3.1 Drone page: name search and status filter with a no-match hint; tests for "Search by part of the name", "Filter by status", "No drone matches" (#84)
- [ ] 3.2 Student group page: name search with a no-match hint; tests for both scenarios (#85)
- [ ] 3.3 History page: search by drone or group name with a no-match hint; tests for both scenarios (#86)

## 4. Status overview (REQ-014)

- [ ] 4.1 Drone page: overview with all, available and loaned drones; tests for "Overview after a loan" and "Overview ignores the search" (#87)

## 5. Documentation

- [ ] 5.1 Update the README (features, API response fields) and check the walkthrough on the test example (#88)
