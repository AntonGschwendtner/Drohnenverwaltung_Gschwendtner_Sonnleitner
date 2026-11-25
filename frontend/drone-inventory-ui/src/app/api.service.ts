import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type DroneStatus = 'Available' | 'Loaned' | 'Defective';
export type LoanStatus = 'Active' | 'Returned';
export type LoanItemType = 'Battery' | 'Propeller';

export interface Drone {
  id: number;
  name: string;
  status: DroneStatus;
  description: string;
  /** The reported defect while the drone is Defective (REQ-024). */
  defectNote?: string | null;
  /** The day the drone went into the trash, or null (REQ-034). */
  deletedAt?: string | null;
  /** The next reservation of today or later, for the hints (REQ-029). */
  nextReservationDate?: string | null;
  nextReservationGroup?: string | null;
}

export interface CreateDroneRequest {
  name: string;
  description: string;
}

export interface StudentGroupMember {
  id: number;
  name: string;
  isLeader: boolean;
}

/** A student group with its members in alphabetical order and the name of its leader (REQ-031). */
export interface StudentGroup {
  id: number;
  name: string;
  members: StudentGroupMember[];
  leaderName: string | null;
  /** The day the group went into the trash, or null (REQ-033). */
  deletedAt?: string | null;
}

/** A group in the trash with what a permanent delete would take with it (REQ-033). */
/** A drone kept for a student group on one day (REQ-027, REQ-028). */
export interface Reservation {
  id: number;
  droneId: number;
  droneName: string;
  studentGroupId: number;
  studentGroupName: string;
  date: string;
  isToday: boolean;
  droneIsLoaned: boolean;
}

export interface CreateReservationRequest {
  droneId: number | null;
  studentGroupId: number | null;
  date: string | null;
}

/** Loans and loan days of one drone or student group in the period (REQ-030). */
export interface Usage {
  id: number;
  name: string;
  loanCount: number;
  loanDays: number;
}

export interface Statistics {
  from: string;
  to: string;
  loanCount: number;
  activeCount: number;
  averageDays: number | null;
  drones: Usage[];
  studentGroups: Usage[];
}

/** The parts of the general reset; only what is true happens (REQ-038). */
export interface ResetRequest {
  returnAllDrones: boolean;
  deleteAllDrones: boolean;
  deleteAllStudentGroups: boolean;
  deleteHistory: boolean;
}

/** A drone in the trash with the number of loans a permanent delete would take with it (REQ-034). */
export interface TrashedDrone {
  id: number;
  name: string;
  deletedAt: string;
  loanCount: number;
}

export interface TrashedStudentGroup {
  id: number;
  name: string;
  deletedAt: string;
  loanCount: number;
  memberCount: number;
}

export interface CreateStudentGroupRequest {
  name: string;
}

export interface Loan {
  id: number;
  /** Null once the drone was deleted for good with its history kept; the name stays (REQ-034). */
  droneId: number | null;
  droneName: string;
  /** Null once the group was deleted for good with its history kept; the name stays (REQ-033). */
  studentGroupId: number | null;
  studentGroupName: string;
  batteries: number;
  propellers: number;
  loanDate: string;
  returnDate: string | null;
  status: LoanStatus;
  /** Full days since the loan date, only for an active loan (REQ-012). */
  daysActive?: number | null;
  /** True when an active loan without a planned return date runs longer than 7 days (REQ-012). */
  isLongRunning?: boolean;
  note?: string | null;
  /** Planned return date as yyyy-MM-dd (REQ-022). */
  dueDate?: string | null;
  /** True when an active loan is past its planned return date (REQ-022). */
  isOverdue?: boolean;
  /** The planned return date is today (REQ-035). */
  isDueToday?: boolean;
  /** Full days since the planned return date of an overdue loan, otherwise null (REQ-035). */
  daysOverdue?: number | null;
  /** Accessories that did not come back with the return (REQ-023). */
  missingBatteries?: number;
  missingPropellers?: number;
}

export interface ReturnLoanRequest {
  items: { type: LoanItemType; returnedQuantity: number | null }[];
  defect: string | null;
}

export interface CreateLoanItemRequest {
  type: LoanItemType;
  quantity: number | null;
}

/**
 * Values can be empty, because the backend checks them and answers with a message.
 */
export interface CreateLoanRequest {
  droneId: number | null;
  studentGroupId: number | null;
  items: CreateLoanItemRequest[];
  /** Optional note, at most 500 characters (REQ-021). */
  note?: string | null;
  /** Optional planned return date as yyyy-MM-dd (REQ-022). */
  dueDate?: string | null;
}

/**
 * Reads the message the backend sends with a rejection, so that the views do not repeat its rules.
 */
