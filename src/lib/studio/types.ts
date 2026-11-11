export type PageId =
  | "director"
  | "character"
  | "background"
  | "obstacles"
  | "items"
  | "vault"
  | "pixel";

export type BackdropId = "shafts" | "sunset" | "space" | "alert";

export type PropKind = "star" | "crate" | "barrier" | "crystal" | "pickup";

export type PoseSnap = {
  x: number;
  lift: number;
  facing: 1 | -1;
  clip: string;
  speech: string;
  spin: number;
};

export type StudioCharacter = {
  id: string;
  name: string;
  role: string;
  x: number;
  lift: number;
  facing: 1 | -1;
  spin: number;
  grid: number[];
  clips: Record<string, number[][]>;
  clip: string;
  speech: string;
  heldItemId: string | null;
  revision: number;
};

export type SceneProp = {
  id: string;
  kind: PropKind;
  label: string;
  x: number;
  lift: number;
  itemId?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  blurb: string;
  grid: number[];
};

export type Keyframe = {
  id: string;
  poses: Record<string, PoseSnap>;
};

export type LogLine = {
  id: string;
  text: string;
  tone: "ok" | "info" | "warn";
};

export type ModalState = {
  title: string;
  body: string;
} | null;
