import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Cpu,
  Eye,
  Gem,
  Menu,
  Mountain,
  Orbit,
  Package,
  Pause,
  PenLine,
  Pencil,
  Play,
  Plus,
  Settings,
  SkipBack,
  Square,
  Trash2,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { bindAudioLifecycle, ensureAudio, playSound } from "@/lib/studio/audio";
import { ITEM_TEMPLATES } from "@/lib/studio/palette";
import { actJump, nudge, runScript, seekPlay } from "@/lib/studio/runtime";
import { useStudio } from "@/lib/studio/store";
import type { PageId, PropKind } from "@/lib/studio/types";
import { cn } from "@/lib/cn";
import { ItemGlyph, PixelCard } from "./PixelCard";
import { PixelLab } from "./PixelLab";
import { PixiStage } from "./PixiStage";

const BRIEFINGS = [
  "Welcome to the lower shafts, operative. Choose your protocol before initiating terminal override.",
  "Warning: Security drones have detected unauthorized neural access in Sector 9.",
  "Acquire the dark crystal battery to power up the main elevator shaft.",
  "Signature verified. Access granted to encrypted sub-basement vaults.",
];

const NAV: { id: PageId; label: string; icon: typeof Clapperboard }[] = [
  { id: "director", label: "Scene Director", icon: Clapperboard },
  { id: "character", label: "Character Asset Gen", icon: User },
  { id: "background", label: "Background Generator", icon: Mountain },
  { id: "obstacles", label: "Obstacles Generator", icon: Boxes },
  { id: "items", label: "Item Pickup Generator", icon: Gem },
  { id: "vault", label: "Assets Vault", icon: Package },
  { id: "pixel", label: "Pixel Lab", icon: Pencil },
];

