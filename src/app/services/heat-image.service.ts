import { Injectable } from '@angular/core';

export interface HeatParticipant {
  name: string;
  placement: string; // '1', '2', '3', '4', 'DNS', or ''
}

@Injectable({ providedIn: 'root' })
export class HeatImageService {
  private static readonly W = 1080;
  private static readonly H = 560;
  private static readonly BG = '#181818';
  private static readonly NAVY = '#1e3270';
  private static readonly PINK = '#e91e8c';

  private static readonly SCALE = 4; // render at 4× → 4320 × 2240 px PNG

  download(heatNumber: number, participants: HeatParticipant[], showPlacements: boolean): void {
    const W = HeatImageService.W;
    const H = HeatImageService.H;
    const S = HeatImageService.SCALE;

    const svg = this.buildSvg(heatNumber, participants, showPlacements);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image(W * S, H * S);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = W * S;
      canvas.height = H * S;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, W * S, H * S);
      URL.revokeObjectURL(url);

      const suffix = showPlacements ? '-wyniki' : '';
      const link = document.createElement('a');
      link.download = `bieg-${heatNumber}${suffix}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  private buildSvg(heatNumber: number, participants: HeatParticipant[], showPlacements: boolean): string {
    const W = HeatImageService.W;
    const H = HeatImageService.H;
    const BG = HeatImageService.BG;
    const NAVY = HeatImageService.NAVY;
    const PINK = HeatImageService.PINK;

    const SKEW = 60;
    const GAP = 12;
    const SIDE_GAP = 14;
    const ROW_COUNT = 4;
    const BL_X = 58;
    const BR_X = 978;
    const CARD_T = 128;
    const CARD_B = 524;
    const cardH = CARD_B - CARD_T;
    const PINK_T = 22;
    const BIB_W = 86;
    const DIVIDER_W = 10;

    const leftEdge  = (y: number): number => BL_X + ((CARD_B - y) / cardH) * SKEW;
    const rightEdge = (y: number): number => BR_X + ((CARD_B - y) / cardH) * SKEW;
    const f    = (n: number): string => n.toFixed(2);
    const poly = (pts: [number, number][]): string => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
    const esc  = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const totalGaps = GAP * (ROW_COUNT + 1);
    const rowH = (cardH - totalGaps) / ROW_COUNT;

    let rows = '';
    for (let i = 0; i < ROW_COUNT; i++) {
      const rowTop = CARD_T + GAP + i * (rowH + GAP);
      const rowBot = rowTop + rowH;
      const rowMid = (rowTop + rowBot) / 2;

      const lTop = leftEdge(rowTop);
      const lBot = leftEdge(rowBot);
      const rTop = rightEdge(rowTop);
      const rBot = rightEdge(rowBot);

      const rowTL = lTop + SIDE_GAP;
      const rowBL = lBot + SIDE_GAP;
      const rowTR = rTop - SIDE_GAP;
      const rowBR = rBot - SIDE_GAP;

      const bibTR = rowTL + BIB_W;
      const bibBR = rowBL + BIB_W;

      const p = participants[i];

      // White row trapezoid
      rows += `\n  <polygon points="${poly([[rowTL, rowTop], [rowTR, rowTop], [rowBR, rowBot], [rowBL, rowBot]])}" fill="white"/>`;
      // Navy divider strip between bib and name
      rows += `\n  <polygon points="${poly([[bibTR, rowTop], [bibTR + DIVIDER_W, rowTop], [bibBR + DIVIDER_W, rowBot], [bibBR, rowBot]])}" fill="${NAVY}"/>`;

      // Placement number in bib box
      if (showPlacements && p?.placement) {
        const isDns = p.placement === 'DNS';
        rows += `\n  <text x="${f(rowTL + BIB_W / 2)}" y="${f(rowMid)}" text-anchor="middle" dominant-baseline="central"` +
          ` font-family="'Barlow Condensed',Impact,'Arial Black',sans-serif"` +
          ` font-size="${isDns ? 20 : 52}" font-weight="800" font-style="${isDns ? 'normal' : 'italic'}"` +
          ` fill="${NAVY}">${esc(p.placement)}</text>`;
      }

      // Participant name
      if (p?.name) {
        rows += `\n  <text x="${f(bibTR + DIVIDER_W + 18)}" y="${f(rowMid)}" dominant-baseline="central"` +
          ` font-family="'Barlow Condensed',Impact,'Arial Black',sans-serif"` +
          ` font-size="38" font-weight="700" fill="${NAVY}">${esc(p.name.toUpperCase())}</text>`;
      }
    }

    const titleText = showPlacements ? `BIEG ${heatNumber} - WYNIKI` : `BIEG ${heatNumber}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;1,800');</style>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="${f(W / 2)}" y="102" text-anchor="middle"
    font-family="'Barlow Condensed',Impact,'Arial Black',sans-serif"
    font-size="88" font-weight="800" font-style="italic"
    stroke="${PINK}" stroke-width="9" stroke-linejoin="round" paint-order="stroke"
    fill="white">${titleText}</text>
  <polygon points="${poly([[rightEdge(CARD_T), CARD_T], [rightEdge(CARD_T) + PINK_T, CARD_T], [rightEdge(CARD_B) + PINK_T, CARD_B], [rightEdge(CARD_B), CARD_B]])}" fill="${PINK}"/>
  <polygon points="${poly([[leftEdge(CARD_B), CARD_B], [rightEdge(CARD_B) + PINK_T, CARD_B], [rightEdge(CARD_B) + PINK_T, CARD_B + PINK_T], [leftEdge(CARD_B), CARD_B + PINK_T]])}" fill="${PINK}"/>
  <polygon points="${poly([[leftEdge(CARD_T), CARD_T], [rightEdge(CARD_T), CARD_T], [rightEdge(CARD_B), CARD_B], [leftEdge(CARD_B), CARD_B]])}" fill="${NAVY}"/>${rows}
</svg>`;
  }
}

