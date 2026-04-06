import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { Events } from './events';
import { EventsService } from '../../services/events.service';

const mockEventDate = '2026-04-01';
const expectedDisplay = '01/04/2026';

const mockEventDetails = {
  id: '1',
  name: 'Test Event',
  date: mockEventDate,
  categories: [],
};

describe('Events – date display', () => {
  let fixture: ComponentFixture<Events>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Events],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '1' })) },
        },
        {
          provide: EventsService,
          useValue: {
            getEventById: () => of(mockEventDetails),
            events: signal([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Events);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it(`should display API date "${mockEventDate}" as "${expectedDisplay}"`, () => {
    const el = fixture.nativeElement as HTMLElement;
    const dateEl = el.querySelector('.event-date-badge');
    expect(dateEl?.textContent?.trim()).toBe(expectedDisplay);
  });
});
