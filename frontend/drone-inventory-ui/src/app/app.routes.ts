import { Routes } from '@angular/router';
import { DronesPage } from './drones/drones-page';
import { HistoryPage } from './history/history-page';
import { LoansPage } from './loans/loans-page';
import { StudentGroupsPage } from './student-groups/student-groups-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'drones' },
  { path: 'drones', title: 'Drones', component: DronesPage },
  { path: 'student-groups', title: 'Student groups', component: StudentGroupsPage },
  { path: 'loans', title: 'Loans', component: LoansPage },
  { path: 'history', title: 'Loan history', component: HistoryPage },
  { path: '**', redirectTo: 'drones' },
];
