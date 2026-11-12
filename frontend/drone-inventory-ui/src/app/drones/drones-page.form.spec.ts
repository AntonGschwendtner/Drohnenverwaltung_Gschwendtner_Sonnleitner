import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DronesPage } from './drones-page';

describe('DronesPage form', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DronesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    http.expectOne('/api/drones').flush([]);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function enter(name: string, value: string): void {
    const field = element().querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  }

  it('sends a valid drone and shows it in the list', async () => {
    enter('name', 'TELLO-07');
    enter('description', 'SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt');

    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/drones' });
    expect(request.request.body).toEqual({
      name: 'TELLO-07',
      description: 'SSID: TELLO-9FA21B, rechter Propellerschutz beschädigt',
    });
    request.flush({ id: 1, name: 'TELLO-07', status: 'Available', description: 'x' });
    await settle();

    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([
      { id: 1, name: 'TELLO-07', status: 'Available', description: 'x' },
    ]);
    await settle();

    expect(element().querySelector('tbody')?.textContent).toContain('TELLO-07');
    expect((element().querySelector('[name="name"]') as HTMLInputElement).value).toBe('');
  });

  it('shows the rejection message from the backend and keeps the input', async () => {
    enter('name', 'TELLO-07');

    await submit();

    http.expectOne({ method: 'POST', url: '/api/drones' }).flush(
      { detail: 'A drone named "TELLO-07" already exists.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'A drone named "TELLO-07" already exists.',
    );
    expect((element().querySelector('[name="name"]') as HTMLInputElement).value).toBe('TELLO-07');
  });

  it('leaves the check for a missing name to the backend', async () => {
    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/drones' });
    expect(request.request.body).toEqual({ name: '', description: '' });
    request.flush({ detail: 'A drone needs a name.' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('A drone needs a name.');
  });
});
