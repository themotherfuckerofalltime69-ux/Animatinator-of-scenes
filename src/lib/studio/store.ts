import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DRONE_GRID,
  ITEM_TEMPLATES,
  OPERATIVE_GRID,
  SPRITE_H,
  SPRITE_W,
  buildClips,
  tintIndex,
} from "./palette";
import type {
  BackdropId,
  InventoryItem,
  Keyframe,
  LogLine,
  ModalState,
  PageId,
  PoseSnap,
  PropKind,
  SceneProp,
  StudioCharacter,
} from "./types";

const STANDARD = ["idle", "walk", "jump", "shoot"];

let seq = 40;
function uid(prefix: string) {
  seq += 1;
  return `${prefix}${seq.toString(36)}`;
}

function makeCharacter(partial: {
  id: string;
  name: string;
  role: string;
  x: number;
  grid: number[];
  facing?: 1 | -1;
}): StudioCharacter {
  const grid = partial.grid.slice();
  return {
    id: partial.id,
    name: partial.name,
    role: partial.role,
    x: partial.x,
    lift: 0,
    facing: partial.facing ?? 1,
    spin: 0,
    grid,
    clips: buildClips(grid),
    clip: "idle",
    speech: "",
    heldItemId: null,
    revision: 1,
  };
}

function snap(character: StudioCharacter, over: Partial<PoseSnap> = {}): PoseSnap {
  return {
    x: character.x,
    lift: character.lift,
    facing: character.facing,
    clip: character.clip,
    speech: character.speech,
    spin: character.spin,
    ...over,
  };
}

const operative = makeCharacter({
  id: "op1",
  name: "OPERATIVE",
  role: "Shaft operative",
  x: 22,
  grid: OPERATIVE_GRID,
});
const drone = makeCharacter({
  id: "dr1",
  name: "DRONE",
  role: "Survey drone",
  x: 70,
  grid: DRONE_GRID,
});

function seedFrames(): Keyframe[] {
  const marks = [18, 30, 42, 54, 66, 78];
  return marks.map((x, index) => ({
    id: `kf${index + 1}`,
    poses: {
      op1: snap(operative, {
        x,
        clip: index === marks.length - 1 ? "idle" : "walk",
        facing: 1,
      }),
      dr1: snap(drone, {
        x: 70 + (index % 2 === 0 ? 0 : 4),
        clip: "idle",
        lift: index % 2 === 0 ? 10 : 22,
      }),
    },
  }));
}

const starterItems: InventoryItem[] = ITEM_TEMPLATES.slice(0, 8).map((item, index) => ({
  id: `item${index + 1}`,
  name: item.name,
  blurb: item.blurb,
  grid: item.grid.slice(),
}));

export type StudioState = {
  page: PageId;
  navOpen: boolean;
  modal: ModalState;
  characters: StudioCharacter[];
  props: SceneProp[];
  items: InventoryItem[];
  keyframes: Keyframe[];
  frameIndex: number;
  playing: boolean;
  activeId: string;
  inspectedId: string;
  backdrop: BackdropId;
  volume: number;
  juice: number;
  soundOn: boolean;
  gameOn: boolean;
  logs: LogLine[];
  briefing: number;
  lastScript: string;
  busy: boolean;
  setPage: (page: PageId) => void;
  toggleNav: () => void;
  openModal: (title: string, body: string) => void;
  closeModal: () => void;
  selectChar: (id: string) => void;
  setX: (id: string, x: number) => void;
  setLift: (id: string, lift: number) => void;
  setFacing: (id: string, facing: 1 | -1) => void;
  setClip: (id: string, clip: string) => void;
  setSpeech: (id: string, speech: string) => void;
  setSpin: (id: string, spin: number) => void;
  addCharacter: (input: { name: string; role: string; mesh: "biped" | "drone"; visor: number }) => void;
  removeCharacter: (id: string) => void;
  addClip: (id: string, name: string) => void;
  commitAvatar: (id: string, grid: number[]) => void;
  commitClip: (id: string, clip: string, frames: number[][]) => void;
  setHeld: (id: string, itemId: string | null) => void;
  setBackdrop: (backdrop: BackdropId) => void;
  addProp: (kind: PropKind, label?: string, itemId?: string) => void;
  moveProp: (id: string, x: number) => void;
  removeProp: (id: string) => void;
  populateSector: (density: "scatter" | "maze", kind: "crate" | "barrier" | "crystal") => void;
  addItem: (name: string, blurb: string, grid: number[]) => void;
  inspect: (id: string) => void;
  equipInspected: () => void;
  setVolume: (volume: number) => void;
  setJuice: (juice: number) => void;
  toggleSound: () => void;
  toggleGame: () => void;
  pushLog: (text: string, tone?: LogLine["tone"]) => void;
  setPlaying: (playing: boolean) => void;
  setFrameIndex: (index: number) => void;
  applyKeyframe: (index: number) => void;
  recordKeyframe: () => void;
  addKeyframe: () => void;
  cycleBriefing: () => void;
  setLastScript: (script: string) => void;
  setBusy: (busy: boolean) => void;
};

