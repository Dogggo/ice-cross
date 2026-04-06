import { Pipe, PipeTransform } from '@angular/core';

/** Converts an ISO date string "YYYY-MM-DD" to "DD/MM/YYYY" without any timezone conversion. */
@Pipe({ name: 'isoDate', standalone: true })
export class IsoDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
}