export function StudioApp() {
  const page = useStudio((state) => state.page);
  const navOpen = useStudio((state) => state.navOpen);
  const toggleNav = useStudio((state) => state.toggleNav);
  const setPage = useStudio((state) => state.setPage);
  const modal = useStudio((state) => state.modal);
  const closeModal = useStudio((state) => state.closeModal);
  const playing = useStudio((state) => state.playing);
  const gameOn = useStudio((state) => state.gameOn);

  useEffect(() => {
    void useStudio.persist.rehydrate();
    bindAudioLifecycle();
    const arm = () => ensureAudio();
    window.addEventListener("pointerdown", arm, { once: true });
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key === "Escape") useStudio.getState().closeModal();
      if (typing) return;
      const api = useStudio.getState();
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
      }
      if (event.repeat && (event.key === "ArrowUp" || event.key === " " || event.key === "w")) return;
      const id = api.activeId;
      if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") nudge(id, "left");
      if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") nudge(id, "right");
      if (event.key === "w" || event.key === "W" || event.key === "ArrowUp" || event.key === " ") {
        void actJump(id);
      }
      if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") void runScript("crouch");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-3 py-3 sm:px-6 sm:py-5">
      <div className="scanlines" aria-hidden="true" />
      <header className="pixel-box relative z-10 mb-3 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" className="pixel-btn px-3" onClick={toggleNav} aria-label="Toggle menu">
            <Menu className="h-4 w-4" />
          </button>
          <span className="live-pip" aria-hidden="true" />
          <div>
            <h1 className="text-sm tracking-widest text-paper sm:text-base">
              [UNDERHANDS OF MINES] <span className="text-glow">SCRIPTPLAY</span>{" "}
              <span className="text-neon">V1</span>
            </h1>
            <p className="text-xs tracking-widest text-mist">UI PACK + DIRECTOR + PIXEL LAB</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="pixel-box px-2 py-2 text-ice">ENGINE: PIXI + CANVAS2D</span>
          <span className="pixel-box bg-hull px-2 py-2 font-bold text-neon">
            {playing && gameOn ? "STATUS: PLAY" : "STATUS: ONLINE"}
          </span>
        </div>
      </header>

      <div className="shell relative z-10">
        <nav className={cn("nav-panel pixel-box p-3", navOpen && "is-open")} aria-label="Studio">
          <p className="kicker px-1 pb-1">Generators</p>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={cn("pixel-btn justify-start gap-2 text-left", page === item.id && "is-hot")}
                onClick={() => setPage(item.id)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <main className="min-w-0 space-y-3">
          {page === "director" ? <Director /> : null}
          {page === "character" ? <CharacterGen /> : null}
          {page === "background" ? <BackgroundGen /> : null}
          {page === "obstacles" ? <ObstacleGen /> : null}
          {page === "items" ? <ItemGen /> : null}
          {page === "vault" ? <Vault /> : null}
          {page === "pixel" ? <PixelLab /> : null}
        </main>
      </div>
      <footer className="relative z-10 py-6 text-center text-xs tracking-widest text-line">
        UNDERHANDS OF MINES · SCRIPTPLAY STUDIO · SPRITE PACK V1
      </footer>
      {modal ? (
        <div className="modal-back" onClick={closeModal} role="presentation">
          <div
            className="pixel-box w-full max-w-md bg-abyss p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
              <h2 id="modal-title" className="flex items-center gap-2 text-sm text-paper">
                <AlertTriangle className="h-4 w-4 text-amber" />
                {modal.title}
              </h2>
              <button type="button" className="pixel-btn px-3" onClick={closeModal} aria-label="Close">
                X
              </button>
            </div>
            <p className="text-sm leading-relaxed text-ice">{modal.body}</p>
            <div className="mt-4 flex justify-end">
              <button type="button" className="pixel-btn is-hot" onClick={closeModal}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Director() {
  const characters = useStudio((state) => state.characters);
  const activeId = useStudio((state) => state.activeId);
  const briefing = useStudio((state) => state.briefing);
  const logs = useStudio((state) => state.logs);
  const cycleBriefing = useStudio((state) => state.cycleBriefing);
  const active = characters.find((character) => character.id === activeId) ?? characters[0];
  const speaker = characters.find((character) => character.speech);
  const line = speaker ? `${speaker.name}: ${speaker.speech}` : BRIEFINGS[briefing] ?? BRIEFINGS[0];

  return (
    <div className="space-y-3">
      <section className="duo duo-2">
        <div className="pixel-box flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="kicker">Dialogue system</span>
            <span className="text-xs text-line">ID_01</span>
          </div>
          <div className="pixel-box bg-void p-3 text-sm leading-relaxed text-ice">{line}</div>
          <button type="button" className="pixel-btn" onClick={cycleBriefing}>
            <span className="inline-flex w-full items-center justify-between">
              Select protocol target
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
          <div className="pixel-box bg-void px-3 py-2 text-xs text-glow">
            <span className="text-neon">▶ </span>
            {speaker ? "Speech channel open" : "Awaiting user input command..."}
          </div>
        </div>
        <div className="pixel-box flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="inline-flex items-center gap-2 text-xs tracking-widest text-paper">
              <Cpu className="h-4 w-4" /> CI SYSTEM STATUS
            </span>
            <span className="text-xs text-glow">CYBERNETIC_INTERFACE</span>
          </div>
          <div className="log-well">
            {logs.map((entry) => (
              <p
                key={entry.id}
                className={cn(
                  entry.tone === "ok" && "text-neon",
                  entry.tone === "warn" && "text-amber",
                  entry.tone === "info" && "text-mist",
                )}
              >
                {entry.text}
              </p>
            ))}
          </div>
          <Meters />
        </div>
      </section>

      <section className="pixel-box p-2">
        <div className="mb-2 flex items-center justify-between px-1 text-xs">
          <span className="kicker">Pixi stage · sprite pack</span>
          <span className="text-neon">
            {active ? `${active.name} · ${active.clip}` : "NO SUBJECT"}
          </span>
        </div>
        <PixiStage />
        <p className="px-1 pt-2 text-xs text-line">
          Drag a sprite. A/D or the pad steps them. Arrows and space jump. Script runs the take.
        </p>
      </section>

      <Transport />
      <ScriptBar />

      <section className="duo duo-2">
        <FileTree />
        <div className="space-y-3">
          <Keyframes />
          <PadCluster />
        </div>
      </section>

      <ControlDeck />
      <Inventory />
      <WindowRow />
    </div>
  );
}

function Meters() {
  const characters = useStudio((state) => state.characters);
  const playing = useStudio((state) => state.playing);
  const soundOn = useStudio((state) => state.soundOn);
  const volume = useStudio((state) => state.volume);
  const juice = useStudio((state) => state.juice);
  const cpu = Math.min(96, 22 + characters.length * 9 + (playing ? 16 : 0) + (soundOn ? 5 : 0));
  const blocks = Math.max(1, Math.round(cpu / 20));
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="pixel-box bg-void p-2 text-center">
        <div className="text-xs text-line">CPU LOAD</div>
        <div className="text-neon">{cpu.toFixed(1)}%</div>
        <div className="meter mt-2">
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} className={index < blocks ? "on" : ""} />
          ))}
        </div>
      </div>
      <div className="pixel-box bg-void p-2">
        <div className="text-xs text-line">SYNAPSE</div>
        <div className="bar-track mt-2">
          <div className="bar-fill" style={{ width: `${juice}%` }} />
        </div>
      </div>
      <div className="pixel-box bg-void p-2 text-center">
        <div className="text-xs text-line">MEMORY SYNC</div>
        <div className="text-sm text-ice">{(1.1 + characters.length * 0.35).toFixed(2)} GB / 4 GB</div>
        <div className="mt-1 text-xs text-neon">AUDIO {volume}%</div>
      </div>
    </div>
  );
}

