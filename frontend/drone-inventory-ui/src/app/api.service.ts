import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type DroneStatus = 'Available' | 'Loaned';
export type LoanStatus = 'Active' | 'Returned';
export type LoanItemType = 'Battery' | 'Propeller';

export interface Drone {
  id: number;
  name: string;
  status: DroneStatus;
  description: string;
}

export interface CreateDroneRequest {
  name: string;
  description: string;
}

export interface StudentGroup {
  id: number;
  name: string;
}

export interface CreateStudentGroupRequest {
  name: string;
}

export interface Loan {
  id: number;
  droneId: number;
  droneName: string;
  studentGroupId: number;
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
