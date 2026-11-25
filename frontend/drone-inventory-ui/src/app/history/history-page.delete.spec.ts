import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { HistoryPage } from './history-page';

/** Scenarios of the requirement "Delete the history" (REQ-040). */
describe('HistoryPage delete history', () => {
  let fixture: ComponentFixture<HistoryPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const returned: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-10',
    returnDate: '2026-08-12',
    status: 'Returned',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/loans?status=Returned').flush([returned, { ...returned, id: 2, droneName: 'TELLO-08' }]);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Delete the history', async () => {
    (element.querySelector('button.delete-history') as HTMLButtonElement).click();
    await settle();
    expect(element.querySelector('[role="alertdialog"]')?.textContent).toContain('All 2 returned loans are deleted for good');
    (element.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();

    http.expectOne({ method: 'DELETE', url: '/api/loans/history' }).flush({ deletedLoans: 2 });
    await settle();

    expect(element.querySelectorAll('tbody tr').length).toBe(0);
    expect(element.textContent).toContain('No returned loans yet');
  });

  it('Cancel deleting the history', async () => {
    (element.querySelector('button.delete-history') as HTMLButtonElement).click();
    await settle();
    (element.querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle();

    http.expectNone({ method: 'DELETE' });
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
    expect(document.activeElement).toBe(element.querySelector('button.delete-history'));
  });
});
