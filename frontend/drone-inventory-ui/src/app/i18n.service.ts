import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type Language = 'en' | 'de';

export const LANGUAGE_STORAGE_KEY = 'drone-inventory-language';

const english = {
  'app.brand': 'Drone Inventory',
  'app.brandSub': 'Strip bay · lending control',
  'app.start': 'Drone Inventory, start page',
  'nav.label': 'Main',
  'nav.drones': 'Drones',
  'nav.studentGroups': 'Student groups',
  'nav.loans': 'Loans',
  'nav.history': 'Loan history',
  'theme.day': 'Day',
  'theme.night': 'Night',
  'theme.toDark': 'Switch to dark mode',
  'theme.toLight': 'Switch to light mode',
  'language.switch': 'Switch the language to German',

  'field.name': 'Name',
  'field.description': 'Description',
  'field.status': 'Status',
  'field.drone': 'Drone',
  'field.studentGroup': 'Student group',
  'field.batteries': 'Batteries',
  'field.propellers': 'Propellers',
  'field.loanDate': 'Loan date',
  'field.returnDate': 'Return date',
  'field.action': 'Action',
  'status.available': 'Available',
  'status.loaned': 'Loaned',
  'error.fallback': 'The request failed. Check that the backend is running and try again.',

  'drones.kicker': 'Bay 01 · Fleet',
  'drones.lede': 'Every drone with its current status. A drone is loaned while it has an active loan.',
  'drones.new': 'New drone',
  'drones.add': 'Add drone',
  'drones.empty': 'No drones yet.',

  'groups.kicker': 'Bay 02 · Crews',
  'groups.lede': 'The groups that can loan drones and are responsible for them.',
  'groups.new': 'New student group',
  'groups.add': 'Add student group',
  'groups.empty': 'No student groups yet.',

  'loans.kicker': 'Bay 03 · Airborne',
  'loans.lede': 'Loan an available drone with its accessories, and return it here.',
  'loans.new': 'New loan',
  'loans.chooseDrone': 'Choose a drone',
  'loans.chooseGroup': 'Choose a student group',
  'loans.submit': 'Loan drone',
  'loans.active': 'Active loans',
  'loans.empty': 'No active loans.',
  'loans.return': 'Return',
  'loans.saved': '{drone} is loaned to {group}.',
  'loans.returned': '{drone} is returned.',

  'history.kicker': 'Bay 04 · Logbook',
  'history.lede': 'Every returned loan stays here, the newest return first.',
  'history.empty': 'No returned loans yet.',
};

export type TextKey = keyof typeof english;

const german: Record<TextKey, string> = {
  'app.brand': 'Drohnenverwaltung',
  'app.brandSub': 'Strip Bay · Ausleihkontrolle',
  'app.start': 'Drohnenverwaltung, Startseite',
  'nav.label': 'Hauptmenü',
  'nav.drones': 'Drohnen',
  'nav.studentGroups': 'Schülergruppen',
  'nav.loans': 'Ausleihen',
  'nav.history': 'Historie',
  'theme.day': 'Tag',
  'theme.night': 'Nacht',
  'theme.toDark': 'Zum dunklen Modus wechseln',
  'theme.toLight': 'Zum hellen Modus wechseln',
  'language.switch': 'Sprache auf Englisch umstellen',

  'field.name': 'Name',
  'field.description': 'Beschreibung',
  'field.status': 'Status',
  'field.drone': 'Drohne',
  'field.studentGroup': 'Schülergruppe',
  'field.batteries': 'Akkus',
  'field.propellers': 'Propeller',
  'field.loanDate': 'Ausleihdatum',
  'field.returnDate': 'Rückgabedatum',
  'field.action': 'Aktion',
  'status.available': 'Verfügbar',
  'status.loaned': 'Ausgeliehen',
  'error.fallback': 'Die Anfrage ist fehlgeschlagen. Prüfe, ob das Backend läuft, und versuche es noch einmal.',

  'drones.kicker': 'Platz 01 · Flotte',
  'drones.lede': 'Jede Drohne mit ihrem aktuellen Status. Eine Drohne ist ausgeliehen, solange es eine aktive Ausleihe gibt.',
  'drones.new': 'Neue Drohne',
  'drones.add': 'Drohne anlegen',
  'drones.empty': 'Noch keine Drohnen.',

  'groups.kicker': 'Platz 02 · Crews',
  'groups.lede': 'Die Gruppen, die Drohnen ausleihen und dafür verantwortlich sind.',
  'groups.new': 'Neue Schülergruppe',
  'groups.add': 'Gruppe anlegen',
  'groups.empty': 'Noch keine Schülergruppen.',

  'loans.kicker': 'Platz 03 · In der Luft',
  'loans.lede': 'Eine verfügbare Drohne mit Zubehör ausleihen und hier wieder zurückgeben.',
  'loans.new': 'Neue Ausleihe',
  'loans.chooseDrone': 'Drohne wählen',
  'loans.chooseGroup': 'Schülergruppe wählen',
  'loans.submit': 'Drohne ausleihen',
  'loans.active': 'Aktive Ausleihen',
  'loans.empty': 'Keine aktiven Ausleihen.',
  'loans.return': 'Zurückgeben',
  'loans.saved': '{drone} ist an {group} ausgeliehen.',
  'loans.returned': '{drone} ist zurückgegeben.',

  'history.kicker': 'Platz 04 · Logbuch',
  'history.lede': 'Jede zurückgegebene Ausleihe bleibt hier, die neueste Rückgabe zuerst.',
  'history.empty': 'Noch keine zurückgegebenen Ausleihen.',
};

const texts: Record<Language, Record<TextKey, string>> = { en: english, de: german };

/**
 * Holds the language of the interface and its texts. The backend answers in the same language,
 * see languageInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  readonly language = signal<Language>(this.readInitialLanguage());

  constructor() {
    this.apply(this.language());
  }

  /** Reads the language signal, so templates update when the language changes. */
  t(key: TextKey, values: Record<string, string> = {}): string {
    return texts[this.language()][key].replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
  }

  toggle(): void {
    const next: Language = this.language() === 'de' ? 'en' : 'de';
    this.language.set(next);
    this.apply(next);

    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Without storage the choice only lasts until the page is reloaded.
    }
  }

  private apply(language: Language): void {
    this.document.documentElement.lang = language;
  }

  private readInitialLanguage(): Language {
    const view = this.document.defaultView;

    try {
      const stored = view?.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'de') {
        return stored;
      }
    } catch {
      // Fall back to the browser language.
    }

    return view?.navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}
