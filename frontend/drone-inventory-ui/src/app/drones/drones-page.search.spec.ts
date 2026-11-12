import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { matchesSearch } from '../shared/search-field';
import { DronesPage } from './drones-page';

/** Scenarios of the requirement "Search and filter drones" (REQ-011). */
describe('DronesPage search and filter', () => {
  let fixture: ComponentFixture<DronesPage>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DronesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    TestBed.inject(HttpTestingController)
      .expectOne('/api/drones')
      .flush([
        { id: 1, name: 'TELLO-07', status: 'Loaned', description: '' },
        { id: 2, name: 'MAVIC-02', status: 'Available', description: '' },
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

  async function filter(label: string): Promise<void> {
    const button = Array.from(element.querySelectorAll<HTMLButtonElement>('.segmented button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    button?.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Search by part of the name', async () => {
    await search('tello');

    expect(names()).toEqual(['TELLO-07']);
  });

  it('Filter by status', async () => {
    await filter('Available');

    expect(names()).toEqual(['MAVIC-02']);
    expect(element.querySelector('.segmented [aria-pressed="true"]')?.textContent?.trim()).toBe('Available');
  });

  it('applies search and status filter together', async () => {
    await search('tello');
    await filter('Available');

    expect(names()).toEqual([]);
  });

  it('No drone matches', async () => {
    await search('xyz');

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.empty')?.textContent).toContain('No drone matches the search.');
  });

  it('shows every drone again when the search is cleared', async () => {
    await search('xyz');
    await search('');

    expect(names()).toEqual(['TELLO-07', 'MAVIC-02']);
  });
});

describe('matchesSearch', () => {
  it('ignores upper and lower case and surrounding spaces', () => {
    expect(matchesSearch('TELLO-07', '  tello ')).toBe(true);
    expect(matchesSearch('Group 3', 'GROUP')).toBe(true);
    expect(matchesSearch('TELLO-07', 'mavic')).toBe(false);
  });

  it('matches everything for an empty search', () => {
    expect(matchesSearch('TELLO-07', '')).toBe(true);
    expect(matchesSearch('TELLO-07', '   ')).toBe(true);
  });
});
