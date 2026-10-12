import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../src/data/levels';
import { bottleTypes, isGlass, type BottleType } from '../src/game/types';
import { createGame, takeBottle, returnReserve, availableTiles, undoBottle, canUndo, moveOut, shuffleBoard, solveState, bottleInventory, type TripleState } from '../src/game/triple';
function flat(types: BottleType[]): TripleState {
 const s=createGame(levels[9]);s.tiles=types.map((bottle,id)=>({id,bottle,x:id,y:0,layer:0,blockedBy:[]}));s.columns=types.map(t=>[t]);return s;
}
function pick(s: TripleState,id:number) { const type=s.tiles[id].bottle;return takeBottle(s,id,isGlass(type)?type:undefined).state; }
const sequence: BottleType[]=['water','water','lemon','lemon','currant','currant','apple','apple','apple'];
test('all deposit types share seven slots; only identical types match',()=>{
 let s=flat(['water','lemon','currant','apple','malt','kola']);
 for(let id=0;id<6;id++)s=pick(s,id);
 assert.equal(s.status,'playing');assert.equal(s.buffer.length,6);assert.equal(s.penalties,0);
});
test('third matching bottle clears before checking seven-slot loss',()=>{
 let s=flat([...sequence.slice(0,6),'water']);for(let id=0;id<7;id++)s=pick(s,id);
 assert.equal(s.status,'playing');assert.equal(s.buffer.length,4);assert.equal(s.completed,1);assert.equal(s.returnedIds.length,3);
});
test('seven unmatched bottles lose, Undo and move-out can rescue without refunding penalties',()=>{
 let s=flat(sequence);for(let id=0;id<7;id++)s=pick(s,id);
 assert.equal(s.status,'lost');assert.equal(s.endReason,'full');s.penalties=10;s.mistakes=1;
 const recalled=undoBottle(s);assert.equal(recalled.status,'playing');assert.equal(recalled.buffer.length,6);assert.deepEqual(recalled.columns[6],['apple']);assert.equal(recalled.penalties,10);
 const saved=moveOut(s);assert.equal(saved.buffer.length,4);assert.equal(saved.reserveIds.length,3);assert.equal(saved.status,'playing');assert.equal(saved.mistakes,1);assert.equal(saved.penalties,10);assert.equal(moveOut(saved),saved);
});
test('completed triples cannot be undone; last pending pick is recalled regardless of grouped order',()=>{
 let s=flat(['water','lemon','water','water']);for(let id=0;id<4;id++)s=pick(s,id);
 assert.equal(s.completed,1);s=undoBottle(s);assert.equal(s.completed,1);assert.equal(s.returnedIds.length,3);assert.deepEqual(s.columns[1],['lemon']);assert.equal(canUndo(s),false);
});
test('reserve returns can complete a triple and count as latest pending pick',()=>{
 let s=flat(sequence);for(let id=0;id<6;id++)s=pick(s,id);s=moveOut(s);
 s=returnReserve(s,0).state;assert.equal(s.pickedOrder.at(-1),0);
 s=undoBottle(s);assert.deepEqual(s.columns[0],['water']);assert.equal(s.reserveIds.length,2);
});
test('covered bottles are unpickable and become available after blockers leave',()=>{
 const s=createGame(levels[2]);const blocked=s.tiles.find(t=>t.blockedBy.length)!;
 assert.equal(takeBottle(s,blocked.id).state,s);
 let next=s;for(const id of blocked.blockedBy) { if(availableTiles(next).includes(id))next=pick(next,id); }
 for(const id of blocked.blockedBy) assert.equal(next.columns[id].length,0);
 assert.ok(availableTiles(next).includes(blocked.id));
});
test('three wrong glass choices lose; wrong colour preserves bottle',()=>{
 let s=flat(['glassClear']);for(let i=0;i<3;i++)s=takeBottle(s,0,'glassBrown').state;
 assert.equal(s.status,'lost');assert.equal(s.endReason,'mistakes');assert.equal(s.penalties,30);assert.deepEqual(s.columns[0],['glassClear']);
});
for(const level of levels)test(`level ${level.id}: solvable, balanced, immutable, conserves inventory in every animation frame`,()=>{
 let s=createGame(level);const original=structuredClone(s), inventory=bottleInventory(s);const solution=solveState(s);
 assert.ok(solution.path);assert.deepEqual(s,original);
 for(const id of solution.path){ const type=s.tiles[id].bottle;const before=structuredClone(s);const result=takeBottle(s,id,isGlass(type)?type:undefined);assert.deepEqual(s,before);
 for(const frame of result.frames)assert.deepEqual(bottleInventory(frame.state),inventory);
 s=result.state;assert.deepEqual(bottleInventory(s),inventory);assert.ok(s.buffer.length<7);
 }
 assert.equal(s.status,'won');assert.equal(s.returnedIds.length+s.recycledIds.length,level.columns.flat().length);
});
test('shuffle preserves every bottle including held/returned bottles, stays solvable, works only once',()=>{
 let s=createGame(levels[8]);for(let i=0;i<4;i++)s=pick(s,availableTiles(s)[0]);
 const before=structuredClone(s), shuffled=shuffleBoard(s);assert.deepEqual(s,before);assert.equal(shuffled.shuffleUsed,true);
 assert.deepEqual(bottleInventory(shuffled),bottleInventory(s));assert.deepEqual(shuffled.returnedIds,s.returnedIds);assert.deepEqual(shuffled.bufferIds,s.bufferIds);assert.ok(solveState(shuffled).path);assert.equal(shuffleBoard(shuffled),shuffled);
});
test('random legal picks, reserve returns and recall never duplicate or lose bottle IDs',()=>{
 let seed=572;for(let level of levels){let s=createGame(level);const inventory=bottleInventory(s);
 for(let turn=0;turn<80;turn++){seed=(seed*1664525+1013904223)>>>0;const choices=availableTiles(s);
 if(s.status==='won')break;
 if(s.status==='lost')s=undoBottle(s);
 else if(turn%13===0 &&s.buffer.length>=3)s=moveOut(s);
 else if(turn%7===0&&canUndo(s))s=undoBottle(s);
 else if(turn%5===0&&s.reserveIds.length)s=returnReserve(s,0).state;
 else if(choices.length)s=pick(s,choices[seed%choices.length]);else break;
 const ids=[...s.tiles.filter(t=>s.columns[t.id].length).map(t=>t.id),...s.bufferIds,...s.reserveIds,...s.returnedIds,...s.recycledIds];assert.equal(new Set(ids).size,s.tiles.length);assert.deepEqual(bottleInventory(s),inventory);
 for(const type of bottleTypes)assert.ok((s.buffer.filter(t=>t===type).length)<3);
 }
 }
});
test('returning two set-aside bottles completes a permanent triple; every held bottle can still finish',()=>{
 let s=flat(['water','water','lemon','lemon','currant','currant','water','lemon','currant']);
 for(let id=0;id<6;id++)s=pick(s,id);s=moveOut(s);s=pick(s,6);
 const inventory=bottleInventory(s);s=returnReserve(s,0).state;const triple=returnReserve(s,0);
 assert.ok(triple.frames.some(frame=>frame.event.kind==='full'));
 for(const frame of triple.frames)assert.deepEqual(bottleInventory(frame.state),inventory);
 s=triple.state;assert.equal(s.returnedIds.length,3);assert.equal(s.pickedOrder.includes(0),false);assert.equal(s.pickedOrder.includes(1),false);
 s=returnReserve(s,0).state;s=pick(s,7);s=pick(s,8);assert.equal(s.status,'won');assert.equal(s.returnedIds.length,9);
});
test('a six-type blocked tray still allows the once-only shuffle; recall can restore a playable route',()=>{
 const types:BottleType[]=['water','lemon','currant','apple','malt','kola'];let s=flat(types.flatMap(type=>[type,type,type]));
 for(let id=0;id<18;id+=3)s=pick(s,id);
 assert.equal(s.buffer.length,6);assert.equal(solveState(s).path,null,'Six different singletons cannot take a seventh unmatched bottle');
 const shuffled=shuffleBoard(s);assert.equal(shuffled.shuffleUsed,true);assert.deepEqual(shuffled.bufferIds,s.bufferIds);assert.deepEqual(bottleInventory(shuffled),bottleInventory(s));
 assert.ok(solveState(undoBottle(shuffled)).path,'Recall opens enough space to match triples');
});
