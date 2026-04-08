import { Injectable } from '@angular/core';

export interface PdfMeta {
  eventName: string;
  categoryName: string;
  documentTitle: string;
  badge: string;
}

@Injectable({ providedIn: 'root' })
export class PdfService {

  private sharedStyles(): string {
    return `
@page { margin: 16mm 14mm 20mm }
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #1a2744; background: #fff }
.header { background: #1a2744; color: #fff; padding: 22px 28px 20px; border-radius: 8px; margin-bottom: 26px; display: flex; justify-content: space-between; align-items: flex-start }
.header-badge { font-size: 7pt; text-transform: uppercase; letter-spacing: 2.5px; color: rgba(255,255,255,.45); margin-bottom: 7px }
.header-title { font-size: 20pt; font-weight: 700; letter-spacing: -.5px; line-height: 1.15; margin-top: 2px }
.header-event { font-size: 10.5pt; color: rgba(255,255,255,.65); margin-top: 6px }
.header-right { text-align: right; font-size: 8pt; color: rgba(255,255,255,.45); line-height: 1.9; flex-shrink: 0; padding-left: 24px }
.header-right strong { display: block; font-size: 10pt; color: rgba(255,255,255,.85); font-weight: 600; margin-bottom: 2px }
table { width: 100%; border-collapse: collapse }
th { padding: 10px 14px; text-align: left; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #5a7184; background: #f0f4f8; border-bottom: 2px solid #dde3ea }
td { padding: 9px 14px; border-bottom: 1px solid #edf0f5; font-size: 10pt; vertical-align: middle }
tr:nth-child(even) td { background: #f9fbfd }
tr:last-child td { border-bottom: none }
.col-place { width: 62px; font-weight: 700 }
.col-bib { width: 46px; color: #8a9bb0; font-size: 9pt }
.col-name { font-weight: 500 }
.col-placement { width: 80px; text-align: center }
.medal { font-size: 12pt; margin-right: 2px }
.place-num { font-size: 10.5pt }
.podium-row td { background: #fffbeb !important }
.podium-row td:first-child { font-weight: 700 }
.section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #5a7184; padding: 14px 0 8px; margin-top: 10px; border-top: 1px solid #edf0f5 }
.section-title:first-of-type { border-top: none; margin-top: 0 }
.heat-block { margin-bottom: 22px; page-break-inside: avoid; break-inside: avoid }
.heat-label { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #3d5afe; margin-bottom: 6px; padding: 5px 10px; background: rgba(61,90,254,.07); border-radius: 5px; display: inline-block }
.dns-row td { color: #b8c4ce !important; background: #fafafa !important }
.dns-row .col-name::after { content: ' — DNS'; font-size: 8.5pt; color: #b8c4ce; font-style: italic }
.footer { margin-top: 22px; padding-top: 11px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7.5pt; color: #9aa8b5 }
.best-time { color: #16a34a; font-weight: 700 }
.best-time::after { content: ' ★'; font-size: 8pt }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }
    `.trim();
  }

  private header(meta: PdfMeta, dateStr: string): string {
    return `
<div class="header">
  <div>
    <div class="header-badge">Ice Cross &mdash; ${meta.badge}</div>
    <div class="header-title">${meta.categoryName}</div>
    <div class="header-event">${meta.eventName}</div>
  </div>
  <div class="header-right"><strong>${dateStr}</strong>Wygenerowano przez<br>system Ice Cross</div>
</div>`.trim();
  }

  private footer(timestampStr: string): string {
    return `<div class="footer"><span>Ice Cross &mdash; System zarządzania zawodami</span><span>${timestampStr}</span></div>`;
  }

  private formatDatePL(date: Date): string {
    const months = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
    const d = String(date.getDate()).padStart(2, '0');
    return `${d} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  private formatTimestampPL(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${d}.${mo}.${date.getFullYear()}, ${h}:${mi}`;
  }

  open(meta: PdfMeta, bodyContent: string): void {
    const now = new Date();
    const dateStr = this.formatDatePL(now);
    const timestampStr = this.formatTimestampPL(now);

    const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8">
<title>${meta.documentTitle} — ${meta.categoryName}</title>
<style>${this.sharedStyles()}</style>
</head><body>
${this.header(meta, dateStr)}
${bodyContent}
${this.footer(timestampStr)}
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=960,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }
}
