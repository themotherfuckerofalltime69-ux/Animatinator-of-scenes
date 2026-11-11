export const SPRITE_W = 16;
export const SPRITE_H = 24;
export const ICON = 16;

/** Index 0 is empty. Remaining entries are the shaft palette. */
export const PALETTE: (string | null)[] = [
  null,
  "#050a0c",
  "#11232b",
  "#1b3a45",
  "#34788c",
  "#72c4dc",
  "#d7f3fb",
  "#00ffcc",
  "#00a888",
  "#e23d3d",
  "#f0b429",
  "#e7fbff",
];

const GLYPH: Record<string, number> = {
  ".": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  a: 10,
  b: 11,
};

export function glyph(rows: string[], w: number, h: number, label: string): number[] {
  if (rows.length !== h) {
    throw new Error(`${label} expected ${h} rows, got ${rows.length}`);
  }
  const out: number[] = [];
  rows.forEach((row, i) => {
    if (row.length !== w) {
      throw new Error(`${label} row ${i} length ${row.length}`);
    }
    for (const ch of row) out.push(GLYPH[ch] ?? 0);
  });
  return out;
}

export const OPERATIVE_GRID = glyph(
  [
    "................",
    "......3333......",
    ".....355553.....",
    ".....597795.....",
    ".....355553.....",
    "......3333......",
    ".......22.......",
    ".....444444.....",
    "....44777744....",
    "....47277274....",
    "....47777774....",
    ".....444444.....",
    ".....422224.....",
    "......2..2......",
    "......2..2......",
    "......2..2......",
    ".....22..22.....",
    ".....1....1.....",
    ".....1....1.....",
    "....11....11....",
    "................",
    "................",
    "................",
    "................",
  ],
  SPRITE_W,
  SPRITE_H,
  "operative",
);

export const DRONE_GRID = glyph(
  [
    "................",
    "................",
    "................",
    "................",
    ".....777777.....",
    "....75555557....",
    "....59777995....",
    "....75555557....",
    ".....777777.....",
    "......7..7......",
    ".....44..44.....",
    "....444..444....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  SPRITE_W,
  SPRITE_H,
  "drone",
);

function blank(n: number): number[] {
  return new Array(n).fill(0);
}

function plot(grid: number[], w: number, x: number, y: number, v: number) {
  if (x < 0 || y < 0 || x >= w) return;
  const h = grid.length / w;
  if (y >= h) return;
  grid[y * w + x] = v;
}

function fillRect(
  grid: number[],
  w: number,
  x: number,
  y: number,
  rw: number,
  rh: number,
  v: number,
) {
  for (let yy = 0; yy < rh; yy++) {
    for (let xx = 0; xx < rw; xx++) plot(grid, w, x + xx, y + yy, v);
  }
}

export function iconGrid(draw: (grid: number[]) => void): number[] {
  const grid = blank(ICON * ICON);
  draw(grid);
  return grid;
}

export const ITEM_TEMPLATES: { name: string; blurb: string; grid: number[] }[] = [
  {
    name: "Energy Core",
    blurb: "Shaft battery. Slots into an operative neural rail.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 6, 1, 4, 2, 5);
      fillRect(g, ICON, 4, 3, 8, 10, 4);
      fillRect(g, ICON, 5, 4, 6, 8, 7);
      fillRect(g, ICON, 7, 4, 2, 8, 8);
    }),
  },
  {
    name: "Neural Chip",
    blurb: "Micro lattice pulled from sector 7 relays.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 3, 3, 10, 10, 3);
      fillRect(g, ICON, 5, 5, 6, 6, 5);
      fillRect(g, ICON, 7, 7, 2, 2, 7);
      for (let i = 0; i < 4; i++) {
        plot(g, ICON, 3, 5 + i * 2, 10);
        plot(g, ICON, 12, 5 + i * 2, 10);
      }
    }),
  },
  {
    name: "Data Disk",
    blurb: "Encrypted walk-cycle archive.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 3, 3, 10, 10, 5);
      fillRect(g, ICON, 6, 6, 4, 4, 1);
      fillRect(g, ICON, 7, 7, 2, 2, 7);
    }),
  },
  {
    name: "Stim Injector",
    blurb: "Short-burst lift charge for jump takes.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 7, 1, 2, 4, 6);
      fillRect(g, ICON, 6, 5, 4, 8, 4);
      fillRect(g, ICON, 7, 6, 2, 5, 9);
      fillRect(g, ICON, 6, 13, 4, 2, 5);
    }),
  },
  {
    name: "Plasma Torch",
    blurb: "Cuts barrier props on the stage floor.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 3, 7, 8, 3, 4);
      fillRect(g, ICON, 10, 6, 3, 5, 10);
      fillRect(g, ICON, 13, 7, 2, 1, 7);
      fillRect(g, ICON, 13, 9, 2, 1, 9);
    }),
  },
  {
    name: "Cryptocoin",
    blurb: "Mine scrip. Pays the vault sync.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 4, 4, 8, 8, 10);
      fillRect(g, ICON, 6, 6, 4, 4, 1);
      plot(g, ICON, 7, 7, 10);
      plot(g, ICON, 8, 8, 10);
    }),
  },
  {
    name: "Diamond Pick",
    blurb: "Standard issue for the lower shafts.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 2, 3, 4, 3, 6);
      fillRect(g, ICON, 5, 5, 3, 3, 5);
      fillRect(g, ICON, 7, 7, 2, 7, 4);
    }),
  },
  {
    name: "Cargo Crate",
    blurb: "Sealed underhands freight.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 3, 4, 10, 9, 10);
      fillRect(g, ICON, 4, 5, 8, 7, 3);
      fillRect(g, ICON, 3, 8, 10, 1, 1);
      fillRect(g, ICON, 7, 4, 1, 9, 1);
    }),
  },
  {
    name: "Cyber Eye",
    blurb: "Scanner optic. Pins the active target.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 2, 6, 12, 4, 6);
      fillRect(g, ICON, 6, 6, 4, 4, 7);
      fillRect(g, ICON, 7, 7, 2, 2, 1);
    }),
  },
  {
    name: "Hex Gear",
    blurb: "Cog from the elevator governor.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 6, 2, 4, 12, 5);
      fillRect(g, ICON, 2, 6, 12, 4, 5);
      fillRect(g, ICON, 6, 6, 4, 4, 1);
      fillRect(g, ICON, 7, 7, 2, 2, 7);
    }),
  },
  {
    name: "Ice Ingot",
    blurb: "Coolant brick for drone housings.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 3, 5, 10, 6, 11);
      fillRect(g, ICON, 4, 6, 8, 4, 5);
    }),
  },
  {
    name: "Credit Chip",
    blurb: "Member card for the sub-basement vault.",
    grid: iconGrid((g) => {
      fillRect(g, ICON, 3, 3, 10, 10, 8);
      fillRect(g, ICON, 5, 5, 6, 2, 7);
      fillRect(g, ICON, 5, 9, 6, 1, 1);
    }),
  },
];

