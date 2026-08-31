// =============================================================================
// RESQFLY CONSOLE — PARTICULATE SAND DYNAMICS SIMULATION (TypeScript Port)
// =============================================================================

const SETTINGS = {
  cellSize: 2,
  startText: 'ResQFly',
  hiddenText: 'Eyes in the Sky, Hope on the Ground',
  releaseTestsPerFrame: 4000,
  releaseChance: 0.03,
  gravity: 950.0,
  airDrag: 0.992,
  settleStepsPerFrame: 2,
  pileHoldSeconds: 0.8,
  hiddenFadeInSeconds: 0.45,
  reformDurationSeconds: 2.0,
  reformStaggerSeconds: 0.65,
  revealHoldSeconds: 2.5,
  revealFadeSeconds: 0.6,
};

const SAND_COLOR = { r: 236, g: 204, b: 116, a: 255 };
const BG_COLOR = { r: 0, g: 0, b: 0, a: 255 };
const TEXT_COLOR = { r: 255, g: 232, b: 168 };

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - Math.pow(-2.0 * t + 2.0, 3) / 2.0;
}

function clamp01(v: number): number {
  return Math.max(0.0, Math.min(1.0, v));
}

interface FallingParticle {
  x: number; y: number;
  vx: number; vy: number;
  driftAccel: number; driftTarget: number; driftTimer: number;
}

interface ReformingParticle {
  sx: number; sy: number;
  tx: number; ty: number;
  cx: number; cy: number;
  delay: number; dur: number;
  wave: number; phase: number;
}

export class SandSimulation {
  w: number;
  h: number;
  cs: number;
  cols: number;
  rows: number;
  fixedText: Uint8Array;
  pile: Uint8Array;
  minPileRow: number;
  pixels: Uint8ClampedArray;
  textCells: [number, number][];
  looseCells: [number, number][];
  falling: FallingParticle[];
  reforming: ReformingParticle[];
  phase: string;
  phaseTime: number;
  hiddenAlpha: number;
  finished: boolean;

  constructor(width: number = 1000, height: number = 640) {
    this.w = Math.max(100, Math.floor(width));
    this.h = Math.max(100, Math.floor(height));
    this.cs = SETTINGS.cellSize;
    this.cols = Math.max(10, Math.floor(this.w / this.cs));
    this.rows = Math.max(10, Math.floor(this.h / this.cs));

    this.fixedText = new Uint8Array(this.cols * this.rows);
    this.pile = new Uint8Array(this.cols * this.rows);
    this.minPileRow = this.rows - 1;

    this.pixels = new Uint8ClampedArray(this.rows * this.cols * 4);
    this._fillBg();

    this.textCells = [];
    this.looseCells = [];
    this.falling = [];
    this.reforming = [];

    this.phase = 'text';
    this.phaseTime = 0;
    this.hiddenAlpha = 0;
    this.finished = false;

    this.buildTextMask();
  }

  private _idx(col: number, row: number): number {
    return col * this.rows + row;
  }

  private _pixIdx(row: number, col: number): number {
    return (row * this.cols + col) * 4;
  }

  private _fillBg(): void {
    for (let i = 0; i < this.rows * this.cols; i++) {
      const pi = i * 4;
      this.pixels[pi] = BG_COLOR.r;
      this.pixels[pi + 1] = BG_COLOR.g;
      this.pixels[pi + 2] = BG_COLOR.b;
      this.pixels[pi + 3] = BG_COLOR.a;
    }
  }

  private _setSand(row: number, col: number): void {
    const pi = this._pixIdx(row, col);
    this.pixels[pi] = SAND_COLOR.r;
    this.pixels[pi + 1] = SAND_COLOR.g;
    this.pixels[pi + 2] = SAND_COLOR.b;
    this.pixels[pi + 3] = SAND_COLOR.a;
  }

