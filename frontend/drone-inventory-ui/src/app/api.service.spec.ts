import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService, readErrorMessage } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists drones', () => {
    service.listDrones().subscribe();

    const request = http.expectOne('/api/drones');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a drone', () => {
    const body = { name: 'TELLO-07', description: 'x' };
    service.createDrone(body).subscribe();

    const request = http.expectOne('/api/drones');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('lists student groups', () => {
    service.listStudentGroups().subscribe();

    const request = http.expectOne('/api/student-groups');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a student group', () => {
    service.createStudentGroup({ name: 'Group 3' }).subscribe();

    const request = http.expectOne('/api/student-groups');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Group 3' });
    request.flush({});
  });

  it('lists active loans', () => {
    service.listLoans('Active').subscribe();

    const request = http.expectOne('/api/loans?status=Active');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('lists the loan history', () => {
    service.listLoans('Returned').subscribe();

    const request = http.expectOne('/api/loans?status=Returned');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a loan with its items', () => {
    const body = {
      droneId: 1,
      studentGroupId: 2,
      items: [
        { type: 'Battery' as const, quantity: 4 },
        { type: 'Propeller' as const, quantity: 8 },
      ],
    };
    service.createLoan(body).subscribe();

    const request = http.expectOne('/api/loans');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('returns a loan', () => {
    service.returnLoan(7).subscribe();

    const request = http.expectOne('/api/loans/7/return');
    expect(request.request.method).toBe('POST');
    request.flush({});
  });
});

describe('readErrorMessage', () => {
  it('uses the message of the backend', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { detail: 'The drone "TELLO-07" is already loaned.' },
    });

    expect(readErrorMessage(error)).toBe('The drone "TELLO-07" is already loaned.');
  });

  it('falls back to a general message', () => {
    expect(readErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('backend');
    expect(readErrorMessage(new Error('x'))).toContain('backend');
  });
});
