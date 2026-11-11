import { useEffect, useRef, useState } from "react";
import { Eraser, PaintBucket, Pencil, Pipette, Undo2, Upload } from "lucide-react";
import { floodFill, PALETTE, sampleImage, SPRITE_H, SPRITE_W } from "@/lib/studio/palette";
import { useStudio } from "@/lib/studio/store";
import { cn } from "@/lib/cn";
import { EditorCanvas, PixelCard } from "./PixelCard";

type Tool = "pencil" | "eraser" | "fill" | "picker";

function cellOf(event: React.PointerEvent<HTMLCanvasElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * SPRITE_W);
  const y = Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * SPRITE_H);
  return {
    x: Math.max(0, Math.min(SPRITE_W - 1, x)),
    y: Math.max(0, Math.min(SPRITE_H - 1, y)),
  };
}

export function PixelLab() {
  const characters = useStudio((state) => state.characters);
  const activeId = useStudio((state) => state.activeId);
  const commitAvatar = useStudio((state) => state.commitAvatar);
  const commitClip = useStudio((state) => state.commitClip);
  const selectChar = useStudio((state) => state.selectChar);
  const active = characters.find((character) => character.id === activeId) ?? characters[0];
  const [grid, setGrid] = useState<number[]>(() => active?.grid.slice() ?? []);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(7);
  const [sheet, setSheet] = useState<number[][] | null>(null);
  const [frames, setFrames] = useState(4);
  const [clip, setClip] = useState(active?.clip ?? "walk");
  const [note, setNote] = useState("Draw, or drop an image to quantize it into the shaft palette.");
  const undo = useRef<number[][]>([]);
  const historyGrid = useRef(grid);

  const signature = `${active?.id ?? ""}:${active?.revision ?? 0}`;

  useEffect(() => {
    const current = useStudio.getState().characters.find((character) => character.id === activeId);
    if (!current) return;
    setGrid(current.grid.slice());
    setClip(current.clips[current.clip] ? current.clip : "idle");
    setSheet(null);
  }, [activeId, signature]);

  useEffect(() => {
    historyGrid.current = grid;
  }, [grid]);

  if (!active) return null;

  const applyCell = (x: number, y: number, currentTool: Tool) => {
    setGrid((current) => {
      if (currentTool === "picker") {
        setColor(current[y * SPRITE_W + x] ?? 0);
        return current;
      }
      if (currentTool === "fill") return floodFill(current, SPRITE_W, SPRITE_H, x, y, color);
      const next = current.slice();
      next[y * SPRITE_W + x] = currentTool === "eraser" ? 0 : color;
      return next;
    });
  };

  const onPointer = (event: React.PointerEvent<HTMLCanvasElement>, activePointer: boolean) => {
    if (event.type === "pointerdown") {
      undo.current.push(historyGrid.current.slice());
      if (undo.current.length > 40) undo.current.shift();
      event.currentTarget.setPointerCapture(event.pointerId);
      const cell = cellOf(event);
      applyCell(cell.x, cell.y, tool);
      return;
    }
    if (!activePointer || tool === "fill" || tool === "picker") return;
    const cell = cellOf(event);
    applyCell(cell.x, cell.y, tool);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const sliced = sampleImage(image, SPRITE_W, SPRITE_H, frames);
      const first = sliced[0];
      if (first) {
        undo.current.push(historyGrid.current.slice());
        setGrid(first);
        setSheet(sliced.length > 1 ? sliced : null);
        setNote(
          sliced.length > 1
            ? `Image quantized to ${sliced.length} pixel frames. Save them into a clip.`
            : "Image quantized to a 16×24 character portrait.",
        );
      }
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      setNote("That image could not be read.");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  return (
    <section className="space-y-4">
      <header className="pixel-box p-4">
        <p className="kicker">Canvas 2D</p>
        <h2 className="mt-1 text-lg text-paper">Pixel lab</h2>
        <p className="mt-2 text-sm text-mist">
          Paint or convert a reference into the mine palette. Stamping writes the portrait card
          used in the character file tree and rebuilds idle, walk, jump, and shoot cycles.
        </p>
      </header>
      <div className="duo duo-editor">
        <div className="pixel-box space-y-3 p-3">
          <EditorCanvas grid={grid} onPointer={onPointer} />
          <div className="flex flex-wrap gap-2">
            <ToolButton label="Pen" on={tool === "pencil"} onClick={() => setTool("pencil")} icon={<Pencil className="h-4 w-4" />} />
            <ToolButton label="Erase" on={tool === "eraser"} onClick={() => setTool("eraser")} icon={<Eraser className="h-4 w-4" />} />
            <ToolButton label="Fill" on={tool === "fill"} onClick={() => setTool("fill")} icon={<PaintBucket className="h-4 w-4" />} />
            <ToolButton label="Pick" on={tool === "picker"} onClick={() => setTool("picker")} icon={<Pipette className="h-4 w-4" />} />
            <button
              type="button"
              className="pixel-btn"
              onClick={() => {
                const prev = undo.current.pop();
                if (prev) setGrid(prev);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Undo2 className="h-4 w-4" /> Undo
              </span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {PALETTE.map((swatch, index) => (
              <button
                key={index}
                type="button"
                aria-label={swatch ? `Palette ${swatch}` : "Empty pixel"}
                className={cn("swatch", index === 0 && "checker", color === index && "is-on")}
                style={swatch ? { backgroundColor: swatch } : undefined}
                onClick={() => setColor(index)}
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="pixel-box space-y-3 p-4">
            <label className="block space-y-1">
              <span className="kicker">Bind portrait to</span>
              <select
                className="pixel-input"
                value={active.id}
                onChange={(event) => selectChar(event.target.value)}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="max-w-44">
              <PixelCard grid={grid} name={active.name} sub="Portrait card" />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 border-2 border-line bg-ink px-3 text-sm text-ice">
              <Upload className="h-4 w-4" />
              <span>Image to pixel</span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => onFile(event.target.files?.[0])}
              />
            </label>
            <label className="block space-y-1">
              <span className="kicker">Sheet slices</span>
              <select
                className="pixel-input"
                value={frames}
                onChange={(event) => setFrames(Number(event.target.value))}
              >
                <option value={1}>Single portrait</option>
                <option value={4}>4-frame strip</option>
                <option value={6}>6-frame strip</option>
              </select>
            </label>
            <p className="text-sm text-mist">{note}</p>
            {sheet ? (
              <div className="slots">
                {sheet.map((frame, index) => (
                  <button
                    key={index}
                    type="button"
                    className="slot"
                    onClick={() => setGrid(frame.slice())}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="pixel-btn is-hot"
                onClick={() => {
                  commitAvatar(active.id, grid);
                  setNote("Portrait card updated in the character file tree.");
                }}
              >
                Stamp card
              </button>
              <label className="sr-only" htmlFor="clip-target">
                Clip target
              </label>
              <select
                id="clip-target"
                className="pixel-input max-w-40"
                value={clip}
                onChange={(event) => setClip(event.target.value)}
              >
                {Object.keys(active.clips).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="pixel-btn"
                onClick={() => {
                  commitClip(active.id, clip, sheet ?? [grid]);
                  setNote(`Saved into ${clip}.anim.`);
                }}
              >
                Save clip
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolButton({
  label,
  on,
  onClick,
  icon,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" className={cn("pixel-btn", on && "is-hot")} onClick={onClick}>
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
