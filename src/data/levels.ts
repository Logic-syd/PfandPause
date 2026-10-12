import type { BottleType, Level } from "../game/types";

// The former second round is now the opening round, with its original inventory/layout.
const first: Level = {
  id: 1,
  columns: [["currant", "water", "lemon"], ["water", "currant", "lemon"], ["water", "lemon", "currant"], ["lemon", "lemon", "lemon"]],
  orders: ["water", "lemon", "currant", "lemon"],
  layout: { layers: 1, columns: 4, seed: 2, complexity: 0 },
};
const types: BottleType[] = ["water", "lemon", "currant", "apple", "malt", "kola", "orange", "grape", "mint", "cherry"];
function round(id: number, kinds: number, batches: number, layers: number, glass: BottleType[] = []): Level {
  const orders = Array.from({ length: batches }, (_, i) => types[i % kinds]);
  const columns = orders.map(type => [type, type, type]);
  glass.forEach((type, i) => columns[i].unshift(type));
  return { id, orders, columns, layout: { layers, columns: id === 2 ? 4 : 5, seed: id + 47, complexity: id === 2 ? 3 : 5 } };
}
export const levels: Level[] = [
  first,
  round(2, 4, 6, 2),
  round(3, 6, 10, 3),
  round(4, 8, 12, 3),
  round(5, 10, 14, 3),
  round(6, 10, 15, 3),
  round(7, 10, 16, 3),
  round(8, 10, 17, 3),
  round(9, 10, 18, 3),
  round(10, 8, 12, 3, ["glassClear"]),
  round(11, 9, 14, 3, ["glassClear", "glassBrown"]),
  round(12, 10, 16, 3, ["glassClear", "glassBrown", "glassGreen"]),
  round(13, 10, 18, 3, ["glassClear", "glassBrown", "glassGreen", "glassBrown"]),
  round(14, 10, 20, 4, ["glassClear", "glassBrown", "glassGreen", "glassClear", "glassGreen"]),
];