export function readErrorMessage(
  error: unknown,
  fallback = 'The request failed. Check that the backend is running and try again.',
): string {
  const detail = error instanceof HttpErrorResponse ? error.error?.detail : undefined;

  return typeof detail === 'string' && detail.length > 0 ? detail : fallback;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  listDrones(): Observable<Drone[]> {
    return this.http.get<Drone[]>('/api/drones');
  }

  getDrone(id: number): Observable<Drone> {
    return this.http.get<Drone>(`/api/drones/${id}`);
  }

  createDrone(request: CreateDroneRequest): Observable<Drone> {
    return this.http.post<Drone>('/api/drones', request);
  }

  updateDrone(id: number, request: CreateDroneRequest): Observable<Drone> {
    return this.http.put<Drone>(`/api/drones/${id}`, request);
  }

  reportDefect(id: number, description: string): Observable<Drone> {
    return this.http.post<Drone>(`/api/drones/${id}/defect`, { description });
  }

  repairDrone(id: number): Observable<Drone> {
    return this.http.post<Drone>(`/api/drones/${id}/repair`, null);
  }

  deleteDrone(id: number): Observable<void> {
    return this.http.delete<void>(`/api/drones/${id}`);
  }

  getStudentGroup(id: number): Observable<StudentGroup> {
    return this.http.get<StudentGroup>(`/api/student-groups/${id}`);
  }

  listStudentGroups(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>('/api/student-groups');
  }

  createStudentGroup(request: CreateStudentGroupRequest): Observable<StudentGroup> {
    return this.http.post<StudentGroup>('/api/student-groups', request);
  }

  updateStudentGroup(id: number, request: CreateStudentGroupRequest): Observable<StudentGroup> {
    return this.http.put<StudentGroup>(`/api/student-groups/${id}`, request);
  }

  deleteStudentGroup(id: number): Observable<void> {
    return this.http.delete<void>(`/api/student-groups/${id}`);
  }

  listReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>('/api/reservations');
  }

  createReservation(request: CreateReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>('/api/reservations', request);
  }

  cancelReservation(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reservations/${id}`);
  }

  /** Without a period the backend takes this school year (REQ-030). */
  getStatistics(period: { from?: string; to?: string }): Observable<Statistics> {
    return this.http.get<Statistics>('/api/statistics', { params: { ...period } });
  }

  reset(request: ResetRequest): Observable<unknown> {
    return this.http.post('/api/admin/reset', request);
  }

  /** Replaces all data with a backup file (REQ-039). */
  restoreBackup(file: File): Observable<void> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<void>('/api/admin/restore', form);
  }

  /** Deletes all returned loans (REQ-040). */
  deleteHistory(): Observable<{ deletedLoans: number }> {
    return this.http.delete<{ deletedLoans: number }>('/api/loans/history');
  }

  listDroneTrash(): Observable<TrashedDrone[]> {
    return this.http.get<TrashedDrone[]>('/api/drones/trash');
  }

  restoreDrone(id: number): Observable<Drone> {
    return this.http.post<Drone>(`/api/drones/${id}/restore`, null);
  }

  /** Deletes a drone from the trash for good; its loans stay in the history ("keep") or go with it ("delete"). */
  deleteDronePermanently(id: number, history: 'keep' | 'delete'): Observable<void> {
    return this.http.delete<void>(`/api/drones/${id}/permanent`, { params: { history } });
  }

  listTrash(): Observable<TrashedStudentGroup[]> {
    return this.http.get<TrashedStudentGroup[]>('/api/student-groups/trash');
  }

  restoreStudentGroup(id: number): Observable<StudentGroup> {
    return this.http.post<StudentGroup>(`/api/student-groups/${id}/restore`, null);
  }

  /** Deletes a group from the trash for good; its loans stay in the history ("keep") or go with it ("delete"). */
  deleteStudentGroupPermanently(id: number, history: 'keep' | 'delete'): Observable<void> {
    return this.http.delete<void>(`/api/student-groups/${id}/permanent`, { params: { history } });
  }

  addMember(studentGroupId: number, name: string): Observable<StudentGroupMember> {
    return this.http.post<StudentGroupMember>(`/api/student-groups/${studentGroupId}/members`, { name });
  }

  removeMember(studentGroupId: number, memberId: number): Observable<void> {
    return this.http.delete<void>(`/api/student-groups/${studentGroupId}/members/${memberId}`);
  }

  /** Makes a member the group leader, or leaves the group without a leader with null (REQ-031). */
  setLeader(studentGroupId: number, memberId: number | null): Observable<StudentGroup> {
    return this.http.put<StudentGroup>(`/api/student-groups/${studentGroupId}/leader`, { memberId });
  }

  listLoans(status: LoanStatus): Observable<Loan[]> {
    return this.http.get<Loan[]>('/api/loans', { params: { status } });
  }

  /** Active and returned loans of one drone or one student group, the active loan first (REQ-018, REQ-019). */
  listLoansFor(filter: { droneId?: number; studentGroupId?: number }): Observable<Loan[]> {
    const params: Record<string, number> = {};
    if (filter.droneId !== undefined) {
      params['droneId'] = filter.droneId;
    }
    if (filter.studentGroupId !== undefined) {
      params['studentGroupId'] = filter.studentGroupId;
    }
    return this.http.get<Loan[]>('/api/loans', { params });
  }

  createLoan(request: CreateLoanRequest): Observable<Loan> {
    return this.http.post<Loan>('/api/loans', request);
  }

  /** Without a request everything counts as returned (REQ-023); a defect makes the drone Defective (REQ-024). */
  returnLoan(id: number, request: ReturnLoanRequest | null = null): Observable<Loan> {
    return this.http.post<Loan>(`/api/loans/${id}/return`, request);
  }
}
