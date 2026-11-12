import { Routes } from '@angular/router';
import { DroneDetailPage } from './drones/drone-detail-page';
import { DronesPage } from './drones/drones-page';
import { HistoryPage } from './history/history-page';
import { LoansPage } from './loans/loans-page';
import { StudentGroupDetailPage } from './student-groups/student-group-detail-page';
import { StudentGroupsPage } from './student-groups/student-groups-page';

// The titles are text keys, I18nTitleStrategy shows them in the chosen language.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'drones' },
  { path: 'drones', title: 'nav.drones', component: DronesPage },
  { path: 'drones/:id', title: 'drones.detailTitle', component: DroneDetailPage },
  { path: 'student-groups', title: 'nav.studentGroups', component: StudentGroupsPage },
  { path: 'student-groups/:id', title: 'groups.detailTitle', component: StudentGroupDetailPage },
  { path: 'loans', title: 'nav.loans', component: LoansPage },
  { path: 'history', title: 'nav.history', component: HistoryPage },
  { path: '**', redirectTo: 'drones' },
];
