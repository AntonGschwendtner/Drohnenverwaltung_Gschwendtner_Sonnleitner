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

  createDrone(request: CreateDroneRequest): Observable<Drone> {
    return this.http.post<Drone>('/api/drones', request);
  }

  listStudentGroups(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>('/api/student-groups');
  }

  createStudentGroup(request: CreateStudentGroupRequest): Observable<StudentGroup> {
    return this.http.post<StudentGroup>('/api/student-groups', request);
  }

  listLoans(status: LoanStatus): Observable<Loan[]> {
    return this.http.get<Loan[]>('/api/loans', { params: { status } });
  }

  createLoan(request: CreateLoanRequest): Observable<Loan> {
    return this.http.post<Loan>('/api/loans', request);
  }

  returnLoan(id: number): Observable<Loan> {
    return this.http.post<Loan>(`/api/loans/${id}/return`, null);
  }
}
