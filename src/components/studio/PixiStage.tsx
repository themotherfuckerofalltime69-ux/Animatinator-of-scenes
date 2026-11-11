import { useEffect, useRef, useState } from "react";
import { ICON, paintGrid, propGlyph, SPRITE_H, SPRITE_W } from "@/lib/studio/palette";
import { live, stepLive } from "@/lib/studio/runtime";
import { useStudio } from "@/lib/studio/store";
import type { BackdropId } from "@/lib/studio/types";

type Drag = { kind: "char" | "prop"; id: string } | null;

function groundOf(height: number) {
  return Math.round(height * 0.78);
}

export function PixiStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameOn = useStudio((state) => state.gameOn);
  const [mode, setMode] = useState<"boot" | "pixi" | "canvas">("boot");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancel = false;
    let cleanup = () => {};
    const boot = async () => {
      try {
        const stop = await mountPixi(host, () => cancel);
        if (cancel) {
          stop();
          return;
        }
        cleanup = stop;
        setMode("pixi");
      } catch {
        if (cancel) return;
        cleanup = mountCanvas(host);
        setMode("canvas");
      }
    };
    void boot();
    return () => {
      cancel = true;
      cleanup();
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={hostRef}
        className={gameOn ? "stage-host" : "stage-host is-dim"}
        data-renderer={mode}
        role="application"
        aria-label={mode === "canvas" ? "Canvas 2D scene stage" : "PixiJS scene stage"}
      />
      <BubbleLayer />
    </div>
  );
}

