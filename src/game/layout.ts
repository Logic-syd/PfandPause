import type { Level, BottleType } from './types';
import type { Tile } from './triple';

// Central shapes alternate by half a card; two narrow side stacks share the tray.
// All blockers are geometric, including partial overlaps across several layers.
export function layeredTiles(inventory: BottleType[], layout: NonNullable<Level['layout']>): Tile[] {
  const tiles: Tile[] = [];
  const sideDepth = layout.sideDepth ?? 0;
  const middleCount = inventory.length - sideDepth * 2;
  const add = (x: number, y: number, layer: number) => {
    const id = tiles.length;
    tiles.push({ id, bottle: inventory[id], x, y, layer, blockedBy: [] });
  };
  let remaining = middleCount;
  for (let layer = 0; layer < layout.layers; layer++) {
    const count = Math.ceil(remaining / (layout.layers - layer)) + (layout.layers - layer > 2 ? 1 : 0);
    remaining -= count;
    const cells = Array.from({ length: 12 }, (_, i) => ({ x: i % 3, y: Math.floor(i / 3) }));
    const score = ({ x, y }: { x: number; y: number }) => {
      const dx = Math.abs(x - 1), dy = Math.abs(y - 1.5);
      switch (layout.pattern) {
        case 'twins': return dy * 2 - dx + ((layer % 2) ? -x * .08 : x * .08);
        case 'cross': return Math.min(dx, dy) * 4 + Math.max(dx, dy);
        case 'ring': return -Math.max(dx, dy) * 3 + Math.min(dx, dy);
        default: return dx + dy + x * .01;
      }
    };
    cells.sort((a, b) => score(a) - score(b));
    if (count > cells.length) throw new Error('Layer exceeds central board capacity');
    const offset = layer % 2 ? .45 : 0;
    for (const cell of cells.slice(0, count)) add(cell.x + 1.15 + offset, cell.y + offset, layer);
  }
  for (let side = 0; side < 2; side++) {
    for (let layer = 0; layer < sideDepth; layer++) {
      add(side === 0 ? 0 : 4.75, .55 + layer * .17, layer);
    }
  }
  // When there are no side stacks, keep the central shape centred in its bounds.
  if (!sideDepth) {
    const left = Math.min(...tiles.map(tile => tile.x));
    for (const tile of tiles) tile.x -= left;
  }
  return tiles;
}
