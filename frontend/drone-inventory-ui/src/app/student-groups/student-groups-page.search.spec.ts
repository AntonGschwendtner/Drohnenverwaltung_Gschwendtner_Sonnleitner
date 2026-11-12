import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentGroupsPage } from './student-groups-page';

/** Scenarios of the requirement "Search student groups" (REQ-011). */
describe('StudentGroupsPage search', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    TestBed.inject(HttpTestingController)
      .expectOne('/api/student-groups')
      .flush([
        { id: 3, name: 'Group 3' },
        { id: 7, name: 'Robotics Club' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function names(): string[] {
    return Array.from(element.querySelectorAll('tbody tr td:first-child')).map((cell) => cell.textContent?.trim() ?? '');
  }

  async function search(text: string): Promise<void> {
    const input = element.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Search by part of the name', async () => {
    await search('group');

    expect(names()).toEqual(['Group 3']);
  });

  it('No group matches', async () => {
    await search('xyz');

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.empty')?.textContent).toContain('No student group matches the search.');
  });

  it('shows every group again when the search is cleared', async () => {
    await search('xyz');
    await search('');

    expect(names()).toEqual(['Group 3', 'Robotics Club']);
  });
});
