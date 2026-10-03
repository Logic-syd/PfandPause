import type { Level } from "../game/types";

export const TUTORIAL_VERSION = 2;
// A separate balanced board; practice never unlocks or changes a real level.
export const tutorialLevel: Level = {
  id: 1,
  columns: [
    ["water", "water", "water"],
    ["currant", "lemon", "lemon", "lemon"],
    ["currant"],
    ["currant"],
  ],
  orders: ["water", "lemon", "currant"],
};
export const tutorialSteps: { column: number | null; lesson: number }[] = [
  { column: 0, lesson: 0 },
  { column: 1, lesson: 1 },
  { column: 2, lesson: 2 },
  { column: 3, lesson: 2 },
  { column: null, lesson: 3 }, // Undo the deliberate failure.
  { column: 0, lesson: 4 },
  { column: 0, lesson: 4 },
  { column: 3, lesson: 4 },
  { column: 1, lesson: 5 },
  { column: 1, lesson: 5 },
  { column: 1, lesson: 5 },
];