function Transport() {
  const playing = useStudio((state) => state.playing);
  const frameIndex = useStudio((state) => state.frameIndex);
  const keyframes = useStudio((state) => state.keyframes);
  const soundOn = useStudio((state) => state.soundOn);
  const volume = useStudio((state) => state.volume);
  const gameOn = useStudio((state) => state.gameOn);
  const setPlaying = useStudio((state) => state.setPlaying);
  const applyKeyframe = useStudio((state) => state.applyKeyframe);
  const toggleSound = useStudio((state) => state.toggleSound);
  const openModal = useStudio((state) => state.openModal);
  const count = Math.max(1, keyframes.length);
  const left = count <= 1 ? 0 : (frameIndex / (count - 1)) * 100;

  const scrub = (clientX: number, width: number, leftEdge: number) => {
    const ratio = Math.max(0, Math.min(0.999, (clientX - leftEdge) / Math.max(1, width)));
    const index = Math.min(keyframes.length - 1, Math.floor(ratio * keyframes.length));
    seekPlay(index);
    applyKeyframe(index);
    playSound("beep", soundOn, volume);
  };

  return (
    <section className="pixel-box space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          <IconButton label="Rewind" onClick={() => { seekPlay(0); applyKeyframe(0); }}>
            <SkipBack className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Stop"
            onClick={() => {
              setPlaying(false);
              seekPlay(0);
              applyKeyframe(0);
            }}
          >
            <Square className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Previous frame"
            onClick={() => {
              const index = (frameIndex - 1 + keyframes.length) % keyframes.length;
              seekPlay(index);
              applyKeyframe(index);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={playing ? "Pause" : "Play"}
            hot={playing}
            onClick={() => {
              ensureAudio();
              if (!gameOn) {
                openModal("NLERT", "Game option is OFF. Enable it before running the timeline.");
                return;
              }
              if (!playing) seekPlay(frameIndex);
              setPlaying(!playing);
              playSound("action", soundOn, volume);
            }}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </IconButton>
          <IconButton
            label="Next frame"
            onClick={() => {
              const index = (frameIndex + 1) % keyframes.length;
              seekPlay(index);
              applyKeyframe(index);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Toggle sound"
            hot={soundOn}
            onClick={() => {
              toggleSound();
              playSound("beep", !soundOn, volume);
            }}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </IconButton>
          <IconButton
            label="Help"
            onClick={() =>
              openModal(
                "SCRIPTPLAY HELP",
                "Type a take such as: operative walk right and jump and say hello. Directions: left, right, up, down, up-left, up-right. Also crouch, spin, shoot, idle, spawn crate, walk toward the star. Drag sprites on the Pixi stage. Stamp portraits in Pixel Lab.",
              )
            }
          >
            <Settings className="h-4 w-4" />
          </IconButton>
        </div>
        <span className="pixel-box bg-ink px-2 py-2 text-xs text-neon">{(frameIndex * 0.5).toFixed(1)}s</span>
      </div>
      <div
        className="scrub"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event.clientX, rect.width, rect.left);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          scrub(event.clientX, rect.width, rect.left);
        }}
      >
        <div className="scrub-track">
          <div className="scrub-fill" style={{ width: `${left}%` }} />
        </div>
        <div className="scrub-thumb" style={{ left: `${left}%` }} />
      </div>
    </section>
  );
}

function IconButton({
  children,
  label,
  onClick,
  hot,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  hot?: boolean;
}) {
  return (
    <button type="button" className={cn("pixel-btn px-3", hot && "is-hot")} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function ScriptBar() {
  const busy = useStudio((state) => state.busy);
  const [value, setValue] = useState("");
  return (
    <form
      className="pixel-box flex flex-col gap-2 p-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        ensureAudio();
        const next = value.trim();
        if (!next) return;
        setValue("");
        void runScript(next);
      }}
    >
      <label className="sr-only" htmlFor="script-line">
        Natural language script
      </label>
      <input
        id="script-line"
        className="pixel-input"
        value={value}
        disabled={busy}
        placeholder="walk right, jump and say hello"
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="pixel-btn is-hot" disabled={busy}>
        {busy ? "Running" : "Run take"}
      </button>
    </form>
  );
}

function FileTree() {
  const characters = useStudio((state) => state.characters);
  const activeId = useStudio((state) => state.activeId);
  const selectChar = useStudio((state) => state.selectChar);
  const setClip = useStudio((state) => state.setClip);
  const addClip = useStudio((state) => state.addClip);
  const removeCharacter = useStudio((state) => state.removeCharacter);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");

  return (
    <section className="pixel-box space-y-2 p-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="kicker">Character file tree</span>
        <span className="text-xs text-line">{characters.length} nodes</span>
      </div>
      {characters.map((character) => {
        const expanded = open[character.id] !== false;
        return (
          <div key={character.id} className="pixel-box bg-void p-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left"
              onClick={() => {
                selectChar(character.id);
                setOpen((current) => ({ ...current, [character.id]: !expanded }));
              }}
            >
              <span className="w-24 shrink-0">
                <PixelCard grid={character.grid} name={character.name} sub={character.role} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-paper">{character.name}</span>
                <span className="block text-xs text-line">{character.role}</span>
              </span>
            </button>
            {expanded ? (
              <div className="mt-2">
                {Object.entries(character.clips).map(([name, frames]) => (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "tree-file",
                      character.id === activeId && character.clip === name && "is-active",
                    )}
                    onClick={() => {
                      selectChar(character.id);
                      setClip(character.id, name);
                    }}
                  >
                    <span>{name}.anim</span>
                    <span>{frames.length * 8}f</span>
                  </button>
                ))}
                {character.id === activeId ? (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addClip(character.id, draft);
                      setDraft("");
                    }}
                  >
                    <input
                      className="pixel-input"
                      value={draft}
                      placeholder="new_anim"
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <button type="submit" className="pixel-btn px-3" aria-label="Add animation">
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>
                ) : null}
                <button
                  type="button"
                  className="pixel-btn mt-2 w-full"
                  onClick={() => removeCharacter(character.id)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Drop node
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function Keyframes() {
  const keyframes = useStudio((state) => state.keyframes);
  const frameIndex = useStudio((state) => state.frameIndex);
  const applyKeyframe = useStudio((state) => state.applyKeyframe);
  const addKeyframe = useStudio((state) => state.addKeyframe);
  const recordKeyframe = useStudio((state) => state.recordKeyframe);
  return (
    <section className="pixel-box space-y-2 p-3">
      <div className="flex items-center justify-between">
        <span className="kicker">Keyframes</span>
        <button type="button" className="pixel-btn px-3" onClick={recordKeyframe}>
          Apply
        </button>
      </div>
      <div className="slots">
        {keyframes.map((frame, index) => (
          <button
            key={frame.id}
            type="button"
            className={cn("slot", index === frameIndex && "is-active")}
            onClick={() => {
              seekPlay(index);
              applyKeyframe(index);
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </button>
        ))}
        <button type="button" className="slot" onClick={addKeyframe} aria-label="Add keyframe">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function PadCluster() {
  const activeId = useStudio((state) => state.activeId);
  const volume = useStudio((state) => state.volume);
  const juice = useStudio((state) => state.juice);
  const gameOn = useStudio((state) => state.gameOn);
  const soundOn = useStudio((state) => state.soundOn);
  const setVolume = useStudio((state) => state.setVolume);
  const setJuice = useStudio((state) => state.setJuice);
  const toggleGame = useStudio((state) => state.toggleGame);
  const setClip = useStudio((state) => state.setClip);
  const setSpeech = useStudio((state) => state.setSpeech);
  const addProp = useStudio((state) => state.addProp);
  const setPage = useStudio((state) => state.setPage);
  const characters = useStudio((state) => state.characters);
  const selectChar = useStudio((state) => state.selectChar);
  const active = characters.find((character) => character.id === activeId);

  const cyclePose = () => {
    if (!active) return;
    const order = ["idle", "walk", "jump", "shoot"].filter((name) => active.clips[name]);
    const index = Math.max(0, order.indexOf(active.clip));
    const next = order[(index + 1) % order.length] ?? "idle";
    setClip(active.id, next);
    setSpeech(active.id, next.toUpperCase());
    playSound("action", soundOn, volume);
  };

  return (
    <section className="pixel-box space-y-3 p-3">
      <span className="kicker">Kinematic pad</span>
      <div className="dpad">
        <button type="button" className="pad-btn n" aria-label="Jump" onClick={() => void actJump(activeId)}>
          N
        </button>
        <button type="button" className="pad-btn s" aria-label="Crouch" onClick={() => void runScript("crouch")}>
          S
        </button>
        <button type="button" className="pad-btn w" aria-label="Step left" onClick={() => nudge(activeId, "left")}>
          W
        </button>
        <button type="button" className="pad-btn e" aria-label="Step right" onClick={() => nudge(activeId, "right")}>
          E
        </button>
        <button type="button" className="pad-act" onClick={() => void actJump(activeId)}>
          ACT
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="pixel-btn" onClick={() => nudge(activeId, "up-left")}>
          NW
        </button>
        <button type="button" className="pixel-btn" onClick={() => nudge(activeId, "up-right")}>
          NE
        </button>
        <button type="button" className="pixel-btn" onClick={cyclePose} aria-label="Cycle pose">
          <Orbit className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="pixel-btn"
          aria-label="Cycle character"
          onClick={() => {
            const index = characters.findIndex((character) => character.id === activeId);
            const next = characters[(index + 1) % characters.length];
            if (next) selectChar(next.id);
          }}
        >
          <Eye className="h-4 w-4" />
        </button>
        <button type="button" className="pixel-btn" aria-label="Open pixel lab" onClick={() => setPage("pixel")}>
          <PenLine className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="pixel-btn"
          onClick={() => {
            const kinds: PropKind[] = ["star", "crate", "crystal", "pickup"];
            const kind = kinds[Math.floor(Math.random() * kinds.length)] ?? "crate";
            addProp(kind);
            playSound("beep", soundOn, volume);
          }}
        >
          Spawn
        </button>
      </div>
      <label className="block text-xs text-mist">
        <span className="flex justify-between">
          Master audio <span>{volume}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </label>
      <label className="block text-xs text-mist">
        <span className="flex justify-between">
          Fluid feedback <span>{juice}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={juice}
          onChange={(event) => setJuice(Number(event.target.value))}
        />
      </label>
      <div className="flex items-center justify-between">
        <span className="text-xs text-mist">GAME OPTION</span>
        <button
          type="button"
          className={cn("pixel-btn", gameOn ? "is-hot" : "is-alert")}
          onClick={() => {
            toggleGame();
            playSound("beep", soundOn, volume);
          }}
        >
          {gameOn ? "ON" : "OFF"}
        </button>
      </div>
    </section>
  );
}

function ControlDeck() {
  const openModal = useStudio((state) => state.openModal);
  const equipInspected = useStudio((state) => state.equipInspected);
  const setSpeech = useStudio((state) => state.setSpeech);
  const activeId = useStudio((state) => state.activeId);
  const setPlaying = useStudio((state) => state.setPlaying);
  const recordKeyframe = useStudio((state) => state.recordKeyframe);
  const pushLog = useStudio((state) => state.pushLog);
  return (
    <section className="pixel-box space-y-3 p-3">
      <span className="kicker">Interactive controls</span>
      <div className="grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          className="pixel-btn"
          onClick={() => {
            equipInspected();
            openModal("NLERT", "Accepted protocol. Inspected artifact moved to the active neural slot.");
          }}
        >
          Accept
        </button>
        <button
          type="button"
          className="pixel-btn is-hot"
          onClick={() => {
            setSpeech(activeId, "");
            openModal("NLERT", "Declined. Speech channel cleared.");
          }}
        >
          Decline
        </button>
        <button
          type="button"
          className="pixel-btn is-pressed"
          onClick={() => {
            setPlaying(false);
            openModal("NLERT", "Cancelled. Timeline held.");
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pixel-btn is-hot"
          onClick={() => {
            recordKeyframe();
            pushLog("Configuration applied to the active keyframe.", "ok");
          }}
        >
          Apply
        </button>
      </div>
      <button
        type="button"
        className="pixel-btn w-full"
        onClick={() => {
          setSpeech(activeId, "Artist Node 88");
          pushLog("Signature verified: Artist Node 88.", "ok");
        }}
      >
        Sign Artist Node 88
      </button>
    </section>
  );
}

function Inventory() {
  const items = useStudio((state) => state.items);
  const inspectedId = useStudio((state) => state.inspectedId);
  const inspect = useStudio((state) => state.inspect);
  const equipInspected = useStudio((state) => state.equipInspected);
  const inspected = items.find((item) => item.id === inspectedId);
  return (
    <section className="pixel-box space-y-3 p-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="kicker">Inventory</span>
        <span className="text-xs text-glow">{inspected ? inspected.name : "Select an artifact"}</span>
      </div>
      <div className="item-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn("item-cell", item.id === inspectedId && "is-active")}
            onClick={() => inspect(item.id)}
            aria-label={item.name}
          >
            <ItemGlyph grid={item.grid} />
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ice">{inspected?.blurb ?? "Select any artifact from the grid."}</p>
        <button type="button" className="pixel-btn" onClick={equipInspected}>
          Equip
        </button>
      </div>
    </section>
  );
}

function WindowRow() {
  const lastScript = useStudio((state) => state.lastScript);
  const gameOn = useStudio((state) => state.gameOn);
  const soundOn = useStudio((state) => state.soundOn);
  const openModal = useStudio((state) => state.openModal);
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="pixel-box p-3">
        <WindowBar title="TERMINAL_01" />
        <p className="pixel-box mt-2 min-h-16 bg-void p-2 text-xs text-mist">{lastScript}</p>
      </div>
      <div className="pixel-box p-3">
        <WindowBar title="CORE_LOGS" />
        <div className="pixel-box mt-2 space-y-2 bg-void p-2 text-xs text-ice">
          <p>{gameOn ? "Node active" : "Node idle"}</p>
          <p>{soundOn ? "Stream sync OK" : "Audio muted"}</p>
        </div>
      </div>
      <button
        type="button"
        className="pixel-box p-3"
        onClick={() =>
          openModal(
            "NLERT",
            "Parental advisory. Shaft feeds include hazard imagery and explicit industrial content. Not a clearance for restricted channels.",
          )
        }
      >
        <div className="plaque">
          <div className="text-xs tracking-widest text-paper">PARENTAL</div>
          <div className="text-lg text-alert">ADVISORY</div>
          <div className="text-xs text-ice">EXPLICIT CONTENT</div>
        </div>
      </button>
      <div className="pixel-box p-3">
        <WindowBar title="NLERT" />
        <p className="mt-2 text-sm text-ice">Sub-zero pressure drop detected in sector 4.</p>
        <button
          type="button"
          className="pixel-btn mt-2 w-full"
          onClick={() => openModal("NLERT", "System alert verified and acknowledged.")}
        >
          OK
        </button>
      </div>
    </section>
  );
}

function WindowBar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between bg-hull px-2 py-1 text-xs text-paper">
      <span>{title}</span>
      <span className="flex gap-1">
        <i className="inline-block h-2 w-2 bg-line" />
        <i className="inline-block h-2 w-2 bg-glow" />
        <i className="inline-block h-2 w-2 bg-neon" />
      </span>
    </div>
  );
}

function CharacterGen() {
  const addCharacter = useStudio((state) => state.addCharacter);
  const setPage = useStudio((state) => state.setPage);
  const [name, setName] = useState("NODE_03");
  const [role, setRole] = useState("Generated operative");
  const [mesh, setMesh] = useState<"biped" | "drone">("biped");
  const [visor, setVisor] = useState(7);
  const [note, setNote] = useState("Mesh compiles straight into the file tree and the Pixi stage.");

  return (
    <section className="pixel-box space-y-4 p-4">
      <header className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg text-paper">Character asset generator</h2>
        <button
          type="button"
          className="pixel-btn is-hot"
          onClick={() => {
            addCharacter({ name, role, mesh, visor });
            setNote(`${name.toUpperCase()} stamped. Open the stage or pixel lab to pose it.`);
          }}
        >
          Generate asset
        </button>
      </header>
      <div className="duo duo-2">
        <label className="block space-y-1">
          <span className="kicker">Callsign</span>
          <input className="pixel-input" value={name} maxLength={18} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="kicker">Role</span>
          <input className="pixel-input" value={role} maxLength={32} onChange={(event) => setRole(event.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="kicker">Base mesh</span>
          <select className="pixel-input" value={mesh} onChange={(event) => setMesh(event.target.value as "biped" | "drone")}>
            <option value="biped">Biped operative</option>
            <option value="drone">Survey drone</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="kicker">Visor pigment</span>
          <select className="pixel-input" value={visor} onChange={(event) => setVisor(Number(event.target.value))}>
            <option value={7}>Neon</option>
            <option value={10}>Amber</option>
            <option value={9}>Alert</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-ice">{note}</p>
      <button type="button" className="pixel-btn" onClick={() => setPage("director")}>
        Open on stage
      </button>
    </section>
  );
}

function BackgroundGen() {
  const backdrop = useStudio((state) => state.backdrop);
  const setBackdrop = useStudio((state) => state.setBackdrop);
  const setPage = useStudio((state) => state.setPage);
  const options = [
    ["shafts", "Lower shafts"],
    ["sunset", "Neon sunset"],
    ["space", "Deep space grid"],
    ["alert", "Sector alert"],
  ] as const;
  return (
    <section className="pixel-box space-y-4 p-4">
      <h2 className="text-lg text-paper">Background generator</h2>
      <p className="text-sm text-mist">Skyboxes render inside the Pixi stage, not as a flat poster.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn("pixel-btn", backdrop === id && "is-hot")}
            onClick={() => setBackdrop(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="button" className="pixel-btn" onClick={() => setPage("director")}>
        View skybox
      </button>
    </section>
  );
}

function ObstacleGen() {
  const populateSector = useStudio((state) => state.populateSector);
  const setPage = useStudio((state) => state.setPage);
  const [density, setDensity] = useState<"scatter" | "maze">("scatter");
  const [kind, setKind] = useState<"crate" | "barrier" | "crystal">("crate");
  return (
    <section className="pixel-box space-y-4 p-4">
      <h2 className="text-lg text-paper">Obstacles generator</h2>
      <div className="duo duo-2">
        <label className="block space-y-1">
          <span className="kicker">Density</span>
          <select className="pixel-input" value={density} onChange={(event) => setDensity(event.target.value as "scatter" | "maze")}>
            <option value="scatter">Medium scatter</option>
            <option value="maze">Dense line</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="kicker">Material</span>
          <select className="pixel-input" value={kind} onChange={(event) => setKind(event.target.value as "crate" | "barrier" | "crystal")}>
            <option value="crate">Cargo crates</option>
            <option value="barrier">Hazard barriers</option>
            <option value="crystal">Crystal spires</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="pixel-btn is-hot"
        onClick={() => {
          populateSector(density, kind);
          setPage("director");
        }}
      >
        Populate sector
      </button>
    </section>
  );
}

function ItemGen() {
  const addItem = useStudio((state) => state.addItem);
  const addProp = useStudio((state) => state.addProp);
  const [index, setIndex] = useState(0);
  const template = ITEM_TEMPLATES[index] ?? ITEM_TEMPLATES[0];
  const [name, setName] = useState(template?.name ?? "Pickup");
  const [blurb, setBlurb] = useState(template?.blurb ?? "");
  const [drop, setDrop] = useState(true);
  if (!template) return null;
  return (
    <section className="pixel-box space-y-4 p-4">
      <h2 className="text-lg text-paper">Item pickup generator</h2>
      <div className="flex items-center gap-3">
        <ItemGlyph grid={template.grid} />
        <p className="text-sm text-mist">Archetype becomes a vault item and can drop onto the stage.</p>
      </div>
      <label className="block space-y-1">
        <span className="kicker">Archetype</span>
        <select
          className="pixel-input"
          value={index}
          onChange={(event) => {
            const next = Number(event.target.value);
            const item = ITEM_TEMPLATES[next];
            setIndex(next);
            if (item) {
              setName(item.name);
              setBlurb(item.blurb);
            }
          }}
        >
          {ITEM_TEMPLATES.map((item, itemIndex) => (
            <option key={item.name} value={itemIndex}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="kicker">Name</span>
        <input className="pixel-input" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="kicker">Note</span>
        <input className="pixel-input" value={blurb} onChange={(event) => setBlurb(event.target.value)} />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm text-ice">
        <input type="checkbox" checked={drop} onChange={(event) => setDrop(event.target.checked)} />
        Drop a pickup on the stage
      </label>
      <button
        type="button"
        className="pixel-btn is-hot"
        onClick={() => {
          addItem(name, blurb, template.grid);
          if (drop) {
            const created = useStudio.getState().items.at(-1);
            addProp("pickup", name, created?.id);
          }
        }}
      >
        Save pickup
      </button>
    </section>
  );
}

function Vault() {
  const characters = useStudio((state) => state.characters);
  const items = useStudio((state) => state.items);
  const props = useStudio((state) => state.props);
  const selectChar = useStudio((state) => state.selectChar);
  const setPage = useStudio((state) => state.setPage);
  const inspect = useStudio((state) => state.inspect);
  const removeProp = useStudio((state) => state.removeProp);
  const backdrop = useStudio((state) => state.backdrop);
  return (
    <section className="space-y-3">
      <header className="pixel-box p-4">
        <h2 className="text-lg text-paper">Assets vault</h2>
        <p className="text-sm text-mist">Skybox {backdrop}. Tap a card to send it to the director.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            className="pixel-box p-3 text-left"
            onClick={() => {
              selectChar(character.id);
              setPage("director");
            }}
          >
            <PixelCard grid={character.grid} name={character.name} sub={character.role} />
            <p className="mt-2 text-xs text-line">{Object.keys(character.clips).length} clips</p>
          </button>
        ))}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="pixel-box flex items-center gap-3 p-3 text-left"
            onClick={() => {
              inspect(item.id);
              setPage("director");
            }}
          >
            <ItemGlyph grid={item.grid} />
            <span>
              <span className="block text-sm text-paper">{item.name}</span>
              <span className="block text-xs text-line">{item.blurb}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="pixel-box p-3">
        <p className="kicker mb-2">Stage props</p>
        <ul className="space-y-2">
          {props.map((prop) => (
            <li key={prop.id} className="flex items-center justify-between gap-2 text-sm text-ice">
              <span>
                {prop.label} · {Math.round(prop.x)}%
              </span>
              <button type="button" className="pixel-btn px-3" onClick={() => removeProp(prop.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
