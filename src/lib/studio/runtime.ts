import { playSound } from "./audio";
import { parseScript, type Action, type Dir } from "./parser";
import { useStudio } from "./store";
import type { StudioCharacter } from "./types";

export type LivePose = {
  x: number;
  lift: number;
  facing: 1 | -1;
  clip: string;
  frame: number;
  spin: number;
  speech: string;
};

export const live: { poses: Record<string, LivePose> } = { poses: {} };

export const motion = { active: false };

const FRAME_BEAT = 0.55;
let playAcc = 0;
let shownFrame = -1;
let lastStep = 0;

export function seekPlay(index: number) {
  playAcc = Math.max(0, index) * FRAME_BEAT;
  shownFrame = index;
}

function ensurePose(character: StudioCharacter): LivePose {
  const existing = live.poses[character.id];
  if (existing) return existing;
  const pose: LivePose = {
    x: character.x,
    lift: character.lift,
    facing: character.facing,
    clip: character.clip,
    frame: 0,
    spin: character.spin,
    speech: character.speech,
  };
  live.poses[character.id] = pose;
  return pose;
}

export function stepLive(now: number) {
  const dt = lastStep ? Math.min(0.05, (now - lastStep) / 1000) : 0;
  lastStep = now;
  const state = useStudio.getState();
  if (state.playing && state.gameOn && state.keyframes.length > 0 && !motion.active) {
    playAcc += dt || 1 / 60;
    const count = state.keyframes.length;
    const span = count * FRAME_BEAT;
    const t = playAcc % span;
    const index = Math.min(count - 1, Math.floor(t / FRAME_BEAT));
    const frac = (t % FRAME_BEAT) / FRAME_BEAT;
    const current = state.keyframes[index];
    const next = state.keyframes[(index + 1) % count];
    if (current && next) {
      for (const character of state.characters) {
        const a = current.poses[character.id];
        const b = next.poses[character.id];
        if (!a || !b) continue;
        const clip = character.clips[a.clip] ? a.clip : "idle";
        const frames = character.clips[clip] ?? character.clips.idle ?? [character.grid];
        const pose = ensurePose(character);
        pose.x = a.x + (b.x - a.x) * frac;
        pose.lift = a.lift + (b.lift - a.lift) * frac;
        pose.facing = a.facing;
        pose.clip = clip;
        pose.frame = Math.floor(now / 120) % Math.max(1, frames.length);
        pose.spin = a.spin;
        pose.speech = a.speech;
      }
    }
    if (index !== shownFrame) {
      shownFrame = index;
      if (state.frameIndex !== index) useStudio.setState({ frameIndex: index });
    }
    return;
  }

  if (motion.active) return;

  const bob = state.gameOn ? (state.juice / 100) * 6 : 0;
  for (const character of state.characters) {
    const pose = ensurePose(character);
    const clip = character.clips[character.clip] ? character.clip : "idle";
    const frames = character.clips[clip] ?? [character.grid];
    pose.x = character.x;
    pose.lift = character.lift + (state.gameOn ? Math.sin(now / 320 + character.x) * bob : 0);
    pose.facing = character.facing;
    pose.clip = clip;
    pose.frame = state.gameOn ? Math.floor(now / 180) % Math.max(1, frames.length) : 0;
    pose.spin = character.spin;
    pose.speech = character.speech;
  }
  shownFrame = state.frameIndex;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      if (now - start >= ms) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function idsFor(who: string | "*" | null): string[] {
  const state = useStudio.getState();
  if (who === "*") return state.characters.map((character) => character.id);
  if (!who) return [state.activeId];
  const needle = who.toLowerCase();
  const found = state.characters.find(
    (character) => character.name.toLowerCase() === needle || character.id === who,
  );
  return [found?.id ?? state.activeId];
}

function characterOf(id: string) {
  return useStudio.getState().characters.find((character) => character.id === id) ?? null;
}

async function animate(
  id: string,
  ms: number,
  apply: (pose: LivePose, k: number, now: number) => void,
) {
  const character = characterOf(id);
  if (!character) return;
  motion.active = true;
  const pose = ensurePose(character);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const eased = k * (2 - k);
      apply(pose, eased, now);
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function finishMotion(id: string, pose: LivePose) {
  const api = useStudio.getState();
  api.setX(id, pose.x);
  api.setLift(id, pose.lift);
  api.setFacing(id, pose.facing);
  api.setSpin(id, 0);
  api.setClip(id, "idle");
  pose.spin = 0;
  pose.clip = "idle";
  motion.active = false;
}

async function slide(id: string, dir: Dir, dist: number) {
  const character = characterOf(id);
  if (!character) return;
  const pose = ensurePose(character);
  const fromX = pose.x;
  const fromLift = character.lift;
  let toX = fromX;
  let toLift = fromLift;
  if (dir.includes("left")) {
    toX -= dist;
    pose.facing = -1;
  }
  if (dir.includes("right")) {
    toX += dist;
    pose.facing = 1;
  }
  if (dir.includes("up")) toLift += Math.max(18, dist);
  if (dir.includes("down")) toLift = Math.max(0, fromLift - dist);
  toX = Math.max(6, Math.min(94, toX));
  useStudio.getState().setClip(id, "walk");
  await animate(id, 420, (livePose, k, now) => {
    livePose.x = fromX + (toX - fromX) * k;
    livePose.lift = fromLift + (toLift - fromLift) * k;
    livePose.clip = "walk";
    const frames = character.clips.walk ?? [character.grid];
    livePose.frame = Math.floor(now / 110) % frames.length;
  });
  pose.x = toX;
  pose.lift = dir.includes("up") ? 0 : toLift;
  if (dir.includes("up")) {
    await animate(id, 220, (livePose, k) => {
      livePose.lift = toLift * (1 - k);
    });
    pose.lift = 0;
  }
  finishMotion(id, pose);
  playSound("beep", useStudio.getState().soundOn, useStudio.getState().volume);
}

async function perform(action: Action, id: string) {
  const api = useStudio.getState();
  const character = characterOf(id);
  if (!character && action.op !== "spawn") return;
  if (action.op !== "say" && character) api.setSpeech(id, "");

  if (action.op === "move") {
    await slide(id, action.dir, action.dist);
    return;
  }
  if (action.op === "toward") {
    const prop = api.props.find(
      (entry) =>
        entry.kind.includes(action.target) || entry.label.toLowerCase().includes(action.target),
    );
    if (!prop || !character) {
      api.setSpeech(id, "No lock.");
      await wait(500);
      return;
    }
    const dir: Dir = prop.x < character.x ? "left" : "right";
    await slide(id, dir, Math.abs(prop.x - character.x));
    return;
  }
  if (action.op === "jump" && character) {
    playSound("jump", api.soundOn, api.volume);
    api.setClip(id, "jump");
    const pose = ensurePose(character);
    await animate(id, 420, (livePose, k) => {
      livePose.lift = Math.sin(k * Math.PI) * 52;
      livePose.clip = "jump";
      livePose.frame = 0;
    });
    pose.lift = 0;
    finishMotion(id, pose);
    return;
  }
  if (action.op === "crouch" && character) {
    const pose = ensurePose(character);
    await animate(id, 320, (livePose, k) => {
      livePose.lift = k < 0.55 ? -10 : -10 * (1 - (k - 0.55) / 0.45);
    });
    pose.lift = 0;
    finishMotion(id, pose);
    return;
  }
  if (action.op === "spin" && character) {
    playSound("action", api.soundOn, api.volume);
    const pose = ensurePose(character);
    await animate(id, 460, (livePose, k) => {
      livePose.spin = k * 360;
    });
    pose.spin = 0;
    finishMotion(id, pose);
    return;
  }
  if (action.op === "shoot" && character) {
    playSound("action", api.soundOn, api.volume);
    api.setClip(id, "shoot");
    await animate(id, 360, (livePose, _k, now) => {
      livePose.clip = "shoot";
      const frames = character.clips.shoot ?? [character.grid];
      livePose.frame = Math.floor(now / 120) % frames.length;
    });
    finishMotion(id, ensurePose(character));
    return;
  }
  if (action.op === "say") {
    api.setSpeech(id, action.text.slice(0, 72));
    playSound("beep", api.soundOn, api.volume);
    await wait(700);
    return;
  }
  if (action.op === "idle") {
    api.setClip(id, "idle");
    api.setLift(id, 0);
    await wait(220);
    return;
  }
  if (action.op === "spawn") {
    api.addProp(action.kind);
    playSound("beep", api.soundOn, api.volume);
    api.pushLog(`Spawned ${action.kind}.`, "ok");
  }
}

export async function runScript(raw: string) {
  const api = useStudio.getState();
  if (api.busy) return;
  const text = raw.trim();
  if (!text) return;
  api.setBusy(true);
  api.setPlaying(false);
  api.setLastScript(text);
  api.pushLog(`> ${text}`, "info");
  const actions = parseScript(
    text,
    api.characters.map((character) => character.name),
  );
  try {
    for (const action of actions) {
      if (action.op === "spawn") {
        await perform(action, api.activeId);
        continue;
      }
      for (const id of idsFor(action.who)) {
        await perform(action, id);
      }
    }
  } finally {
    useStudio.getState().setBusy(false);
  }
}

export async function actJump(id: string) {
  if (motion.active) return;
  await perform({ op: "jump", who: null }, id);
  useStudio.getState().setSpeech(id, "Action!");
}

export function nudge(id: string, dir: Dir) {
  if (motion.active) return;
  void slide(id, dir, dir === "up" || dir === "down" ? 28 : 8);
}
