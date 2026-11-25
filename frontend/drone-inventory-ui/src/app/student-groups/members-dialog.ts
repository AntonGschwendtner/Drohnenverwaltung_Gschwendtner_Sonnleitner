import { afterNextRender, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, switchMap } from 'rxjs';
import { ApiService, readErrorMessage, StudentGroup, StudentGroupMember } from '../api.service';
import { I18nService } from '../i18n.service';

/**
 * The members of one student group (REQ-031): listed alphabetically with the group leader marked. Members are
 * added and removed here and the leader is chosen or cleared. Every change goes to the backend at once; the dialog
 * then shows the group as the backend has it and tells the page, so the list row stays in step.
 * Escape and a click next to the dialog close it; Tab stays inside. While a change is on its way the dialog stays
 * open, so the answer of the backend still reaches the list row.
 */
@Component({
  selector: 'app-members-dialog',
  imports: [ReactiveFormsModule],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <div class="dialog-backdrop" (click)="close()"></div>
    <div #dialog class="dialog members-dialog" role="dialog" aria-modal="true" aria-labelledby="members-dialog-title">
      <h2 id="members-dialog-title">{{ i18n.t('members.title', { group: group().name }) }}</h2>

      @if (errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (group().members.length === 0) {
        <p class="members-empty">{{ i18n.t('members.empty') }}</p>
      } @else {
        <ul class="member-list">
          @for (member of group().members; track member.id) {
            <li [attr.data-member]="member.id" [class.leader]="member.isLeader">
              @if (pendingRemove()?.id === member.id) {
                <span class="member-question">{{ i18n.t('members.removeQuestion', { member: member.name }) }}</span>
                <span class="member-actions">
                  <button type="button" class="confirm-remove" (click)="remove(member)" [disabled]="busy()" [class.busy]="busy()">
                    {{ i18n.t('members.remove') }}
                  </button>
                  <button type="button" class="quiet cancel-remove" (click)="pendingRemove.set(null)">{{ i18n.t('dialog.cancel') }}</button>
                </span>
              } @else {
                <span class="member-name">{{ member.name }}</span>
                @if (member.isLeader) {
                  <span class="leader-badge">{{ i18n.t('members.leader') }}</span>
                }
                <span class="member-actions">
                  @if (!member.isLeader) {
                    <button type="button" class="quiet make-leader" (click)="setLeader(member.id)" [disabled]="busy()">
                      {{ i18n.t('members.makeLeader') }}<span class="visually-hidden"> {{ member.name }}</span>
                    </button>
                  }
                  <button type="button" class="quiet remove" (click)="pendingRemove.set(member)" [disabled]="busy()">
                    {{ i18n.t('members.remove') }}<span class="visually-hidden"> {{ member.name }}</span>
                  </button>
                </span>
              }
            </li>
          }
        </ul>

        @if (group().leaderName) {
          <button type="button" class="quiet no-leader" (click)="setLeader(null)" [disabled]="busy()">
            {{ i18n.t('members.noLeader') }}
          </button>
        }
      }

      <form class="member-form" [formGroup]="form" (ngSubmit)="add()">
        <label>
          {{ i18n.t('members.newName') }}
          <input #nameInput formControlName="name" name="memberName" autocomplete="off" />
        </label>
        <button type="submit" [disabled]="busy()" [class.busy]="busy()">{{ i18n.t('members.add') }}</button>
      </form>

      <div class="dialog-actions">
        <button type="button" class="dialog-cancel close" (click)="close()" [disabled]="busy()">{{ i18n.t('members.close') }}</button>
      </div>
    </div>
  `,
})
export class MembersDialog {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  readonly group = input.required<StudentGroup>();

  /** The group after a change, as the backend answers it. */
  readonly changed = output<StudentGroup>();
  readonly closed = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({ name: '' });
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** The member whose removal waits for a second click. */
  protected readonly pendingRemove = signal<StudentGroupMember | null>(null);

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    afterNextRender(() => this.nameInput().nativeElement.focus());
  }

  // The backend checks the name, so the dialog sends what was entered and shows its answer.
  protected add(): void {
    if (this.busy()) {
      return;
    }

    this.change(this.api.addMember(this.group().id, this.form.getRawValue().name), () => {
      this.form.reset();
      this.nameInput().nativeElement.focus();
    });
  }

  protected remove(member: StudentGroupMember): void {
    this.change(this.api.removeMember(this.group().id, member.id), () => {
      this.pendingRemove.set(null);
      this.nameInput().nativeElement.focus();
    });
  }

  protected setLeader(memberId: number | null): void {
    // The clicked button disappears with the change, so the focus goes to the name field.
    this.change(this.api.setLeader(this.group().id, memberId), () => this.nameInput().nativeElement.focus());
  }

  protected close(): void {
    if (!this.busy()) {
      this.closed.emit();
    }
  }

  /** Sends one change, then reads the group again, so members, leader and count come from the backend. */
  private change(request: Observable<unknown>, done?: () => void): void {
    if (this.busy()) {
      return;
    }

    const id = this.group().id;
    this.busy.set(true);
    this.errorMessage.set(null);

    request.pipe(switchMap(() => this.api.getStudentGroup(id))).subscribe({
      next: (group) => {
        this.busy.set(false);
        this.changed.emit(group);
        done?.();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.pendingRemove()) {
        this.pendingRemove.set(null);
      } else {
        this.close();
      }
      return;
    }

    if (event.key === 'Tab') {
      // Tab and Shift+Tab move through the fields and buttons of the dialog and wrap around.
      event.preventDefault();
      const focusable = Array.from(
        this.dialog().nativeElement.querySelectorAll<HTMLElement>('input, button'),
      ).filter((element) => !element.hasAttribute('disabled'));
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const step = event.shiftKey ? -1 : 1;
      const next = (current + step + focusable.length) % focusable.length;
      focusable[current === -1 ? 0 : next]?.focus();
    }
  }
}
