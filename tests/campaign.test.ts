import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../src/data/levels';
import { availableTiles, createPuzzle, createGame, takeBottle } from '../src/game/triple';
import { isGlass } from '../src/game/types';
import { translations } from '../src/i18n';

test('twenty progressively denser rounds have complete names and cheers in every language', () => {
  assert.equal(levels.length,20);
  assert.deepEqual(levels.map(level=>level.id),Array.from({length:20},(_,i)=>i+1));
  for (const t of Object.values(translations)) {
    assert.equal(t.levelNames.length,20); assert.equal(t.winCheers.length,20);
    assert.ok(t.levelNames.every(Boolean)); assert.ok(t.winCheers.every(Boolean));
  }
  for (let i=1;i<levels.length;i++) assert.ok(levels[i].columns.flat().length>levels[i-1].columns.flat().length);
  assert.equal(levels[19].layout?.layers,9);
});

test('every physical overlap blocks input; cards stay in bounds and same-layer targets never overlap',()=>{
  for(const level of levels){
    const {state,solution}=createPuzzle(level);
    assert.deepEqual(state,createGame(level),'Generation must be deterministic');
    for(const tile of state.tiles){
      assert.ok(tile.x>=0 && tile.y>=0 && tile.x+1<=state.boardWidth && tile.y+1<=state.boardHeight);
      const overlaps=state.tiles.filter(other=>other.id!==tile.id && Math.abs(tile.x-other.x)<1 && Math.abs(tile.y-other.y)<1);
      assert.ok(overlaps.every(other=>other.layer!==tile.layer));
      assert.deepEqual(tile.blockedBy,overlaps.filter(other=>other.layer>tile.layer).map(other=>other.id));
    }
    let game=state;
    for(const id of solution){
      assert.ok(availableTiles(game).includes(id),`Round ${level.id}, blocked step ${id}`);
      const type=game.tiles[id].bottle;
      game=takeBottle(game,id,isGlass(type)?type:undefined).state;
      assert.notEqual(game.status,'lost');
      assert.equal(game.penalties,0);
    }
    assert.equal(game.status,'won');
  }
});

test('later rounds require planning beyond taking any visible match',()=>{
  function greedyWins(index:number){
    let seed=1729,wins=0;
    for(let attempt=0;attempt<30;attempt++){
      let state=createGame(levels[index]);
      while(state.status==='playing'){
        seed=(seed*1664525+1013904223)>>>0;
        let choices=availableTiles(state);
        const score=(id:number)=>state.buffer.filter(t=>t===state.tiles[id].bottle).length;
        const best=Math.max(...choices.map(score));choices=choices.filter(id=>score(id)===best);
        const id=choices[seed%choices.length],type=state.tiles[id].bottle;
        state=takeBottle(state,id,isGlass(type)?type:undefined).state;
      }
      if(state.status==='won')wins++;
    }
    return wins;
  }
  assert.equal(greedyWins(0),30);
  assert.ok(greedyWins(2)<20);
  for(const index of [6,9,14,19])assert.ok(greedyWins(index)<=3,`Round ${index+1} should punish short-sighted picks`);
});