function patchCharacter(
  characters: StudioCharacter[],
  id: string,
  recipe: (character: StudioCharacter) => StudioCharacter,
) {
  return characters.map((character) => (character.id === id ? recipe(character) : character));
}

function withPose(character: StudioCharacter): PoseSnap {
  return snap(character);
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      page: "director",
      navOpen: false,
      modal: null,
      characters: [operative, drone],
      props: [
        { id: "star1", kind: "star", label: "STAR", x: 58, lift: 28 },
      ],
      items: starterItems,
      keyframes: seedFrames(),
      frameIndex: 0,
      playing: false,
      activeId: "op1",
      inspectedId: "item1",
      backdrop: "shafts",
      volume: 75,
      juice: 60,
      soundOn: true,
      gameOn: true,
      logs: [
        { id: "l1", text: "> INITIALIZING SECURE NEURAL HANDSHAKE...", tone: "ok" },
        { id: "l2", text: "> MINE SECTOR 7: INTEGRITY 98.4%", tone: "info" },
        { id: "l3", text: "> SYNAPTIC FREQUENCY: 4.12 GHz", tone: "info" },
        { id: "l4", text: "> READY FOR DEPLOYMENT SEQUENCE.", tone: "ok" },
      ],
      briefing: 0,
      lastScript: "ANIM.play(idle); ENTITY.spawn(OPERATIVE);",
      busy: false,
      setPage: (page) => set({ page, navOpen: false }),
      toggleNav: () => set((state) => ({ navOpen: !state.navOpen })),
      openModal: (title, body) => set({ modal: { title, body } }),
      closeModal: () => set({ modal: null }),
      selectChar: (id) => set({ activeId: id }),
      setX: (id, x) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            x: Math.max(6, Math.min(94, x)),
          })),
        })),
      setLift: (id, lift) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            lift,
          })),
        })),
      setFacing: (id, facing) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            facing,
          })),
        })),
      setClip: (id, clip) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            clip: character.clips[clip] ? clip : character.clip,
          })),
        })),
      setSpeech: (id, speech) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            speech,
          })),
        })),
      setSpin: (id, spin) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            spin,
          })),
        })),
      addCharacter: ({ name, role, mesh, visor }) => {
        const base = mesh === "drone" ? DRONE_GRID : OPERATIVE_GRID;
        const grid = tintIndex(base, 9, visor);
        const id = uid("ch");
        const character = makeCharacter({
          id,
          name: name.trim().slice(0, 18).toUpperCase() || "NODE",
          role: role.trim().slice(0, 32) || "Generated asset",
          x: 30 + (get().characters.length * 12) % 50,
          grid,
        });
        set((state) => ({
          characters: [...state.characters, character],
          activeId: id,
          keyframes: state.keyframes.map((frame) => ({
            ...frame,
            poses: { ...frame.poses, [id]: withPose(character) },
          })),
        }));
        get().pushLog(`Asset stamped: ${character.name}`, "ok");
      },
      removeCharacter: (id) =>
        set((state) => {
          if (state.characters.length < 2) return state;
          const characters = state.characters.filter((character) => character.id !== id);
          const keyframes = state.keyframes.map((frame) => {
            const poses = { ...frame.poses };
            delete poses[id];
            return { ...frame, poses };
          });
          return {
            characters,
            keyframes,
            activeId: state.activeId === id ? (characters[0]?.id ?? state.activeId) : state.activeId,
          };
        }),
      addClip: (id, name) => {
        const clean = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 18);
        if (!clean) return;
        const character = get().characters.find((entry) => entry.id === id);
        if (!character || character.clips[clean]) {
          get().pushLog(`Clip already bound: ${clean || "unnamed"}`, "warn");
          return;
        }
        set((state) => ({
          characters: patchCharacter(state.characters, id, (entry) => ({
            ...entry,
            clips: {
              ...entry.clips,
              [clean]: (entry.clips.idle ?? [entry.grid]).map((frame) => frame.slice()),
            },
            clip: clean,
            revision: entry.revision + 1,
          })),
        }));
        get().pushLog(`Animation added: ${clean}.anim`, "ok");
      },
      commitAvatar: (id, grid) => {
        if (grid.length !== SPRITE_W * SPRITE_H) return;
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => {
            const next = buildClips(grid);
            const clips = { ...character.clips, ...next };
            return {
              ...character,
              grid: grid.slice(),
              clips,
              revision: character.revision + 1,
            };
          }),
        }));
        get().pushLog("Pixel portrait bound to character card.", "ok");
      },
      commitClip: (id, clip, frames) => {
        const usable = frames.filter((frame) => frame.length === SPRITE_W * SPRITE_H);
        if (!usable.length) return;
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            clips: { ...character.clips, [clip]: usable.map((frame) => frame.slice()) },
            clip,
            revision: character.revision + 1,
          })),
        }));
        get().pushLog(`Clip ${clip} received ${usable.length} pixel frame(s).`, "ok");
      },
      setHeld: (id, itemId) =>
        set((state) => ({
          characters: patchCharacter(state.characters, id, (character) => ({
            ...character,
            heldItemId: itemId,
          })),
        })),
      setBackdrop: (backdrop) => {
        set({ backdrop });
        get().pushLog(`Skybox locked: ${backdrop}`, "info");
      },
      addProp: (kind, label, itemId) =>
        set((state) => ({
          props: [
            ...state.props,
            {
              id: uid("pr"),
              kind,
              label: label ?? kind.toUpperCase(),
              x: 18 + ((state.props.length * 17) % 64),
              lift: kind === "star" || kind === "pickup" ? 26 : 0,
              itemId,
            },
          ],
        })),
      moveProp: (id, x) =>
        set((state) => ({
          props: state.props.map((prop) =>
            prop.id === id ? { ...prop, x: Math.max(6, Math.min(94, x)) } : prop,
          ),
        })),
      removeProp: (id) =>
        set((state) => ({ props: state.props.filter((prop) => prop.id !== id) })),
      populateSector: (density, kind) => {
        const count = density === "maze" ? 6 : 3;
        set((state) => ({
          props: [
            ...state.props.filter((prop) => prop.kind === "star" || prop.kind === "pickup"),
            ...Array.from({ length: count }, (_, index) => ({
              id: uid("ob"),
              kind,
              label: kind.toUpperCase(),
              x: 14 + ((index + 1) * 72) / (count + 1),
              lift: 0,
            })),
          ],
        }));
        get().pushLog(`Sector populated with ${count} ${kind} obstacles.`, "warn");
      },
      addItem: (name, blurb, grid) => {
        const item: InventoryItem = {
          id: uid("it"),
          name: name.trim().slice(0, 28) || "Pickup",
          blurb: blurb.trim().slice(0, 80) || "Generated underhands artifact.",
          grid: grid.slice(),
        };
        set((state) => ({ items: [...state.items, item], inspectedId: item.id }));
        get().pushLog(`Pickup archived: ${item.name}`, "ok");
      },
      inspect: (id) => set({ inspectedId: id }),
      equipInspected: () => {
        const state = get();
        const item = state.items.find((entry) => entry.id === state.inspectedId);
        if (!item) return;
        get().setHeld(state.activeId, item.id);
        get().pushLog(`${item.name} equipped to neural slot.`, "ok");
      },
      setVolume: (volume) => set({ volume }),
      setJuice: (juice) => set({ juice }),
      toggleSound: () => set((state) => ({ soundOn: !state.soundOn })),
      toggleGame: () =>
        set((state) => ({
          gameOn: !state.gameOn,
          playing: state.gameOn ? false : state.playing,
        })),
      pushLog: (text, tone = "info") =>
        set((state) => ({
          logs: [...state.logs, { id: uid("lg"), text, tone }].slice(-14),
        })),
      setPlaying: (playing) => set({ playing }),
      setFrameIndex: (index) => set({ frameIndex: index }),
      applyKeyframe: (index) => {
        const frame = get().keyframes[index];
        if (!frame) return;
        set((state) => ({
          frameIndex: index,
          playing: false,
          characters: state.characters.map((character) => {
            const pose = frame.poses[character.id];
            if (!pose) return character;
            return {
              ...character,
              x: pose.x,
              lift: pose.lift,
              facing: pose.facing,
              clip: character.clips[pose.clip] ? pose.clip : character.clip,
              speech: pose.speech,
              spin: pose.spin,
            };
          }),
        }));
      },
      recordKeyframe: () => {
        const state = get();
        const poses: Record<string, PoseSnap> = {};
        for (const character of state.characters) poses[character.id] = withPose(character);
        set((current) => ({
          keyframes: current.keyframes.map((frame, index) =>
            index === current.frameIndex ? { ...frame, poses } : frame,
          ),
        }));
        get().pushLog(`Keyframe ${state.frameIndex + 1} overwritten.`, "ok");
      },
      addKeyframe: () => {
        const state = get();
        const poses: Record<string, PoseSnap> = {};
        for (const character of state.characters) poses[character.id] = withPose(character);
        const frame: Keyframe = { id: uid("kf"), poses };
        set((current) => {
          const keyframes = current.keyframes.slice();
          keyframes.splice(current.frameIndex + 1, 0, frame);
          return { keyframes, frameIndex: current.frameIndex + 1, playing: false };
        });
      },
      cycleBriefing: () => set((state) => ({ briefing: (state.briefing + 1) % 4 })),
      setLastScript: (lastScript) => set({ lastScript }),
      setBusy: (busy) => set({ busy }),
    }),
    {
      name: "underhands-scriptplay-v1",
      skipHydration: true,
      partialize: (state) => ({
        characters: state.characters,
        props: state.props,
        items: state.items,
        keyframes: state.keyframes,
        activeId: state.activeId,
        inspectedId: state.inspectedId,
        backdrop: state.backdrop,
        volume: state.volume,
        juice: state.juice,
        soundOn: state.soundOn,
        gameOn: state.gameOn,
        logs: state.logs,
        briefing: state.briefing,
        lastScript: state.lastScript,
        frameIndex: state.frameIndex,
      }),
    },
  ),
);

export { STANDARD };
