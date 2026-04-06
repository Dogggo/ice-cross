import { Injectable } from '@angular/core';
import { NativeDateAdapter, MatDateFormats } from '@angular/material/core';

@Injectable()
export class DdMmYyyyDateAdapter extends NativeDateAdapter {
  // All dates are stored as UTC midnight so that toISOString().slice(0,10)
  // always gives the correct calendar date regardless of the user's timezone.

  override createDate(year: number, month: number, date: number): Date {
    return new Date(Date.UTC(year, month, date));
  }

  override parse(value: unknown, _parseFormat?: unknown): Date | null {
    if (typeof value === 'string' && value.trim()) {
      const match = value.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
      if (match) {
        const day   = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year  = parseInt(match[3], 10);
        const d = new Date(Date.UTC(year, month, day));
        if (!isNaN(d.getTime())) return d;
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: unknown): string {
    if (displayFormat === 'input') {
      const day   = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getUTCFullYear()}`;
    }
    return super.format(date, displayFormat as object);
  }
}

export const DD_MM_YYYY_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'input' },
  display: {
    dateInput: 'input',
    monthYearLabel: { year: 'numeric', month: 'short' } as Intl.DateTimeFormatOptions,
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearA11yLabel: { year: 'numeric', month: 'long' } as Intl.DateTimeFormatOptions,
  },
};
