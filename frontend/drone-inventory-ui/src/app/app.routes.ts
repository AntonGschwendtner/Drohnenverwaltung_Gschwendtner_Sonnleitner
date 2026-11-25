import { Routes } from '@angular/router';
import { DroneDetailPage } from './drones/drone-detail-page';
import { DronesPage } from './drones/drones-page';
import { HistoryPage } from './history/history-page';
import { LoansPage } from './loans/loans-page';
import { StudentGroupDetailPage } from './student-groups/student-group-detail-page';
import { StudentGroupsPage } from './student-groups/student-groups-page';
import { ReservationsPage } from './reservations/reservations-page';
import { StatisticsPage } from './statistics/statistics-page';
import { TodayPage } from './today/today-page';

// The titles are text keys, I18nTitleStrategy shows them in the chosen language.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'today' },
  { path: 'today', title: 'nav.today', component: TodayPage },
  { path: 'drones', title: 'nav.drones', component: DronesPage },
  { path: 'drones/:id', title: 'drones.detailTitle', component: DroneDetailPage },
  { path: 'student-groups', title: 'nav.studentGroups', component: StudentGroupsPage },
  { path: 'student-groups/:id', title: 'groups.detailTitle', component: StudentGroupDetailPage },
  { path: 'loans', title: 'nav.loans', component: LoansPage },
  { path: 'history', title: 'nav.history', component: HistoryPage },
  { path: 'reservations', title: 'nav.reservations', component: ReservationsPage },
  { path: 'statistics', title: 'nav.statistics', component: StatisticsPage },
  { path: '**', redirectTo: 'today' },
];
