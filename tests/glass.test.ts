import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, takeBottle, cloneState, bottleInventory, validateLevel } from '../src/game/engine';
import { levels } from '../src/data/levels';
import { isGlass } from '../src/game/types';
import { bottleDeposits } from '../src/data/bottles';

test('first ten levels only return deposit bottles; later levels add glass progressively', () => {
  assert.equal(levels.length,15);
  assert.ok(levels.slice(0,10).every(level=>level.columns.flat().every(type=>!isGlass(type) && bottleDeposits[type]>0)));
  assert.deepEqual([...new Set(levels.slice(0,10).flatMap(level=>level.columns.flat().map(type=>bottleDeposits[type])))].sort((a,b)=>a-b),[8,15,25]);
  assert.deepEqual(levels.slice(10,13).map(level=>[...new Set(level.columns.flat().filter(isGlass))].length),[1,2,3]);
});
test('glass requires a colour choice; wrong bins and machine returns preserve the board', () => {
  const initial=createGame(levels[10]);
  assert.equal(initial.columns[0][0],'glassClear');
  assert.equal(takeBottle(initial,0).state,initial);
  const wrong=takeBottle(initial,0,'glassBrown');
  assert.deepEqual(wrong.state.columns,initial.columns);
  assert.equal(wrong.state.penalties,10);assert.equal(wrong.state.mistakes,1);
  assert.equal(takeBottle(initial,1,'glassClear').state,initial);
  const snapshot=cloneState(initial), next=takeBottle(initial,0,'glassClear');
  assert.deepEqual(initial,snapshot);
  assert.deepEqual(next.state.recycled,['glassClear']);
  assert.equal(next.state.moves,1);
  assert.deepEqual(next.state.buffer,[]);
  assert.deepEqual(next.state.crates,initial.crates);
  assert.deepEqual(bottleInventory(next.state),bottleInventory(initial));
  assert.deepEqual(next.frames[0].event,{kind:'move',bottle:'glassClear',from:{kind:'column',index:0},to:{kind:'bin',index:0}});
});
test('returning every deposit bottle does not win while glass remains; undo can restore it', () => {
  const level={id:11,columns:[['water','water','water'],['glassBrown']] as const,orders:['water'] as const};
  let state=createGame({id:level.id,columns:level.columns.map(c=>[...c]),orders:[...level.orders]});
  for(let i=0;i<3;i++) state=takeBottle(state,0).state;
  assert.equal(state.completed,1);assert.equal(state.status,'playing');
  const undo=cloneState(state);
  state=takeBottle(state,1,'glassBrown').state;
  assert.equal(state.status,'won');assert.deepEqual(state.recycled,['glassBrown']);
  assert.equal(undo.status,'playing');assert.deepEqual(undo.recycled,[]);
  assert.deepEqual(createGame({id:11,columns:[['glassClear'],['water','water','water']],orders:['water']}).recycled,[]);
});
test('no-deposit glass cannot be queued as a machine batch', () => {
  assert.throws(()=>validateLevel({id:11,columns:[['glassClear','glassClear','glassClear']],orders:['glassClear']}));
});
