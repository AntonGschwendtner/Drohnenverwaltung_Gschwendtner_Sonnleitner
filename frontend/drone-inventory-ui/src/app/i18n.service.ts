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
  'field.duration': 'On loan',
  'field.dueDate': 'Planned return',
  'field.note': 'Note',
  'status.available': 'Available',
  'status.loaned': 'Loaned',
  'status.defective': 'Defective',
  'error.fallback': 'The request failed. Check that the backend is running and try again.',
  'state.loading': 'Loading',
  'search.label': 'Search',
  'filter.all': 'All',
  'action.edit': 'Edit',
  'action.save': 'Save',
  'action.delete': 'Delete',
  'overview.label': 'Fleet status',
  'overview.total': 'Drones',

  'drones.kicker': 'Bay 01 · Fleet',
  'drones.lede': 'Every drone with its current status. A drone is loaned while it has an active loan.',
  'drones.new': 'New drone',
  'drones.add': 'Add drone',
  'drones.empty': 'No drones yet.',
  'drones.searchHint': 'Name of the drone',
  'drones.noMatch': 'No drone matches the search.',
  'drones.detailTitle': 'Drone details',
  'drones.back': 'All drones',
  'drones.noDescription': 'No description.',
  'details.activeLoan': 'Active loan',
  'details.noActiveLoan': 'Not loaned right now.',
  'details.noHistory': 'No returned loans yet.',
  'drones.deleteTitle': 'Delete {drone}?',
  'drones.reportDefect': 'Report damage',
  'drones.reportTitle': 'Report damage on {drone}?',
  'drones.reportText': '{drone} is then defective and cannot be loaned until it is repaired.',
  'drones.repair': 'Repaired',
  'drones.repairTitle': 'Is {drone} repaired?',
  'drones.repairText': 'The defect is removed and {drone} can be loaned again.',
  'drones.defectLabel': 'Damage: {defect}',
  'drones.qrTitle': 'QR label',
  'drones.qrLabel': 'QR code that opens the loan of {drone}',
  'drones.qrHint': 'Scan it with a phone to open the loan of this drone.',
  'drones.printLabel': 'Print label',
  'drones.deleteText': '{drone} is removed from the fleet. This is only possible while it has never been loaned.',

  'groups.kicker': 'Bay 02 · Crews',
  'groups.lede': 'The groups that can loan drones and are responsible for them.',
  'groups.new': 'New student group',
  'groups.add': 'Add student group',
  'groups.empty': 'No student groups yet.',
  'groups.searchHint': 'Group or member',
  'groups.noLeader': 'No leader',
  'details.members': 'Members',
  'groups.noMatch': 'No student group matches the search.',
  'groups.detailTitle': 'Student group details',
  'groups.back': 'All student groups',
  'groups.detailLede': 'Active loans right now: {count}. Every returned loan of this group is listed below.',
  'groups.noActiveLoans': 'This group has no drone right now.',
  'groups.deleteTitle': 'Move {group} to the trash?',
  'groups.deleteText': '{group} disappears from the list and the loan form. Its members and history stay, and you can restore it from the trash.',
  'groups.toTrash': 'Move to trash',
  'trash.title': 'Trash',
  'trash.loading': 'Loading the trash …',
  'trash.empty': 'The trash is empty.',
  'trash.deletedOn': 'Deleted on',
  'trash.loans': 'Loans',
  'trash.members': 'Members',
  'trash.restore': 'Restore',
  'trash.deletePermanently': 'Delete for good',
  'trash.permanentTitle': 'Delete {group} for good?',
  'trash.permanentText': '{group} and its members are deleted. This cannot be undone.',
  'trash.historyLegend': 'What happens to its history?',
  'trash.keepHistory': 'Keep the history: its loans stay listed under the name {group}',
  'trash.deleteHistory': 'Also delete the history: {count} loans are deleted',
  'trash.confirmKeep': 'Delete, keep history',
  'trash.confirmAll': 'Delete everything',
  'groups.inTrash': 'This group has been in the trash since {date} and cannot loan drones.',
  'groups.members': 'Members ({count})',
  'members.title': 'Members of {group}',
  'members.empty': 'This group has no members yet.',
  'members.leader': 'Group leader',
  'members.makeLeader': 'Make leader',
  'members.noLeader': 'No group leader',
  'members.remove': 'Remove',
  'members.removeQuestion': 'Remove {member} from the group?',
  'members.newName': 'Name of the new member',
  'members.add': 'Add member',
  'members.close': 'Close',

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
  'loans.day': '{days} day',
  'loans.days': '{days} days',
  'loans.longRunning': 'Long loan',
  'loans.noteHint': 'For example the project, optional',
  'loans.overdue': 'Overdue',
  'loans.preselectLoaned': '{drone} is loaned to {group} right now.',
  'loans.preselectLoanedNoGroup': '{drone} is loaned right now.',
  'loans.preselectDefective': '{drone} is defective and cannot be loaned until it is repaired.',
  'loans.preselectUnknown': 'The drone from the QR code does not exist.',
  'loans.returnedBatteries': 'Batteries returned',
  'loans.returnedPropellers': 'Propellers returned',
  'loans.defect': 'Damage (optional)',
  'loans.defectHint': 'For example: propeller broken. The drone is then marked as defective.',
  'loans.dueOn': 'due {date}',
  'loans.confirmTitle': 'Return {drone}?',
  'loans.confirmText': '{drone} comes back from {group}. The loan is then closed and moves to the history.',
  'dialog.cancel': 'Cancel',

  'history.kicker': 'Bay 04 · Logbook',
  'history.lede': 'Every returned loan stays here, the newest return first.',
  'history.empty': 'No returned loans yet.',
  'history.searchHint': 'Drone or student group',
  'history.noMatch': 'No loan matches the search.',
  'history.planned': 'planned {date}',
  'history.export': 'Export as CSV',
  'history.print': 'Print or save as PDF',
  'history.printedOn': 'Printed on {date}',
  'history.missing': '{count} missing',
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
  'field.duration': 'Leihdauer',
  'field.dueDate': 'Geplante Rückgabe',
  'field.note': 'Notiz',
  'status.available': 'Verfügbar',
  'status.loaned': 'Ausgeliehen',
  'status.defective': 'Defekt',
  'error.fallback': 'Die Anfrage ist fehlgeschlagen. Prüfe, ob das Backend läuft, und versuche es noch einmal.',
  'state.loading': 'Wird geladen',
  'search.label': 'Suche',
  'filter.all': 'Alle',
  'action.edit': 'Bearbeiten',
  'action.save': 'Speichern',
  'action.delete': 'Löschen',
  'overview.label': 'Flottenstatus',
  'overview.total': 'Drohnen',

  'drones.kicker': 'Platz 01 · Flotte',
  'drones.lede': 'Jede Drohne mit ihrem aktuellen Status. Eine Drohne ist ausgeliehen, solange es eine aktive Ausleihe gibt.',
  'drones.new': 'Neue Drohne',
  'drones.add': 'Drohne anlegen',
  'drones.empty': 'Noch keine Drohnen.',
  'drones.searchHint': 'Name der Drohne',
  'drones.noMatch': 'Keine Drohne passt zur Suche.',
  'drones.detailTitle': 'Drohnendetails',
  'drones.back': 'Alle Drohnen',
  'drones.noDescription': 'Keine Beschreibung.',
  'details.activeLoan': 'Aktive Ausleihe',
  'details.noActiveLoan': 'Gerade nicht ausgeliehen.',
  'details.noHistory': 'Noch keine zurückgegebenen Ausleihen.',
  'drones.deleteTitle': '{drone} löschen?',
  'drones.reportDefect': 'Schaden melden',
  'drones.reportTitle': 'Schaden an {drone} melden?',
  'drones.reportText': '{drone} ist dann defekt und kann erst nach der Reparatur wieder ausgeliehen werden.',
  'drones.repair': 'Repariert',
  'drones.repairTitle': 'Ist {drone} repariert?',
  'drones.repairText': 'Der Schaden wird entfernt, und {drone} kann wieder ausgeliehen werden.',
  'drones.defectLabel': 'Schaden: {defect}',
  'drones.qrTitle': 'QR-Etikett',
  'drones.qrLabel': 'QR-Code, der die Ausleihe von {drone} öffnet',
  'drones.qrHint': 'Mit dem Handy scannen, um die Ausleihe dieser Drohne zu öffnen.',
  'drones.printLabel': 'Etikett drucken',
  'drones.deleteText': '{drone} wird aus der Flotte entfernt. Das geht nur, solange sie nie ausgeliehen war.',

  'groups.kicker': 'Platz 02 · Crews',
  'groups.lede': 'Die Gruppen, die Drohnen ausleihen und dafür verantwortlich sind.',
  'groups.new': 'Neue Schülergruppe',
  'groups.add': 'Gruppe anlegen',
  'groups.empty': 'Noch keine Schülergruppen.',
  'groups.searchHint': 'Gruppe/Mitglied',
  'groups.noLeader': 'Kein Leiter',
  'details.members': 'Mitglieder',
  'groups.noMatch': 'Keine Schülergruppe passt zur Suche.',
  'groups.detailTitle': 'Gruppendetails',
  'groups.back': 'Alle Schülergruppen',
  'groups.detailLede': 'Aktive Ausleihen gerade: {count}. Darunter steht jede zurückgegebene Ausleihe dieser Gruppe.',
  'groups.noActiveLoans': 'Diese Gruppe hat gerade keine Drohne.',
  'groups.deleteTitle': '{group} in den Papierkorb?',
  'groups.deleteText': '{group} verschwindet aus der Liste und dem Ausleihformular. Mitglieder und Historie bleiben, im Papierkorb lässt sich die Gruppe wiederherstellen.',
  'groups.toTrash': 'In den Papierkorb',
  'trash.title': 'Papierkorb',
  'trash.loading': 'Papierkorb wird geladen …',
  'trash.empty': 'Der Papierkorb ist leer.',
  'trash.deletedOn': 'Gelöscht am',
  'trash.loans': 'Ausleihen',
  'trash.members': 'Mitglieder',
  'trash.restore': 'Wiederherstellen',
  'trash.deletePermanently': 'Endgültig löschen',
  'trash.permanentTitle': '{group} endgültig löschen?',
  'trash.permanentText': '{group} und ihre Mitglieder werden gelöscht. Das lässt sich nicht rückgängig machen.',
  'trash.historyLegend': 'Was passiert mit der Historie?',
  'trash.keepHistory': 'Historie behalten: Die Ausleihen bleiben unter dem Namen {group} sichtbar',
  'trash.deleteHistory': 'Auch die Historie löschen: {count} Ausleihen werden gelöscht',
  'trash.confirmKeep': 'Löschen, Historie behalten',
  'trash.confirmAll': 'Alles löschen',
  'groups.inTrash': 'Diese Gruppe liegt seit {date} im Papierkorb und kann keine Drohnen ausleihen.',
  'groups.members': 'Mitglieder ({count})',
  'members.title': 'Mitglieder von {group}',
  'members.empty': 'Diese Gruppe hat noch keine Mitglieder.',
  'members.leader': 'Gruppenleiter',
  'members.makeLeader': 'Zum Leiter machen',
  'members.noLeader': 'Kein Gruppenleiter',
  'members.remove': 'Entfernen',
  'members.removeQuestion': '{member} aus der Gruppe entfernen?',
  'members.newName': 'Name des neuen Mitglieds',
  'members.add': 'Mitglied hinzufügen',
  'members.close': 'Schließen',

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
  'loans.day': '{days} Tag',
  'loans.days': '{days} Tage',
  'loans.longRunning': 'Lange Ausleihe',
  'loans.noteHint': 'Zum Beispiel das Projekt, optional',
  'loans.overdue': 'Überfällig',
  'loans.preselectLoaned': '{drone} ist gerade an {group} ausgeliehen.',
  'loans.preselectLoanedNoGroup': '{drone} ist gerade ausgeliehen.',
  'loans.preselectDefective': '{drone} ist defekt und kann erst nach der Reparatur ausgeliehen werden.',
  'loans.preselectUnknown': 'Die Drohne aus dem QR-Code gibt es nicht.',
  'loans.returnedBatteries': 'Akkus zurück',
  'loans.returnedPropellers': 'Propeller zurück',
  'loans.defect': 'Schaden (optional)',
  'loans.defectHint': 'Zum Beispiel: Propeller gebrochen. Die Drohne gilt dann als defekt.',
  'loans.dueOn': 'fällig am {date}',
  'loans.confirmTitle': '{drone} zurückgeben?',
  'loans.confirmText': '{drone} kommt von {group} zurück. Die Ausleihe wird damit abgeschlossen und landet in der Historie.',
  'dialog.cancel': 'Abbrechen',

  'history.kicker': 'Platz 04 · Logbuch',
  'history.lede': 'Jede zurückgegebene Ausleihe bleibt hier, die neueste Rückgabe zuerst.',
  'history.empty': 'Noch keine zurückgegebenen Ausleihen.',
  'history.searchHint': 'Drohne oder Schülergruppe',
  'history.noMatch': 'Keine Ausleihe passt zur Suche.',
  'history.planned': 'geplant {date}',
  'history.export': 'Als CSV exportieren',
  'history.print': 'Drucken oder als PDF speichern',
  'history.printedOn': 'Gedruckt am {date}',
  'history.missing': '{count} fehlen',
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
