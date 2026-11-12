# Tasks

## 1. Drones (REQ-015, REQ-016)

- [x] 1.1 `PUT /api/drones/{id}` with shared name validation; tests for "Correct a name", "Edit a loaned drone", "Name already used", "Unknown drone" (#99)
- [x] 1.2 `DELETE /api/drones/{id}`, rejected when any loan exists; tests for "Delete a drone without loans", "Drone has a returned loan", "Drone is loaned" (#100)
- [ ] 1.3 Drone page: edit inline and delete with confirmation, English and German; component tests for saving, a rejected delete and cancelling (#101)

## 2. Student groups (REQ-017)

- [ ] 2.1 `PUT /api/student-groups/{id}`; tests for "Correct a name", "Name already used", "Unknown student group" (#102)
- [ ] 2.2 `DELETE /api/student-groups/{id}`; tests for "Delete a group without loans", "Group has loans" (#103)
- [ ] 2.3 Student group page: edit and delete like the drone page; component tests (#104)

## 3. Documentation

- [ ] 3.1 README (features, API table) (#105)
