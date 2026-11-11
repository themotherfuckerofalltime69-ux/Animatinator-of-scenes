import { useEffect, useRef } from "react";
import { ICON, paintGrid, SPRITE_H, SPRITE_W } from "@/lib/studio/palette";

export function PixelCard({
  grid,
  name,
  sub,
}: {
  grid: number[];
  name: string;
  sub?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let dead = false;
    const draw = () => {
      if (dead) return;
      const scale = 4;
      const width = SPRITE_W * scale + 16;
      const height = SPRITE_H * scale + 36;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0b171c";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#34788c";
      ctx.strokeRect(1, 1, width - 2, height - 2);
      paintGrid(ctx, grid, SPRITE_W, SPRITE_H, 8, 6, scale);
      ctx.font = "12px Share Tech Mono, monospace";
      ctx.fillStyle = "#d7f3fb";
      ctx.fillText(name.slice(0, 14), 8, height - 16);
      if (sub) {
        ctx.fillStyle = "#72c4dc";
        ctx.fillText(sub.slice(0, 18), 8, height - 4);
      }
    };
    draw();
    void document.fonts?.ready.then(draw);
    return () => {
      dead = true;
    };
  }, [grid, name, sub]);

  return <canvas ref={ref} className="px-canvas" aria-label={`${name} character card`} />;
}

export function ItemGlyph({ grid }: { grid: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = ICON;
    canvas.height = ICON;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, ICON, ICON);
    paintGrid(ctx, grid, ICON, ICON, 0, 0, 1);
  }, [grid]);
  return <canvas ref={ref} className="px-canvas h-8 w-8" aria-hidden="true" />;
}

export function EditorCanvas({
  grid,
  onPointer,
}: {
  grid: number[];
  onPointer: (event: React.PointerEvent<HTMLCanvasElement>, active: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const scale = 12;
    canvas.width = SPRITE_W * scale;
    canvas.height = SPRITE_H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#050a0c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    paintGrid(ctx, grid, SPRITE_W, SPRITE_H, 0, 0, scale);
    ctx.strokeStyle = "rgba(38,87,103,0.45)";
    ctx.beginPath();
    for (let x = 0; x <= SPRITE_W; x++) {
      ctx.moveTo(x * scale + 0.5, 0);
      ctx.lineTo(x * scale + 0.5, canvas.height);
    }
    for (let y = 0; y <= SPRITE_H; y++) {
      ctx.moveTo(0, y * scale + 0.5);
      ctx.lineTo(canvas.width, y * scale + 0.5);
    }
    ctx.stroke();
  }, [grid]);

  return (
    <canvas
      ref={ref}
      className="px-canvas border-2 border-line"
      onPointerDown={(event) => onPointer(event, true)}
      onPointerMove={(event) => onPointer(event, event.currentTarget.hasPointerCapture(event.pointerId))}
    />
  );
}
