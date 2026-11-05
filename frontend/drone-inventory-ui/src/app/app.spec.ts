import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('shows a link to every view', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('nav a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/drones',
      '/student-groups',
      '/loans',
      '/history',
    ]);
  });

  it('opens the drones by default', async () => {
    TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/drones');
  });

  it('marks the open view in the navigation', async () => {
    const fixture = TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/loans');
    await fixture.whenStable();

    const active = fixture.nativeElement.querySelector('nav a.active') as HTMLAnchorElement;
    expect(active.textContent).toContain('Loans');
  });

  it('sends unknown addresses to the drones', async () => {
    TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/does-not-exist');

    expect(TestBed.inject(Router).url).toBe('/drones');
  });
});