export function propGlyph(kind: "star" | "crate" | "barrier" | "crystal" | "pickup"): number[] {
  return iconGrid((g) => {
    if (kind === "star") {
      for (let i = 0; i < 6; i++) {
        plot(g, ICON, 8, 2 + i, 7);
        plot(g, ICON, 8, 8 + i, 7);
        plot(g, ICON, 2 + i, 8, 7);
        plot(g, ICON, 8 + i, 8, 7);
      }
      plot(g, ICON, 8, 8, 10);
      plot(g, ICON, 7, 7, 11);
      plot(g, ICON, 9, 9, 11);
    } else if (kind === "crate") {
      fillRect(g, ICON, 2, 3, 12, 11, 10);
      fillRect(g, ICON, 3, 4, 10, 9, 3);
      fillRect(g, ICON, 2, 8, 12, 1, 1);
      fillRect(g, ICON, 7, 3, 2, 11, 1);
    } else if (kind === "barrier") {
      fillRect(g, ICON, 2, 4, 12, 8, 10);
      for (let y = 4; y < 12; y += 2) fillRect(g, ICON, 2, y, 12, 1, 1);
    } else if (kind === "crystal") {
      for (let i = 0; i < 5; i++) {
        fillRect(g, ICON, 8 - i, 2 + i, i * 2 + 1, 1, 7);
        fillRect(g, ICON, 4 + i, 10 + i, 9 - i * 2, 1, 5);
      }
    } else {
      fillRect(g, ICON, 6, 2, 4, 2, 5);
      fillRect(g, ICON, 5, 4, 6, 9, 7);
      fillRect(g, ICON, 6, 6, 4, 5, 11);
    }
  });
}

function shiftAll(grid: number[], dy: number): number[] {
  const out = blank(SPRITE_W * SPRITE_H);
  for (let y = 0; y < SPRITE_H; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= SPRITE_H) continue;
    for (let x = 0; x < SPRITE_W; x++) {
      out[ny * SPRITE_W + x] = grid[y * SPRITE_W + x] ?? 0;
    }
  }
  return out;
}

function moveLegs(grid: number[], side: "left" | "right", dy: number): number[] {
  const out = grid.slice();
  const moves: { x: number; y: number; v: number }[] = [];
  for (let y = 14; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const v = grid[y * SPRITE_W + x] ?? 0;
      if (!v) continue;
      if (side === "left" && x > 7) continue;
      if (side === "right" && x <= 7) continue;
      out[y * SPRITE_W + x] = 0;
      moves.push({ x, y, v });
    }
  }
  for (const m of moves) {
    const ny = m.y + dy;
    if (ny < 0 || ny >= SPRITE_H) continue;
    const i = ny * SPRITE_W + m.x;
    if (out[i] === 0) out[i] = m.v;
    else out[m.y * SPRITE_W + m.x] = m.v;
  }
  return out;
}

