import { Injectable } from '@angular/core';

export interface HeatParticipant {
  name: string;
  placement: string; // '1', '2', '3', '4', 'DNS', or ''
}

@Injectable({ providedIn: 'root' })
export class HeatImageService {
  private static readonly W = 1920;
  private static readonly H = 1080;

  // Exact row positions measured from rame.png pixel data.
  // midY: vertical center of white row; bibCx: center of bib/placement cell;
  // nameX: start of name area (post-divider + padding); nameMaxX: right edge.
  private static readonly ROWS: ReadonlyArray<{
    midY: number; bibCx: number; nameX: number; nameMaxX: number;
  }> = [
    { midY: 451, bibCx: 610, nameX: 681, nameMaxX: 1293 },
    { midY: 541, bibCx: 591, nameX: 662, nameMaxX: 1274 },
    { midY: 630, bibCx: 572, nameX: 643, nameMaxX: 1255 },
    { midY: 718, bibCx: 555, nameX: 626, nameMaxX: 1238 },
  ];

  // Title above the card (transparent area of the template)
  private static readonly TITLE_X = 970;
  private static readonly TITLE_Y = 280;

  private static readonly NAVY = '#1e3270';
  private static readonly PINK = '#e91e8c';
  private static readonly FONT = "'Barlow Condensed', Impact, 'Arial Black', sans-serif";

  download(heatNumber: number, participants: HeatParticipant[], showPlacements: boolean): void {
    const { W, H } = HeatImageService;

    const frame = new Image();
    frame.onload = async () => {
      // Explicitly load all weight/style variants we use AND include Polish
      // diacritics in the test string so the Latin Extended unicode-range
      // subset is downloaded before drawing (document.fonts.ready only loads
      // subsets referenced by the DOM, which may omit ą ę ó ś ł ź ż ć ń).
      const polishAlphabet = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPQRSŚTUVWXYZŹŻąćęłńóśźż';
      await Promise.all([
        document.fonts.load(`italic 800 50px 'Barlow Condensed'`, polishAlphabet),
        document.fonts.load(`normal 700 50px 'Barlow Condensed'`, polishAlphabet),
      ]);

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(frame, 0, 0, W, H);
      this.drawOverlay(ctx, heatNumber, participants, showPlacements);

      const suffix = showPlacements ? '-wyniki' : '';
      const a = document.createElement('a');
      a.download = `bieg-${heatNumber}${suffix}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    frame.src = new URL('rame.png', document.baseURI).href;
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    heatNumber: number,
    participants: HeatParticipant[],
    showPlacements: boolean,
  ): void {
    const { ROWS, TITLE_X, TITLE_Y, NAVY, PINK, FONT } = HeatImageService;

    // Heat title
    const titleText = showPlacements
      ? `BIEG ${heatNumber} - WYNIKI`
      : `BIEG ${heatNumber}`;

    ctx.save();
    ctx.font = `italic 800 130px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // Pink offset shadow layer
    ctx.fillStyle = PINK;
    ctx.fillText(titleText, TITLE_X + 8, TITLE_Y + 8);
    // White text on top
    ctx.fillStyle = '#ffffff';
    ctx.fillText(titleText, TITLE_X, TITLE_Y);
    ctx.restore();

    // Participant rows
    for (let i = 0; i < ROWS.length; i++) {
      const { midY, bibCx, nameX, nameMaxX } = ROWS[i];
      const p = participants[i];

      if (showPlacements && p?.placement) {
        const isDns = p.placement === 'DNS';
        ctx.save();
        ctx.font = `${isDns ? 'normal' : 'italic'} 800 ${isDns ? 30 : 58}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = NAVY;
        ctx.fillText(p.placement, bibCx, midY);
        ctx.restore();
      }

      if (p?.name) {
        ctx.save();
        ctx.font = `normal 700 50px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = NAVY;
        ctx.fillText(p.name.toUpperCase(), nameX, midY, nameMaxX - nameX);
        ctx.restore();
      }
    }
  }
}