function BubbleLayer() {
  const characters = useStudio((state) => state.characters);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last > 90) {
        last = now;
        setTick((value) => (value + 1) % 10000);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="bubble-layer" data-tick={tick}>
      {characters.map((character) => {
        const pose = live.poses[character.id];
        const text = pose?.speech || character.speech;
        if (!text) return null;
        return (
          <div
            key={character.id}
            className="speech-bubble"
            style={{ left: `${pose?.x ?? character.x}%` }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

async function mountPixi(host: HTMLElement, cancelled: () => boolean) {
  const PIXI = await import("pixi.js");
  if (cancelled()) return () => {};
  const app = new PIXI.Application();
  await app.init({
    preference: "webgl",
    background: 0x070f12,
    antialias: false,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: host,
  });
  if (cancelled()) {
    app.destroy({ removeView: true }, { children: true });
    return () => {};
  }
  host.appendChild(app.canvas);

  const backdrop = new PIXI.Graphics();
  const world = new PIXI.Container();
  const ring = new PIXI.Graphics();
  world.sortableChildren = true;
  app.stage.addChild(backdrop);
  app.stage.addChild(world);
  app.stage.addChild(ring);
  app.stage.eventMode = "static";

  const charViews = new Map<string, import("pixi.js").Sprite>();
  const propViews = new Map<string, import("pixi.js").Sprite>();
  const owned: import("pixi.js").Texture[] = [];
  const cache = new Map<string, import("pixi.js").Texture>();
  let drag: Drag = null;
  let bgKey = "";

  const textureFor = (key: string, grid: number[], w: number, h: number) => {
    const cached = cache.get(key);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return PIXI.Texture.EMPTY;
    paintGrid(ctx, grid, w, h, 0, 0, 1);
    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = "nearest";
    cache.set(key, texture);
    owned.push(texture);
    return texture;
  };

  const paintBackdrop = () => {
    const id = useStudio.getState().backdrop;
    const w = app.screen.width;
    const h = app.screen.height;
    const key = `${id}:${Math.round(w)}x${Math.round(h)}`;
    if (key === bgKey || w < 2 || h < 2) return;
    bgKey = key;
    drawBackdrop(backdrop, w, h, id);
  };

  const sync = () => {
    const state = useStudio.getState();
    stepLive(performance.now());
    paintBackdrop();
    app.stage.hitArea = app.screen;
    const scale = app.screen.width < 560 ? 3 : 4;
    const ground = groundOf(app.screen.height);
    const charIds = new Set(state.characters.map((character) => character.id));

    for (const [id, sprite] of charViews) {
      if (!charIds.has(id)) {
        sprite.destroy({ children: true });
        charViews.delete(id);
      }
    }
    for (const character of state.characters) {
      let sprite = charViews.get(character.id);
      if (!sprite) {
        sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.anchor.set(0.5, 1);
        sprite.eventMode = "static";
        sprite.cursor = "pointer";
        const held = new PIXI.Sprite(PIXI.Texture.EMPTY);
        held.anchor.set(0.5, 1);
        held.position.set(14, -6);
        held.label = "held";
        sprite.addChild(held);
        sprite.on("pointerdown", (event) => {
          event.stopPropagation();
          const api = useStudio.getState();
          api.selectChar(character.id);
          api.setPlaying(false);
          drag = { kind: "char", id: character.id };
        });
        world.addChild(sprite);
        charViews.set(character.id, sprite);
      }
      const pose = live.poses[character.id];
      const clip = pose?.clip ?? character.clip;
      const frame = pose?.frame ?? 0;
      const frames = character.clips[clip] ?? character.clips.idle ?? [character.grid];
      const cell = frames[frame % frames.length] ?? character.grid;
      sprite.texture = textureFor(
        `${character.id}:${character.revision}:${clip}:${frame % frames.length}`,
        cell,
        SPRITE_W,
        SPRITE_H,
      );
      sprite.x = Math.round(((pose?.x ?? character.x) / 100) * app.screen.width);
      sprite.y = Math.round(ground - (pose?.lift ?? character.lift));
      sprite.scale.set((pose?.facing ?? character.facing) * scale, scale);
      sprite.rotation = ((pose?.spin ?? 0) * Math.PI) / 180;
      sprite.zIndex = sprite.x;
      const held = sprite.children[0];
      if (held && "texture" in held) {
        const item = state.items.find((entry) => entry.id === character.heldItemId);
        const itemSprite = held as import("pixi.js").Sprite;
        itemSprite.visible = Boolean(item);
        if (item) {
          itemSprite.texture = textureFor(`item:${item.id}`, item.grid, ICON, ICON);
          itemSprite.scale.set(0.55);
        }
      }
    }

    const propIds = new Set(state.props.map((prop) => prop.id));
    for (const [id, sprite] of propViews) {
      if (!propIds.has(id)) {
        sprite.destroy();
        propViews.delete(id);
      }
    }
    for (const prop of state.props) {
      let sprite = propViews.get(prop.id);
      if (!sprite) {
        sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.anchor.set(0.5, 1);
        sprite.eventMode = "static";
        sprite.cursor = "pointer";
        sprite.on("pointerdown", (event) => {
          event.stopPropagation();
          useStudio.getState().setPlaying(false);
          drag = { kind: "prop", id: prop.id };
        });
        world.addChild(sprite);
        propViews.set(prop.id, sprite);
      }
      const item = prop.itemId ? state.items.find((entry) => entry.id === prop.itemId) : undefined;
      const grid = item?.grid ?? propGlyph(prop.kind);
      sprite.texture = textureFor(item ? `item:${item.id}` : `prop:${prop.kind}`, grid, ICON, ICON);
      sprite.scale.set(scale * 0.85);
      sprite.x = Math.round((prop.x / 100) * app.screen.width);
      sprite.y = Math.round(ground - prop.lift);
      sprite.zIndex = sprite.x - 1;
    }

    ring.clear();
    const active = charViews.get(state.activeId);
    if (active) {
      const bounds = active.getBounds();
      ring.rect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6).stroke({
        width: 1,
        color: 0x00ffcc,
        alpha: 0.9,
      });
    }
  };

  const percent = (globalX: number) =>
    Math.max(6, Math.min(94, (globalX / Math.max(1, app.screen.width)) * 100));

  const move = (globalX: number) => {
    if (!drag) return;
    const x = percent(globalX);
    const api = useStudio.getState();
    if (drag.kind === "char") {
      api.setX(drag.id, x);
      const pose = live.poses[drag.id];
      if (pose) pose.x = x;
    } else {
      api.moveProp(drag.id, x);
    }
  };

  app.stage.on("pointermove", (event) => move(event.global.x));
  app.stage.on("pointerup", () => {
    drag = null;
  });
  app.stage.on("pointerupoutside", () => {
    drag = null;
  });
  app.ticker.add(sync);

  return () => {
    app.ticker.stop();
    app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
    for (const texture of owned) {
      if (!texture.destroyed) texture.destroy(true);
    }
    cache.clear();
  };
}

function drawBackdrop(
  graphics: import("pixi.js").Graphics,
  w: number,
  h: number,
  id: BackdropId,
) {
  graphics.clear();
  const ground = groundOf(h);
  if (id === "sunset") {
    graphics.rect(0, 0, w, h).fill({ color: 0x102029 });
    graphics.rect(0, ground * 0.42, w, ground * 0.18).fill({ color: 0x1b3a45 });
    graphics.rect(0, ground * 0.6, w, ground * 0.18).fill({ color: 0x34788c });
  } else if (id === "space") {
    graphics.rect(0, 0, w, h).fill({ color: 0x050a0c });
    for (let i = 0; i < 36; i++) {
      const x = (i * 97) % Math.max(1, Math.floor(w));
      const y = (i * 53) % Math.max(1, ground);
      graphics.rect(x, y, 2, 2).fill({ color: i % 5 === 0 ? 0x00ffcc : 0x72c4dc });
    }
  } else if (id === "alert") {
    graphics.rect(0, 0, w, h).fill({ color: 0x14080c });
    for (let y = 0; y < ground; y += 18) {
      graphics.rect(0, y, w, 2).fill({ color: 0xe23d3d, alpha: 0.28 });
    }
  } else {
    graphics.rect(0, 0, w, h).fill({ color: 0x070f12 });
    for (let x = 0; x <= w; x += 24) graphics.moveTo(x, 0).lineTo(x, ground);
    for (let y = 0; y <= ground; y += 24) graphics.moveTo(0, y).lineTo(w, y);
    graphics.stroke({ width: 1, color: 0x12323c, alpha: 0.9 });
  }
  graphics.rect(0, ground, w, Math.max(1, h - ground)).fill({ color: 0x0b171c });
  graphics.moveTo(0, ground).lineTo(w, ground).stroke({ width: 2, color: 0x00ffcc, alpha: 0.55 });
}

function mountCanvas(host: HTMLElement) {
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => canvas.remove();
  let drag: Drag = null;
  let raf = 0;

  const paint = (now: number) => {
    stepLive(now);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(host.clientWidth * dpr));
    const h = Math.max(1, Math.floor(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const state = useStudio.getState();
    const ground = groundOf(h);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = state.backdrop === "alert" ? "#14080c" : state.backdrop === "space" ? "#050a0c" : "#070f12";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(52,120,140,0.35)";
    ctx.beginPath();
    for (let x = 0; x <= w; x += 24 * dpr) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ground);
    }
    ctx.stroke();
    ctx.fillStyle = "#0b171c";
    ctx.fillRect(0, ground, w, h - ground);
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(0, ground, w, Math.max(1, dpr));
    const scale = (w < 560 * dpr ? 3 : 4) * (dpr > 1.25 ? 1 : 1);
    for (const prop of state.props) {
      const item = prop.itemId ? state.items.find((entry) => entry.id === prop.itemId) : undefined;
      const grid = item?.grid ?? propGlyph(prop.kind);
      paintGrid(
        ctx,
        grid,
        ICON,
        ICON,
        Math.round((prop.x / 100) * w - (ICON * scale) / 2),
        Math.round(ground - prop.lift * dpr - ICON * scale),
        scale,
      );
    }
    for (const character of state.characters) {
      const pose = live.poses[character.id];
      const clip = pose?.clip ?? character.clip;
      const frames = character.clips[clip] ?? character.clips.idle ?? [character.grid];
      const frame = frames[(pose?.frame ?? 0) % frames.length] ?? character.grid;
      const px = Math.round(((pose?.x ?? character.x) / 100) * w);
      const py = Math.round(ground - (pose?.lift ?? 0) * (dpr > 1 ? dpr / 1.5 : 1));
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(pose?.facing ?? 1, 1);
      paintGrid(ctx, frame, SPRITE_W, SPRITE_H, Math.round((-SPRITE_W * scale) / 2), Math.round(-SPRITE_H * scale), scale);
      ctx.restore();
    }
  };

  const loop = (now: number) => {
    paint(now);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const percent = (clientX: number) => {
    const rect = canvas.getBoundingClientRect();
    return Math.max(6, Math.min(94, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
  };
  const down = (event: PointerEvent) => {
    const x = percent(event.clientX);
    const state = useStudio.getState();
    const character = [...state.characters].reverse().find((entry) => Math.abs(entry.x - x) < 8);
    if (character) {
      drag = { kind: "char", id: character.id };
      state.selectChar(character.id);
      state.setPlaying(false);
      return;
    }
    const prop = [...state.props].reverse().find((entry) => Math.abs(entry.x - x) < 7);
    if (prop) {
      state.setPlaying(false);
      drag = { kind: "prop", id: prop.id };
    }
  };
  const move = (event: PointerEvent) => {
    if (!drag) return;
    const x = percent(event.clientX);
    if (drag.kind === "char") useStudio.getState().setX(drag.id, x);
    else useStudio.getState().moveProp(drag.id, x);
  };
  const up = () => {
    drag = null;
  };
  canvas.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    canvas.remove();
  };
}
