import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, takeBottle, cloneState, bottleInventory } from '../src/game/engine';
import { timeLimit } from '../src/game/time';
import { levels } from '../src/data/legacy-levels';
import { levels as campaign } from '../src/data/levels';

test('new layered rounds allow observation, then tighten with larger piles',()=>{
  assert.equal(timeLimit(campaign[0]),60);assert.equal(timeLimit(campaign[1]),75);
  assert.equal(timeLimit(campaign[2]),90);
  for(let i=5;i<9;i++) assert.ok(timeLimit(campaign[i])<timeLimit(campaign[i-1]));
  assert.ok(timeLimit(campaign[8])/campaign[8].columns.flat().length < timeLimit(campaign[4])/campaign[4].columns.flat().length);
  assert.equal(timeLimit(campaign[9]),100);assert.equal(timeLimit(campaign[13]),110);
});
test('full buffer rejects another unmatched bottle, deducts five seconds, but still accepts a matching one',()=>{
  const level={id:1,columns:[['currant','currant','currant','apple'],['water','water','water'],['lemon','lemon','lemon'],['apple','apple']] as const,orders:['water','lemon','currant','apple'] as const};
  let state=createGame({id:1,columns:level.columns.map(c=>[...c]),orders:[...level.orders]});
  for(let i=0;i<3;i++) state=takeBottle(state,0).state;
  assert.equal(state.status,'playing');assert.equal(state.buffer.length,3);
  const snapshot=cloneState(state),blocked=takeBottle(state,0);
  assert.deepEqual(state,snapshot);assert.deepEqual(blocked.state.columns,state.columns);
  assert.equal(blocked.state.penalties,5);assert.equal(blocked.state.moves,3);
  assert.deepEqual(blocked.frames[0].event,{kind:'penalty',reason:'buffer',seconds:5});
  state=takeBottle(blocked.state,1).state;assert.equal(state.crates[0]?.count,1);
  state=takeBottle(takeBottle(state,1).state,1).state;assert.deepEqual(state.buffer,[]);
  assert.deepEqual(bottleInventory(state),bottleInventory(snapshot));
});
test('three wrong colour choices deduct thirty seconds and end the round without losing a bottle',()=>{
  let state=createGame(levels[10]);const before=cloneState(state);
  for(let i=0;i<3;i++) state=takeBottle(state,0,'glassBrown').state;
  assert.equal(state.penalties,30);assert.equal(state.mistakes,3);
  assert.equal(state.status,'lost');assert.equal(state.endReason,'mistakes');
  assert.deepEqual(state.columns,before.columns);assert.deepEqual(bottleInventory(state),bottleInventory(before));
  assert.equal(takeBottle(state,0,'glassClear').state,state);
});
