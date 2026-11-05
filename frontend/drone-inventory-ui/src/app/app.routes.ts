import { Routes } from '@angular/router';
import { PlannedPage } from './planned-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'drones' },
  { path: 'drones', title: 'Drones', component: PlannedPage },
  { path: 'student-groups', title: 'Student groups', component: PlannedPage },
  { path: 'loans', title: 'Loans', component: PlannedPage },
  { path: 'history', title: 'Loan history', component: PlannedPage },
  { path: '**', redirectTo: 'drones' },
];