export function buildClips(base: number[]): Record<string, number[][]> {
  const grid = base.length === SPRITE_W * SPRITE_H ? base.slice() : OPERATIVE_GRID.slice();
  const blink = grid.slice();
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const i = y * SPRITE_W + x;
      const v = grid[i] ?? 0;
      if (v === 7 || v === 9 || v === 10) blink[i] = 3;
    }
  }
  const left = moveLegs(moveLegs(grid, "left", 1), "right", -1);
  const right = moveLegs(moveLegs(grid, "right", 1), "left", -1);
  const muzzle = grid.slice();
  for (let x = 12; x < 16; x++) muzzle[10 * SPRITE_W + x] = 7;
  muzzle[9 * SPRITE_W + 14] = 10;
  const flash = muzzle.slice();
  flash[10 * SPRITE_W + 15] = 11;
  const jumped = shiftAll(grid, -2);
  for (let y = 18; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) jumped[y * SPRITE_W + x] = 0;
  }
  return {
    idle: [grid, shiftAll(grid, -1), blink, grid],
    walk: [grid, left, grid, right],
    jump: [jumped],
    shoot: [muzzle, flash],
  };
}

export function tintIndex(grid: number[], from: number, to: number): number[] {
  return grid.map((v) => (v === from ? to : v));
}

type RGB = { r: number; g: number; b: number };

function hexRgb(hex: string): RGB {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

const RGB: (RGB | null)[] = PALETTE.map((c) => (c ? hexRgb(c) : null));

export function nearestIndex(
  r: number,
  g: number,
  b: number,
  a: number,
  bg: RGB | null,
): number {
  if (a < 32) return 0;
  if (r > 242 && g > 242 && b > 242) return 0;
  if (bg && Math.abs(r - bg.r) < 32 && Math.abs(g - bg.g) < 32 && Math.abs(b - bg.b) < 32) {
    return 0;
  }
  let best = 1;
  let bestD = Infinity;
  for (let i = 1; i < RGB.length; i++) {
    const c = RGB[i];
    if (!c) continue;
    const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function sampleImage(
  img: CanvasImageSource,
  sw: number,
  sh: number,
  frameCount = 1,
): number[][] {
  const sheet = document.createElement("canvas");
  const srcW = "naturalWidth" in img ? (img as HTMLImageElement).naturalWidth : sw;
  const srcH = "naturalHeight" in img ? (img as HTMLImageElement).naturalHeight : sh;
  sheet.width = Math.max(1, srcW);
  sheet.height = Math.max(1, srcH);
  const sctx = sheet.getContext("2d", { willReadFrequently: true });
  if (!sctx) return [OPERATIVE_GRID.slice()];
  sctx.drawImage(img, 0, 0);
  const frames: number[][] = [];
  const count = Math.max(1, Math.min(8, frameCount));
  const sliceW = sheet.width / count;
  for (let f = 0; f < count; f++) {
    const cell = document.createElement("canvas");
    cell.width = sw;
    cell.height = sh;
    const cctx = cell.getContext("2d", { willReadFrequently: true });
    if (!cctx) continue;
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(sheet, f * sliceW, 0, sliceW, sheet.height, 0, 0, sw, sh);
    const data = cctx.getImageData(0, 0, sw, sh).data;
    const bg = { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 };
    const grid = blank(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      grid[i] = nearestIndex(
        data[i * 4] ?? 0,
        data[i * 4 + 1] ?? 0,
        data[i * 4 + 2] ?? 0,
        data[i * 4 + 3] ?? 0,
        bg,
      );
    }
    frames.push(grid);
  }
  return frames.length ? frames : [OPERATIVE_GRID.slice()];
}

export function paintGrid(
  ctx: CanvasRenderingContext2D,
  grid: number[],
  w: number,
  h: number,
  dx: number,
  dy: number,
  scale: number,
) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = PALETTE[grid[y * w + x] ?? 0];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(dx + x * scale, dy + y * scale, scale, scale);
    }
  }
}

export function floodFill(grid: number[], w: number, h: number, x: number, y: number, to: number) {
  const from = grid[y * w + x] ?? 0;
  if (from === to) return grid.slice();
  const out = grid.slice();
  const stack = [[x, y]];
  const seen = new Set<number>();
  while (stack.length) {
    const pair = stack.pop();
    if (!pair) break;
    const [cx, cy] = pair;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const i = cy * w + cx;
    if (seen.has(i) || out[i] !== from) continue;
    seen.add(i);
    out[i] = to;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}