  buildTextMask(): void {
    // Render text to offscreen canvas to get pixel mask
    const offscreen = document.createElement('canvas');
    offscreen.width = this.cols;
    offscreen.height = this.rows;
    const ctx = offscreen.getContext('2d')!;
    ctx.clearRect(0, 0, this.cols, this.rows);

    const fontSize = Math.min(this.cols * 0.18, this.rows * 0.28, 50);
    ctx.font = `bold ${Math.floor(fontSize)}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';

    const txt = SETTINGS.startText;
    const measured = ctx.measureText(txt);
    const txtW = measured.width;
    const centerX = (this.cols - txtW) / 2;
    const centerY = this.rows * 0.38;

    ctx.fillText(txt, centerX, centerY);

    const imgData = ctx.getImageData(0, 0, this.cols, this.rows);
    const data = imgData.data;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = (row * this.cols + col) * 4;
        const alpha = data[i + 3];
        if (alpha > 40) {
          this.fixedText[this._idx(col, row)] = 1;
          this.textCells.push([col, row]);
          this.looseCells.push([col, row]);
        }
      }
    }

    // Shuffle looseCells
    for (let i = this.looseCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.looseCells[i], this.looseCells[j]] = [this.looseCells[j], this.looseCells[i]];
    }
  }

  releaseText(): void {
    if (this.looseCells.length === 0) {
      this.phase = 'falling';
      this.phaseTime = 0;
      return;
    }

    for (let t = 0; t < SETTINGS.releaseTestsPerFrame; t++) {
      if (this.looseCells.length === 0) break;

      const listIdx = Math.floor(Math.random() * this.looseCells.length);
      const [col, row] = this.looseCells[listIdx];

      if (this.fixedText[this._idx(col, row)] === 0) {
        this.looseCells.splice(listIdx, 1);
        continue;
      }

      const belowEmpty = row >= this.rows - 1 ||
        this.fixedText[this._idx(col, Math.min(row + 1, this.rows - 1))] === 0;
      const sideEmpty = col <= 0 || col >= this.cols - 1 ||
        this.fixedText[this._idx(Math.max(col - 1, 0), row)] === 0 ||
        this.fixedText[this._idx(Math.min(col + 1, this.cols - 1), row)] === 0;

      const multiplier = (belowEmpty || sideEmpty) ? 3.5 : 1.0;

      if (Math.random() < SETTINGS.releaseChance * multiplier) {
        this.fixedText[this._idx(col, row)] = 0;
        this.looseCells.splice(listIdx, 1);
        this.falling.push({
          x: col, y: row,
          vx: -11 + Math.random() * 22,
          vy: 20 + Math.random() * 50,
          driftAccel: -30 + Math.random() * 60,
          driftTarget: -45 + Math.random() * 90,
          driftTimer: 0.15 + Math.random() * 0.65,
        });
      }
    }
  }

  updateFalling(dt: number): void {
    const gravity = SETTINGS.gravity / this.cs;
    const drag = SETTINGS.airDrag;

    for (let i = this.falling.length - 1; i >= 0; i--) {
      const p = this.falling[i];
      p.driftTimer -= dt;

      if (p.driftTimer <= 0) {
        p.driftTarget = -45 + Math.random() * 90;
        p.driftTimer = 0.2 + Math.random() * 0.8;
      }

      p.driftAccel += (p.driftTarget - p.driftAccel) * dt * 2.2;
      p.vx = (p.vx + p.driftAccel * dt) * drag;
      p.vy = (p.vy + gravity * dt) * drag;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let col = Math.floor(p.x);
      const nextRow = Math.floor(p.y + 1);

      if (col < 0) { p.x = 0; col = 0; }
      if (col >= this.cols) { p.x = this.cols - 1; col = this.cols - 1; }

      if (nextRow >= this.rows || (nextRow >= 0 && nextRow < this.rows && this.pile[this._idx(col, nextRow)] === 1)) {
        const targetR = Math.min(this.rows - 1, Math.max(0, Math.floor(p.y)));
        this.settleParticle(col, targetR);
        this.falling.splice(i, 1);
      }
    }

    if (this.phase === 'falling' && this.falling.length === 0) {
      this.phase = 'pile';
      this.phaseTime = 0;
    }
  }

  settleParticle(col: number, row: number): void {
    if (this.pile[this._idx(col, row)] === 0) {
      this.pile[this._idx(col, row)] = 1;
    } else if (col > 0 && this.pile[this._idx(col - 1, row)] === 0) {
      this.pile[this._idx(col - 1, row)] = 1;
    } else if (col < this.cols - 1 && this.pile[this._idx(col + 1, row)] === 0) {
      this.pile[this._idx(col + 1, row)] = 1;
    } else {
      for (let y = row - 1; y >= 0; y--) {
        if (this.pile[this._idx(col, y)] === 0) {
          this.pile[this._idx(col, y)] = 1;
          break;
        }
      }
    }
    this.minPileRow = Math.min(this.minPileRow, row);
  }

  settlePile(): void {
    const startRow = Math.max(0, this.minPileRow - 2);
    const direction = Math.random() > 0.5 ? 1 : -1;

    for (let row = this.rows - 2; row > startRow; row--) {
      const start = direction === 1 ? 1 : this.cols - 2;
      const end = direction === 1 ? this.cols - 1 : 0;
      const step = direction;

      for (let col = start; col !== end; col += step) {
        if (this.pile[this._idx(col, row)] === 1) {
          if (this.pile[this._idx(col, row + 1)] === 0) {
            this.pile[this._idx(col, row + 1)] = 1;
            this.pile[this._idx(col, row)] = 0;
          } else if (this.pile[this._idx(col - direction, row + 1)] === 0) {
            this.pile[this._idx(col - direction, row + 1)] = 1;
            this.pile[this._idx(col, row)] = 0;
          } else if (this.pile[this._idx(col + direction, row + 1)] === 0) {
            this.pile[this._idx(col + direction, row + 1)] = 1;
            this.pile[this._idx(col, row)] = 0;
          }
        }
      }
    }
  }

  startReform(): void {
    const pileIndices: [number, number][] = [];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.pile[this._idx(c, r)] === 1) {
          pileIndices.push([c, r]);
        }
      }
    }

    this.pile.fill(0);
    this.minPileRow = this.rows - 1;

    const count = Math.min(pileIndices.length, this.textCells.length);
    for (let i = 0; i < count; i++) {
      const [sx, sy] = pileIndices[i];
      const [tx, ty] = this.textCells[i];
      this.reforming.push({
        sx, sy, tx, ty, cx: sx, cy: sy,
        delay: Math.random() * SETTINGS.reformStaggerSeconds,
        dur: SETTINGS.reformDurationSeconds * (0.75 + Math.random() * 0.4),
        wave: -8 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.phase = 'reform';
    this.phaseTime = 0;
  }

  updateReform(): void {
    let allArrived = true;
    const hRatio = this.rows * 0.08;

    for (const p of this.reforming) {
      const localTime = this.phaseTime - p.delay;
      if (localTime <= 0) {
        p.cx = p.sx;
        p.cy = p.sy;
        allArrived = false;
        continue;
      }

      const t = clamp01(localTime / p.dur);
      const eased = easeInOutCubic(t);
      const arc = Math.sin(eased * Math.PI);
      const wobble = Math.sin(eased * Math.PI * 2 + p.phase) * p.wave * arc;

      p.cx = p.sx + (p.tx - p.sx) * eased + wobble;
      p.cy = p.sy + (p.ty - p.sy) * eased - arc * hRatio;

      if (t < 1.0) allArrived = false;
    }

    if (allArrived) {
      for (const [col, row] of this.textCells) {
        this.fixedText[this._idx(col, row)] = 1;
      }
      this.reforming.length = 0;
      this.phase = 'hiddenHold';
      this.phaseTime = 0;
    }
  }

  update(dt: number = 0.016): void {
    if (this.finished) return;

    this.phaseTime += dt;

    if (this.phase === 'text') {
      this.releaseText();
    } else if (this.phase === 'pile' && this.phaseTime >= SETTINGS.pileHoldSeconds) {
      this.phase = 'hiddenFadeIn';
      this.phaseTime = 0;
    } else if (this.phase === 'hiddenFadeIn') {
      this.hiddenAlpha = Math.min(1.0, this.phaseTime / SETTINGS.hiddenFadeInSeconds);
      if (this.hiddenAlpha >= 1.0) this.startReform();
    } else if (this.phase === 'reform') {
      this.updateReform();
    } else if (this.phase === 'hiddenHold') {
      this.hiddenAlpha = 1.0;
      if (this.phaseTime >= SETTINGS.revealHoldSeconds) {
        this.phase = 'hiddenFade';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'hiddenFade') {
      this.hiddenAlpha = Math.max(0, 1.0 - this.phaseTime / SETTINGS.revealFadeSeconds);
      if (this.hiddenAlpha <= 0) this.finished = true;
    }

    this.updateFalling(dt);

    if (!['reform', 'hiddenHold', 'hiddenFade'].includes(this.phase)) {
      for (let i = 0; i < SETTINGS.settleStepsPerFrame; i++) {
        this.settlePile();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, drawW: number, drawH: number, clipX: number, clipY: number, clipW: number, clipH: number): void {
    // Reset pixel buffer
    this._fillBg();

    // Draw fixed text and pile
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.fixedText[this._idx(c, r)] === 1 || this.pile[this._idx(c, r)] === 1) {
          this._setSand(r, c);
        }
      }
    }

    // Draw falling
    for (const p of this.falling) {
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        this._setSand(y, x);
      }
    }

    // Draw reforming
    for (const p of this.reforming) {
      const x = Math.floor(p.cx);
      const y = Math.floor(p.cy);
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        this._setSand(y, x);
      }
    }

    // Scale the sim image to fill the clip area
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.cols;
    tempCanvas.height = this.rows;
    const tempCtx = tempCanvas.getContext('2d')!;
    const imgData = tempCtx.createImageData(this.cols, this.rows);
    imgData.data.set(this.pixels);
    tempCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, clipX, clipY, clipW, clipH);

    // Draw hidden subtitle overlay
    if (this.hiddenAlpha > 0) {
      const fontSize = Math.max(11, Math.min(clipW * 0.022, 16));
      ctx.font = `bold ${Math.floor(fontSize)}px Orbitron, sans-serif`;
      ctx.fillStyle = `rgba(${TEXT_COLOR.r}, ${TEXT_COLOR.g}, ${TEXT_COLOR.b}, ${clamp01(this.hiddenAlpha)})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(SETTINGS.hiddenText, clipX + clipW / 2, clipY + clipH - 16);
    }

    ctx.restore();
  }
}
