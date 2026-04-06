import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { EventsService } from '../../services/events.service';

const mockEventDate = '2026-04-01';
const expectedDisplay = '01/04/2026';

describe('Dashboard – date display', () => {
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    const events = signal([{ id: 1, name: 'Test', date: mockEventDate }]);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        {
          provide: EventsService,
          useValue: {
            events,
            refreshEvents: () => {},
            createEvent: () => of({}),
            deleteEvent: () => of({}),
          },
        },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should display API date "${mockEventDate}" as "${expectedDisplay}"`, () => {
    const el = fixture.nativeElement as HTMLElement;
    const dateEl = el.querySelector('.event-date');
    expect(dateEl?.textContent?.trim()).toBe(expectedDisplay);
  });
});

