import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, Drone, readErrorMessage, Reservation, StudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { StripSkeleton } from '../shared/strip-skeleton';

/**
 * Reserving a drone for a student group on one day, the upcoming reservations and cancelling them (REQ-027, REQ-028).
 * The backend checks every rule; the form only offers drones that are not defective.
 */
@Component({
  selector: 'app-reservations-page',
  imports: [ConfirmDialog, DatePipe, EmptyState, PageHead, ReactiveFormsModule, RouterLink, StripSkeleton],
  template: `
    <app-page-head bay="05" [kicker]="i18n.t('reservations.kicker')" [title]="i18n.t('nav.reservations')" [lede]="i18n.t('reservations.lede')" />

    <section class="panel" aria-labelledby="new-reservation">
      <h2 id="new-reservation">{{ i18n.t('reservations.new') }}</h2>

      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (savedMessage(); as message) {
        <p class="saved" role="status">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="reserve()">
        <label>
          {{ i18n.t('field.drone') }}
          <select formControlName="droneId" name="droneId">
            <option [ngValue]="null">{{ i18n.t('loans.chooseDrone') }}</option>
            @for (drone of reservableDrones(); track drone.id) {
              <option [ngValue]="drone.id">{{ drone.name }}</option>
            }
          </select>
        </label>
        <label>
          {{ i18n.t('field.studentGroup') }}
          <select formControlName="studentGroupId" name="studentGroupId">
            <option [ngValue]="null">{{ i18n.t('loans.chooseGroup') }}</option>
            @for (group of studentGroups(); track group.id) {
              <option [ngValue]="group.id">{{ group.name }}</option>
            }
          </select>
        </label>
        <label>
          {{ i18n.t('reservations.day') }}
          <input type="date" formControlName="date" name="date" [min]="today" />
        </label>
        <button type="submit" [disabled]="saving()" [class.busy]="saving()">{{ i18n.t('reservations.reserve') }}</button>
      </form>
    </section>

    <section aria-labelledby="upcoming-reservations">
      <h2 id="upcoming-reservations">{{ i18n.t('reservations.upcoming') }}</h2>
      @if (loading()) {
        <app-strip-skeleton />
      } @else if (loadErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      } @else if (reservations().length === 0) {
        <app-empty-state>{{ i18n.t('reservations.empty') }}</app-empty-state>
      } @else {
        @if (listErrorMessage(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <table>
          <thead>
            <tr>
              <th>{{ i18n.t('reservations.day') }}</th>
              <th>{{ i18n.t('field.drone') }}</th>
              <th>{{ i18n.t('field.studentGroup') }}</th>
              <th><span class="visually-hidden">{{ i18n.t('field.action') }}</span></th>
            </tr>
          </thead>
          <tbody>
            @for (reservation of reservations(); track reservation.id) {
              <tr [attr.data-reservation]="reservation.id" [class.due-today]="reservation.isToday">
                <td>
                  {{ reservation.date | date: 'dd.MM.yyyy' }}
                  @if (reservation.isToday) {
                    <span class="long-running due-today-badge">{{ i18n.t('reservations.today') }}</span>
                  }
                </td>
                <td [attr.data-label]="i18n.t('field.drone')">
                  <a [routerLink]="['/drones', reservation.droneId]">{{ reservation.droneName }}</a>
                  @if (reservation.droneIsLoaned) {
                    <span class="strip-note">{{ i18n.t('reservations.loanedNow') }}</span>
                  }
                </td>
                <td [attr.data-label]="i18n.t('field.studentGroup')">
                  <a [routerLink]="['/student-groups', reservation.studentGroupId]">{{ reservation.studentGroupName }}</a>
                </td>
                <td class="row-actions">
                  <button type="button" class="quiet cancel-reservation" (click)="askToCancel(reservation, $event)" [disabled]="busyId() !== null">
                    {{ i18n.t('reservations.cancel') }}<span class="visually-hidden"> {{ reservation.droneName }}</span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>

    @if (pendingCancel(); as reservation) {
      <app-confirm-dialog
        [heading]="i18n.t('reservations.cancelTitle')"
        [text]="i18n.t('reservations.cancelText', { drone: reservation.droneName, group: reservation.studentGroupName, date: (reservation.date | date: 'dd.MM.yyyy') ?? '' })"
        [confirmLabel]="i18n.t('reservations.cancel')"
        [cancelLabel]="i18n.t('dialog.cancel')"
        (confirmed)="confirmCancel()"
        (cancelled)="dismissCancel()"
      />
    }
  `,
})
export class ReservationsPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly today = ReservationsPage.localDate(new Date());
  protected readonly form = inject(FormBuilder).group({
    droneId: [null as number | null],
    studentGroupId: [null as number | null],
    date: [this.today],
  });

  protected readonly drones = signal<Drone[]>([]);
  protected readonly studentGroups = signal<StudentGroup[]>([]);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<number | null>(null);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly listErrorMessage = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly pendingCancel = signal<Reservation | null>(null);
  private cancelTrigger: HTMLElement | null = null;

  /** A defective drone cannot be reserved (decision of 2026-11-12); a loaned one can. */
  protected readonly reservableDrones = computed(() => this.drones().filter((drone) => drone.status !== 'Defective'));

  ngOnInit(): void {
    forkJoin({
      drones: this.api.listDrones(),
      groups: this.api.listStudentGroups(),
      reservations: this.api.listReservations(),
    }).subscribe({
      next: ({ drones, groups, reservations }) => {
        this.drones.set(drones);
        this.studentGroups.set(groups);
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  // The backend checks day, drone, group and double reservations; the form shows its answer.
  protected reserve(): void {
    if (this.saving()) {
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveErrorMessage.set(null);
    this.savedMessage.set(null);
    this.api.createReservation({ droneId: value.droneId, studentGroupId: value.studentGroupId, date: value.date || null }).subscribe({
      next: (reservation) => {
        this.saving.set(false);
        this.savedMessage.set(this.i18n.t('reservations.saved', { drone: reservation.droneName, group: reservation.studentGroupName }));
        this.form.reset({ droneId: null, studentGroupId: null, date: this.today });
        this.loadReservations();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  protected askToCancel(reservation: Reservation, event: Event): void {
    this.cancelTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pendingCancel.set(reservation);
  }

  protected dismissCancel(): void {
    this.pendingCancel.set(null);
    this.cancelTrigger?.focus();
    this.cancelTrigger = null;
  }

  protected confirmCancel(): void {
    const reservation = this.pendingCancel();
    this.pendingCancel.set(null);
    this.cancelTrigger = null;
    if (!reservation) {
      return;
    }

    this.busyId.set(reservation.id);
    this.listErrorMessage.set(null);
    this.api.cancelReservation(reservation.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.reservations.update((list) => list.filter((candidate) => candidate.id !== reservation.id));
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  private loadReservations(): void {
    this.api.listReservations().subscribe({
      next: (reservations) => this.reservations.set(reservations),
      error: (error: unknown) => this.listErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback'))),
    });
  }

  private static localDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
