export type Dir = "left" | "right" | "up" | "down" | "up-left" | "up-right";

export type Action =
  | { op: "move"; who: string | "*" | null; dir: Dir; dist: number }
  | { op: "toward"; who: string | "*" | null; target: string }
  | { op: "jump"; who: string | "*" | null }
  | { op: "say"; who: string | "*" | null; text: string }
  | { op: "crouch"; who: string | "*" | null }
  | { op: "spin"; who: string | "*" | null }
  | { op: "shoot"; who: string | "*" | null }
  | { op: "idle"; who: string | "*" | null }
  | { op: "spawn"; kind: "star" | "crate" | "barrier" | "crystal" | "pickup" };

const DIRS: Dir[] = ["up-left", "up-right", "left", "right", "up", "down"];

function findWho(text: string, names: string[]): { who: string | "*" | null; rest: string } {
  const lower = text.toLowerCase();
  if (/^(everyone|both|all)\b/.test(lower)) {
    return { who: "*", rest: text.replace(/^(everyone|both|all)\b/i, "").trim() };
  }
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const nl = name.toLowerCase();
    if (lower === nl) return { who: name, rest: "" };
    if (lower.startsWith(`${nl} `)) return { who: name, rest: text.slice(name.length).trim() };
  }
  return { who: null, rest: text };
}

function dirOf(text: string): Dir | null {
  const lower = text.toLowerCase().replace(/_/g, " ");
  if (/\bup[\s-]*left\b|\bnw\b/.test(lower)) return "up-left";
  if (/\bup[\s-]*right\b|\bne\b/.test(lower)) return "up-right";
  for (const dir of DIRS) {
    if (lower.includes(dir)) return dir;
  }
  return null;
}

function parseClause(clause: string, names: string[]): Action | null {
  const { who, rest } = findWho(clause, names);
  const text = (rest || clause).trim();
  const lower = text.toLowerCase();

  const say = text.match(/^(?:say|speak|talk)\s+["']?([\s\S]+?)["']?$/i);
  if (say?.[1]) return { op: "say", who, text: say[1].trim() };
  if (/^["'].+["']$/.test(text)) return { op: "say", who, text: text.replace(/^["']|["']$/g, "") };

  const spawn = lower.match(/\bspawn\s+(star|crate|barrier|crystal|pickup|prop)\b/);
  if (spawn?.[1]) {
    const token = spawn[1] === "prop" ? "crate" : spawn[1];
    if (
      token === "star" ||
      token === "crate" ||
      token === "barrier" ||
      token === "crystal" ||
      token === "pickup"
    ) {
      return { op: "spawn", kind: token };
    }
  }

  const toward = text.match(/\b(?:towards|toward|to)\s+(?:the\s+)?([a-z0-9_-]+)/i);
  if (toward?.[1] && /\b(walk|move|go|run)\b/i.test(text)) {
    return { op: "toward", who, target: toward[1].toLowerCase() };
  }

  if (/\bjump\b/.test(lower)) return { op: "jump", who };
  if (/\b(crouch|duck)\b/.test(lower)) return { op: "crouch", who };
  if (/\bspin\b/.test(lower)) return { op: "spin", who };
  if (/\b(shoot|fire)\b/.test(lower)) return { op: "shoot", who };
  if (/\b(idle|stop|wait)\b/.test(lower)) return { op: "idle", who };

  if (/\b(walk|move|go|run|step)\b/.test(lower)) {
    const dir = dirOf(lower) ?? "right";
    const num = lower.match(/(\d+(?:\.\d+)?)/);
    const dist = num ? Math.max(4, Math.min(80, Number(num[1]))) : 14;
    return { op: "move", who, dir, dist };
  }

  if (dirOf(lower) && text.length < 24) {
    return { op: "move", who, dir: dirOf(lower) ?? "right", dist: 14 };
  }

  if (text.length) return { op: "say", who, text };
  return null;
}

export function parseScript(input: string, names: string[]): Action[] {
  const parts = input
    .split(/\s*(?:,|;|&|\band then\b|\bthen\b|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const actions: Action[] = [];
  let carried: string | "*" | null = null;
  for (const part of parts) {
    const action = parseClause(part, names);
    if (!action) continue;
    if ("who" in action) {
      if (action.who) carried = action.who;
      else if (carried) action.who = carried;
    }
    actions.push(action);
  }
  return actions;
}
