import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRecycling, recyclingItems, destinations } from '../src/data/recycling';
test('all examples have one valid destination; only correct returns pay their stated deposit', () => {
  for (const item of recyclingItems) {
    for (const destination of destinations) {
      const result = assessRecycling(item, destination.id);
      assert.equal(result.correct, destination.id === item.destination);
      assert.equal(result.refundCents, result.correct ? item.cents : 0);
    }
  }
});
test('deposit takes priority over glass color; nonstandard glass color goes to green', () => {
  const brown = recyclingItems.filter(item => item.material === '棕色玻璃');
  assert.deepEqual(new Set(brown.map(item => item.destination)), new Set(['shop', 'brown']));
  assert.equal(recyclingItems.find(item => item.material === '蓝色玻璃')?.destination, 'green');
  assert.deepEqual(new Set(recyclingItems.map(item => item.cents)), new Set([0, 8, 15, 25]));
});
test('all deposit amounts share the shop destination without asking players to guess an unstated price', () => {
  for (const item of recyclingItems.filter(item => item.cents > 0)) {
    assert.equal(assessRecycling(item, 'shop').correct, true);
    assert.equal(assessRecycling(item, 'shop').refundCents, item.cents);
  }
});
