import type { BottleType, Level } from "../game/types";

const first: Level = {
  id: 1,
  columns: [["currant", "water", "lemon"], ["water", "currant", "lemon"], ["water", "lemon", "currant"], ["lemon", "lemon", "lemon"]],
  orders: ["water", "lemon", "currant", "lemon"],
  layout: { layers: 1, columns: 4, seed: 2, complexity: 0 },
};
const types: BottleType[] = ["water", "lemon", "currant", "apple", "malt", "kola", "orange", "grape", "mint", "cherry"];
function round(id: number, kinds: number, batches: number, layers: number, pattern: NonNullable<Level["layout"]>["pattern"], sideDepth: number, glass: BottleType[] = []): Level {
  const orders = Array.from({ length: batches }, (_, i) => types[i % kinds]);
  const columns = orders.map(type => [type, type, type]);
  glass.forEach((type, i) => columns[i].unshift(type));
  return { id, orders, columns, layout: { layers, columns: 4, seed: id + 47, complexity: id === 2 ? 3 : 5, pattern, sideDepth } };
}
const clear: BottleType[] = ["glassClear"];
const colours: BottleType[] = ["glassClear", "glassBrown", "glassGreen"];
export const levels: Level[] = [
  first,
  round(2, 4, 6, 2, "pyramid", 0),
  round(3, 6, 10, 3, "twins", 3),
  round(4, 8, 12, 3, "cross", 4),
  round(5, 10, 14, 4, "pyramid", 5),
  round(6, 10, 16, 4, "ring", 6),
  round(7, 10, 18, 5, "twins", 7),
  round(8, 10, 20, 5, "cross", 8),
  round(9, 10, 22, 6, "pyramid", 9),
  round(10, 10, 24, 6, "ring", 10),
  round(11, 10, 24, 6, "twins", 10, clear),
  round(12, 10, 25, 6, "cross", 11, colours),
  round(13, 10, 26, 7, "pyramid", 11, colours),
  round(14, 10, 27, 7, "ring", 12, colours),
  round(15, 10, 28, 7, "twins", 12, [...colours, "glassBrown"]),
  round(16, 10, 29, 8, "cross", 13, [...colours, "glassClear"]),
  round(17, 10, 30, 8, "pyramid", 13, [...colours, "glassGreen"]),
  round(18, 10, 31, 8, "ring", 14, [...colours, ...colours]),
  round(19, 10, 32, 9, "twins", 14, [...colours, ...colours]),
  round(20, 10, 34, 9, "cross", 15, [...colours, ...colours]),
];
